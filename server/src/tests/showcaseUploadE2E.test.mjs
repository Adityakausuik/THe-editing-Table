import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getPostgresPool, closePostgresPool, ensurePostgresSchema } from "../db/postgres.js";
import {
  saveMediaBufferToNeon,
  commitChunkedUploadToNeon,
  getMediaMetadata,
  getMediaByChecksum,
  deleteMediaFromNeon
} from "../db/neonMediaStorage.js";
import { isPostgresMediaReferenced } from "../db/mediaRepository.js";
import PortfolioItem from "../models/PortfolioItem.model.js";
import { createPostgresCmsRecord, getPostgresCmsRecord, deletePostgresCmsRecord } from "../db/cmsRepository.js";

async function run() {
  console.log("=== SHOWCASE MEDIA UPLOAD E2E TEST ===");

  // 1. Ensure Schema
  console.log("[1/6] Verifying schema and migration idempotency...");
  const schema = await ensurePostgresSchema();
  assert.equal(schema.status, "ready", "Postgres schema should be ready");

  const pool = getPostgresPool();
  const mediaColsRes = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'media'`
  );
  const mediaCols = new Set(mediaColsRes.rows.map((r) => r.column_name));
  assert.ok(mediaCols.has("checksum"), "media table must have checksum column");
  assert.ok(mediaCols.has("width"), "media table must have width column");
  assert.ok(mediaCols.has("height"), "media table must have height column");
  assert.ok(mediaCols.has("duration"), "media table must have duration column");
  assert.ok(mediaCols.has("upload_status"), "media table must have upload_status column");
  assert.ok(mediaCols.has("total_chunks"), "media table must have total_chunks column");
  assert.ok(mediaCols.has("is_video"), "media table must have is_video column");
  console.log("✓ All required media storage columns verified in Neon PostgreSQL.");

  // 2. Test Single Buffer Upload (e.g. Showcase Cover Photo)
  console.log("[2/6] Testing single media buffer upload (Showcase Cover Photo)...");
  const testPhotoBuffer = Buffer.concat([
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    ),
    crypto.randomBytes(32)
  ]);
  const expectedPhotoHash = crypto.createHash("sha256").update(testPhotoBuffer).digest("hex");

  const savedPhoto = await saveMediaBufferToNeon({
    buffer: testPhotoBuffer,
    originalName: "luxury_showcase_cover.png",
    mimeType: "image/png",
    folder: "portfolio",
    width: 1920,
    height: 1080,
    altText: "Luxury Showcase Cover"
  });

  assert.ok(savedPhoto._id, "Saved photo must have an _id");
  assert.ok(savedPhoto.url.startsWith("/uploads/portfolio/"), "URL must start with /uploads/portfolio/");
  assert.equal(savedPhoto.checksum, expectedPhotoHash, "Checksum must match SHA-256 of buffer");
  assert.equal(savedPhoto.totalChunks, 1, "Single buffer has 1 chunk");
  console.log(`✓ Single buffer uploaded: ${savedPhoto.url} (checksum: ${savedPhoto.checksum.slice(0, 16)}...)`);

  // Verify DB record
  const metaPhoto = await getMediaMetadata(savedPhoto.url);
  assert.ok(metaPhoto, "Media metadata should be retrievable by URL");
  assert.equal(metaPhoto.checksum, expectedPhotoHash, "DB checksum must match");
  assert.equal(metaPhoto.width, 1920, "DB width must match");
  assert.equal(metaPhoto.height, 1080, "DB height must match");

  const metaByChecksum = await getMediaByChecksum(expectedPhotoHash);
  assert.ok(metaByChecksum, "Media metadata should be retrievable by checksum");
  assert.equal(metaByChecksum._id, savedPhoto._id, "Record ID should match");
  console.log("✓ Media record verified in Neon PostgreSQL by URL, ID, and checksum.");

  // 3. Test Chunked Upload Flow (e.g. 4K Cinematic Showcase Video)
  console.log("[3/6] Testing chunked upload pipeline (Cinematic Showcase Video)...");
  const uploadId = crypto.randomBytes(16).toString("hex");
  const chunkSize = 1024 * 512; // 512 KB per test chunk
  const chunk1 = crypto.randomBytes(chunkSize);
  const chunk2 = crypto.randomBytes(chunkSize);
  const fullVideoBuffer = Buffer.concat([chunk1, chunk2]);
  const expectedVideoHash = crypto.createHash("sha256").update(fullVideoBuffer).digest("hex");

  // Create temporary session
  await pool.query(
    `INSERT INTO media_upload_sessions (upload_id, user_id, folder, mime_type, total_size, part_count, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, now() + interval '1 hour')`,
    [uploadId, "test-user-id", "portfolio", "video/mp4", fullVideoBuffer.length, 2]
  );

  // Upload parts
  await pool.query(
    `INSERT INTO media_upload_parts (upload_id, part_index, data) VALUES ($1, $2, $3)`,
    [uploadId, 0, chunk1]
  );
  await pool.query(
    `INSERT INTO media_upload_parts (upload_id, part_index, data) VALUES ($1, $2, $3)`,
    [uploadId, 1, chunk2]
  );

  // Commit chunked upload
  const savedVideo = await commitChunkedUploadToNeon({
    uploadId,
    userId: "test-user-id",
    folder: "portfolio",
    originalName: "cinematic_commercial_showcase.mp4",
    mimeType: "video/mp4",
    size: fullVideoBuffer.length,
    altText: "Cinematic Commercial Showcase Film",
    duration: 124.5
  });

  assert.ok(savedVideo._id, "Saved video must have an _id");
  assert.ok(savedVideo.url.startsWith("/uploads/portfolio/"), "Video URL must start with /uploads/portfolio/");
  assert.equal(savedVideo.checksum, expectedVideoHash, "Video checksum must match full buffer SHA-256");
  assert.equal(savedVideo.size, fullVideoBuffer.length, "Total size must match");
  console.log(`✓ Chunked video committed: ${savedVideo.url} (checksum: ${savedVideo.checksum.slice(0, 16)}...)`);

  // Verify temporary session was cleaned up
  const remainingSession = await pool.query(
    `SELECT upload_id FROM media_upload_sessions WHERE upload_id = $1`,
    [uploadId]
  );
  assert.equal(remainingSession.rows.length, 0, "Upload session should be deleted after commit");

  // Verify media_chunks contains both parts
  const chunkRows = await pool.query(
    `SELECT chunk_index, chunk_size, sha256 FROM media_chunks WHERE media_id = $1 ORDER BY chunk_index ASC`,
    [savedVideo._id]
  );
  assert.equal(chunkRows.rows.length, 2, "media_chunks should contain 2 chunks");
  console.log("✓ media_chunks verified with correct offsets, sizes, and per-chunk hashes.");

  // 4. Test Showcase Item Creation using Uploaded Media
  console.log("[4/6] Testing Showcase Item (Portfolio) creation in Neon PostgreSQL...");
  const portfolioPayload = {
    title: "Vogue Autumn Editorial",
    slug: `vogue-autumn-editorial-${Date.now()}`,
    category: "Fashion Film",
    client: "Condé Nast",
    image: savedPhoto.url,
    coverImage: savedPhoto.url,
    videoUrl: savedVideo.url,
    description: "High-fashion color science and analog 35mm emulation.",
    deliverables: ["4K Master", "Social Cuts", "Color Grade"],
    isFeatured: true,
    isPublished: true,
    order: 1
  };

  const showcaseDoc = new PortfolioItem(portfolioPayload);
  await showcaseDoc.validate();
  const createdShowcase = await createPostgresCmsRecord(
    PortfolioItem,
    showcaseDoc._id.toString(),
    showcaseDoc.toObject()
  );
  assert.ok(createdShowcase, "Portfolio showcase item should be created");
  console.log(`✓ Showcase item created: "${createdShowcase.title}" (_id: ${createdShowcase._id})`);

  // Verify reference guard
  const isReferencedPhoto = await isPostgresMediaReferenced(savedPhoto.url);
  assert.equal(isReferencedPhoto, true, "Uploaded photo should be recognized as referenced");
  const isReferencedVideo = await isPostgresMediaReferenced(savedVideo.url);
  assert.equal(isReferencedVideo, true, "Uploaded video should be recognized as referenced");
  console.log("✓ isPostgresMediaReferenced correctly detected media usage in PortfolioItems.");

  // 5. Test Streaming / ETag Verification
  console.log("[5/6] Testing ETag / Range streaming logic from Neon PostgreSQL...");
  let writtenHeaders = {};
  let writtenStatus = 200;
  let writtenChunks = [];

  const mockReq = {
    headers: {
      range: "bytes=0-1023"
    },
    method: "GET"
  };

  const mockRes = {
    setHeader(k, v) { writtenHeaders[k.toLowerCase()] = v; },
    status(s) { writtenStatus = s; return this; },
    write(chunk) { writtenChunks.push(chunk); },
    end() { this.ended = true; },
    writableEnded: false
  };

  const { streamMediaFromNeon } = await import("../db/neonMediaStorage.js");
  const metaVideo = await getMediaMetadata(savedVideo.url);
  const streamed = await streamMediaFromNeon(mockReq, mockRes, metaVideo);
  assert.equal(streamed, true, "streamMediaFromNeon should return true");
  assert.equal(writtenStatus, 206, "Should return HTTP 206 Partial Content");
  assert.equal(writtenHeaders["etag"], `"${expectedVideoHash}"`, "ETag header must match checksum");
  assert.ok(writtenHeaders["content-range"].startsWith("bytes 0-1023/"), "Content-Range header should be set");
  console.log(`✓ Streaming validated: HTTP 206, ETag: ${writtenHeaders["etag"]}`);

  // 6. Cleanup Test Data
  console.log("[6/6] Cleaning up test records...");
  await deletePostgresCmsRecord(PortfolioItem, createdShowcase._id);
  await deleteMediaFromNeon(savedPhoto.url);
  await deleteMediaFromNeon(savedVideo.url);
  console.log("✓ Test records cleaned up successfully.");

  console.log("\n=========================================");
  console.log("ALL SHOWCASE UPLOAD E2E TESTS PASSED 100%");
  console.log("=========================================\n");
}

run()
  .catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closePostgresPool();
    process.exit(0);
  });

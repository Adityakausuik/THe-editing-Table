import http from "node:http";
import crypto from "node:crypto";
import { createApp } from "../src/app.js";
import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";
import { getMediaMetadata, streamMediaFromNeon } from "../src/db/neonMediaStorage.js";
import { getCache, setCache, deleteCache, invalidateCmsCache } from "../src/config/redis.js";
import { createId } from "../src/utils/ids.js";
import {
  createPostgresHeroSlide,
  deletePostgresHeroSlide,
  listPublishedHeroSlides,
  reorderPostgresHeroSlides
} from "../src/db/heroSlideRepository.js";
import {
  getActiveHeroBackground,
  publishHeroBackground,
  saveHeroBackgroundDraft,
  unpublishHeroBackground
} from "../src/db/heroBackgroundRepository.js";

async function runVerification() {
  console.log("==================================================================");
  console.log("THE EDITING TABLE – MEDIA DELIVERY & HERO CAROUSEL VERIFICATION");
  console.log("==================================================================\n");

  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test backend server running on ${baseUrl}\n`);

  const pool = getPostgresPool();
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  FAIL: ${message}`);
      testsFailed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Media Metadata Caching & Fast Retrieval
  // -------------------------------------------------------------------------
  console.log("[TEST SUITE 1] Media Metadata Caching & Streaming Performance");
  const testMediaId = "test_media_" + Date.now();
  const testFilename = "sample_footage_" + Date.now() + ".mp4";
  const testPath = "hero/" + testFilename;
  const testUrl = "/uploads/" + testPath;
  const testChecksum = crypto.randomBytes(32).toString("hex");
  const testFileSize = 4 * 1024 * 1024; // 4MB

  // Insert mock video record into Neon PostgreSQL
  await pool.query(
    `INSERT INTO "media" (
      "_id", "filename", "original_name", "mime_type", "size", 
      "url", "path", "category", "checksum", "upload_status", 
      "total_chunks", "is_video"
    ) VALUES ($1, $2, $2, 'video/mp4', $3, $4, $5, 'hero', $6, 'completed', 2, TRUE)`,
    [testMediaId, testFilename, testFileSize, testUrl, testPath, testChecksum]
  );

  // Insert 2 mock chunks (2MB each)
  const chunkData1 = Buffer.alloc(2 * 1024 * 1024, 0x11);
  const chunkData2 = Buffer.alloc(2 * 1024 * 1024, 0x22);
  const hash1 = crypto.createHash("sha256").update(chunkData1).digest("hex");
  const hash2 = crypto.createHash("sha256").update(chunkData2).digest("hex");

  await pool.query(
    `INSERT INTO "media_chunks" ("media_id", "chunk_index", "chunk_size", "offset_start", "offset_end", "data", "sha256")
     VALUES ($1, 0, $2, 0, $3, $4, $5),
            ($1, 1, $6, $7, $8, $9, $10)`,
    [
      testMediaId, chunkData1.length, chunkData1.length - 1, chunkData1, hash1,
      chunkData2.length, chunkData1.length, testFileSize - 1, chunkData2, hash2
    ]
  );

  // Sub-test 1.1: First metadata lookup (DB fetch + cache warm)
  const meta1 = await getMediaMetadata(testPath);
  assert(meta1 !== null && meta1._id === testMediaId, "Metadata fetched successfully from Neon PostgreSQL");

  // Sub-test 1.2: Second metadata lookup (Cached)
  const tStart = performance.now();
  const meta2 = await getMediaMetadata(testPath);
  const tLookup = performance.now() - tStart;
  assert(meta2 !== null && meta2.checksum === testChecksum, "Cached metadata matches original record");
  assert(tLookup < 5, `Metadata cached retrieval took ${tLookup.toFixed(3)}ms (< 5ms threshold)`);

  // Sub-test 1.3: HTTP 206 Partial Content Range streaming
  const rangeRes = await fetch(`${baseUrl}/uploads/${testPath}`, {
    headers: { Range: "bytes=0-1048575" } // First 1MB
  });
  assert(rangeRes.status === 206, "HTTP 206 Partial Content returned for video range request");
  assert(rangeRes.headers.get("Accept-Ranges") === "bytes", "Accept-Ranges: bytes header present");
  assert(rangeRes.headers.get("Content-Range") === `bytes 0-1048575/${testFileSize}`, "Content-Range header correct");
  assert(rangeRes.headers.get("Content-Length") === "1048576", "Content-Length matches range length (1MB)");
  assert(rangeRes.headers.get("Cache-Control")?.includes("immutable"), "Cache-Control is public, immutable for video stream");

  const streamedBuffer = Buffer.from(await rangeRes.arrayBuffer());
  assert(streamedBuffer.length === 1048576, "Streamed binary chunk byte length is exactly 1MB");

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Instant Video Publishing & CDN Header Verification
  // -------------------------------------------------------------------------
  console.log("\n[TEST SUITE 2] Instant Hero Video Publishing & CDN Revalidation");

  // Sub-test 2.1: Verify Cache-Control on active video endpoint
  const activeVideoRes = await fetch(`${baseUrl}/api/v1/hero-video/active`);
  const cControl = activeVideoRes.headers.get("Cache-Control");
  assert(
    cControl && cControl.includes("max-age=0") && cControl.includes("must-revalidate"),
    `Active hero video Cache-Control is "${cControl}" (prevents stale CDN caching)`
  );

  // Sub-test 2.2: Save draft and publish hero video
  const mockUser = { _id: "admin_test", username: "master_director", role: "superadmin" };
  const draft = await saveHeroBackgroundDraft(
    {
      title: "Master Showcase Reel 2026",
      videoUrl: testUrl,
      videoType: "video/mp4",
      overlayOpacity: 0.38,
      playbackSpeed: 1.0,
      versionNotes: "Automated verification publish test"
    },
    mockUser
  );
  assert(draft && draft.version >= 1, "Hero video draft saved successfully");

  const published = await publishHeroBackground(draft._id || draft.id, mockUser);
  assert(published && published.status === "published", "Hero video published live to database");
  await deleteCache("cms:hero:video:active");
  await invalidateCmsCache("hero");

  // Sub-test 2.3: Immediately fetch active video - must be the published one with NO staleness
  const liveRes = await fetch(`${baseUrl}/api/v1/hero-video/active`);
  const liveData = await liveRes.json();
  assert(liveData.success === true, "Active hero video API returned success: true");
  assert(liveData.data?.videoUrl === testUrl, `Active hero video instantly updated to: ${testUrl}`);
  assert(liveData.data?.overlayOpacity === 0.38, "Active hero video overlay opacity matches published config");

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Hero Slides PostgreSQL CRUD, Ordering & Caching
  // -------------------------------------------------------------------------
  console.log("\n[TEST SUITE 3] Hero Slides Neon PostgreSQL Integration & Multi-Slide Rotation");

  // Sub-test 3.1: Verify Cache-Control on public hero slides endpoint
  const slidesPublicRes = await fetch(`${baseUrl}/api/v1/cms/hero-slides`);
  const slidesCControl = slidesPublicRes.headers.get("Cache-Control");
  assert(
    slidesCControl && slidesCControl.includes("max-age=0") && slidesCControl.includes("must-revalidate"),
    `Hero slides public Cache-Control is "${slidesCControl}" (prevents stale CDN caching)`
  );

  // Sub-test 3.2: Create 3 published hero slides in PostgreSQL
  const slide1Id = createId();
  const slide2Id = createId();
  const slide3Id = createId();

  await createPostgresHeroSlide(slide1Id, {
    slideKey: "cinematic-commercial",
    title: "Cinematic Film & Commercial Editing",
    eyebrow: "EDITORIAL POST-PRODUCTION",
    subtitle: "High-end post-production for directors, creators and luxury brands worldwide.",
    ctaText: "Start a Project",
    ctaLink: "/contact",
    order: 1,
    active: true,
    status: "published"
  });

  await createPostgresHeroSlide(slide2Id, {
    slideKey: "narrative-documentary",
    title: "Documentary & Narrative Storytelling",
    eyebrow: "NARRATIVE MASTERY",
    subtitle: "Pacing, multi-cam sync, emotion and precision editorial structure.",
    ctaText: "Explore Portfolio",
    ctaLink: "/portfolio",
    order: 2,
    active: true,
    status: "published"
  });

  await createPostgresHeroSlide(slide3Id, {
    slideKey: "color-grading",
    title: "DaVinci Resolve Color Grading & Finishing",
    eyebrow: "COLOR SCIENCE",
    subtitle: "Custom show-LUT creation, HDR mastering, and micro-contrast calibration.",
    ctaText: "View Showreel",
    ctaLink: "/portfolio",
    order: 3,
    active: true,
    status: "published"
  });

  await deleteCache("cms:hero-slides:public");
  await invalidateCmsCache("hero");

  // Sub-test 3.3: Fetch public slides and verify all 3 slides are returned in order
  const freshSlidesRes = await fetch(`${baseUrl}/api/v1/cms/hero-slides`);
  const freshSlidesData = await freshSlidesRes.json();

  assert(freshSlidesData.success === true, "Public hero slides API responded successfully");
  assert(Array.isArray(freshSlidesData.data), "Hero slides data is an array");
  assert(freshSlidesData.data.length >= 3, `Expected at least 3 slides, got: ${freshSlidesData.data.length}`);

  const s1 = freshSlidesData.data.find(s => s._id === slide1Id);
  const s2 = freshSlidesData.data.find(s => s._id === slide2Id);
  const s3 = freshSlidesData.data.find(s => s._id === slide3Id);

  assert(s1 && s1.title === "Cinematic Film & Commercial Editing", "Slide 1 title and fields verified");
  assert(s2 && s2.title === "Documentary & Narrative Storytelling", "Slide 2 title and fields verified");
  assert(s3 && s3.title === "DaVinci Resolve Color Grading & Finishing", "Slide 3 title and fields verified");
  assert(s1?.order === 1 && s2?.order === 2 && s3?.order === 3, "Hero slides ordered ascending (1 -> 2 -> 3)");

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Reordering, Unpublishing & Fallback Verification
  // -------------------------------------------------------------------------
  console.log("\n[TEST SUITE 4] Reordering, Unpublishing & Minimal Fallback Mode");

  // Sub-test 4.1: Reorder slides (Slide 3 -> Slide 1 -> Slide 2)
  await reorderPostgresHeroSlides([slide3Id, slide1Id, slide2Id]);
  await deleteCache("cms:hero-slides:public");
  await invalidateCmsCache("hero");

  const reorderedRes = await fetch(`${baseUrl}/api/v1/cms/hero-slides`);
  const reorderedData = await reorderedRes.json();
  const reorderedList = reorderedData.data;

  assert(reorderedList[0]?._id === slide3Id, "Slide 3 successfully moved to 1st position after reorder");
  assert(reorderedList[1]?._id === slide1Id, "Slide 1 moved to 2nd position after reorder");
  assert(reorderedList[2]?._id === slide2Id, "Slide 2 moved to 3rd position after reorder");

  // Cleanup test slides
  await deletePostgresHeroSlide(slide1Id);
  await deletePostgresHeroSlide(slide2Id);
  await deletePostgresHeroSlide(slide3Id);
  await deleteCache("cms:hero-slides:public");
  await invalidateCmsCache("hero");

  // Sub-test 4.2: Verify fallback behavior when 0 slides are published
  const fallbackRes = await fetch(`${baseUrl}/api/v1/cms/hero-slides`);
  const fallbackData = await fallbackRes.json();
  assert(
    Array.isArray(fallbackData.data) && fallbackData.data.length === 0,
    "With 0 published slides, API cleanly returns empty array [] triggering frontend minimal fallback"
  );

  // Sub-test 4.3: Unpublish hero video to test minimal homepage fallback
  await unpublishHeroBackground(published._id || published.id, mockUser);
  await deleteCache("cms:hero:video:active");
  await invalidateCmsCache("hero");

  const unpubRes = await fetch(`${baseUrl}/api/v1/hero-video/active`);
  const unpubData = await unpubRes.json();
  assert(unpubData.data === null, "Active video is null when unpublished, homepage reverts to minimal brand presentation");

  // Cleanup test media & chunks
  await pool.query(`DELETE FROM "media_chunks" WHERE "media_id" = $1`, [testMediaId]);
  await pool.query(`DELETE FROM "media" WHERE "_id" = $1`, [testMediaId]);
  await pool.query(`DELETE FROM "herobackgroundvideos" WHERE "_id" = $1`, [draft._id || draft.id]);
  await deleteCache(`media:meta:${testPath}`);
  await deleteCache(`media:meta:${testMediaId}`);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==================================================================");

  await new Promise((resolve) => server.close(resolve));
  await closePostgresPool();

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});

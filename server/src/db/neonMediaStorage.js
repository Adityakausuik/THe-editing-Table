import crypto from "node:crypto";
import path from "node:path";
import { getPostgresPool } from "./postgres.js";
import { sanitizeFilename } from "../utils/fileUtils.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";

export const NEON_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk slices for streaming efficiency

/**
 * Extracts normalized subpath from a requested URL or path.
 */
export function normalizeMediaPath(inputPath = "") {
  let subPath = String(inputPath || "").trim().replace(/\\/g, "/");
  subPath = subPath.replace(/^\/+/, "").replace(/^api\//, "").replace(/^uploads\//, "");
  return subPath;
}

/**
 * Looks up a media item in Neon PostgreSQL by path, url, filename, _id, or checksum.
 * Utilizes high-performance Redis/in-memory caching to eliminate redundant database queries
 * on HTTP 206 Partial Content video range requests.
 */
export async function getMediaMetadata(identifier) {
  if (!identifier) return null;
  const raw = String(identifier).trim();
  const normalized = normalizeMediaPath(raw);
  const cacheKey = `media:meta:${normalized}`;

  // 1. Check multi-tier cache
  const cached = await getCache(cacheKey);
  if (cached && cached._id) {
    return cached;
  }

  // 2. Query Neon PostgreSQL
  const pool = getPostgresPool();
  const asUploadUrl = `/uploads/${normalized}`;

  const query = `
    SELECT 
      "_id", "filename", "original_name", "mime_type", "size", 
      "url", "path", "category", "alt_text", "checksum", 
      "width", "height", "duration", "upload_status", "total_chunks", 
      "is_video", "uploaded_by", "created_at", "updated_at"
    FROM "media"
    WHERE "path" = $1 OR "url" = $2 OR "filename" = $3 OR "_id" = $4 OR "checksum" = $5
    LIMIT 1;
  `;

  const result = await pool.query(query, [normalized, asUploadUrl, normalized, raw, raw]);
  const row = result.rows[0] || null;

  if (row) {
    // Cache for 1 hour (3600 seconds) across paths and IDs
    await setCache(cacheKey, row, 3600);
    if (row._id && row._id !== normalized) {
      await setCache(`media:meta:${row._id}`, row, 3600);
    }
    if (row.path && row.path !== normalized) {
      await setCache(`media:meta:${row.path}`, row, 3600);
    }
  }

  return row;
}

/**
 * Looks up an existing media record by its SHA-256 checksum for deduplication.
 */
export async function getMediaByChecksum(checksum) {
  if (!checksum) return null;
  const pool = getPostgresPool();
  const result = await pool.query(
    `SELECT 
      "_id", "filename", "original_name", "mime_type", "size", 
      "url", "path", "category", "alt_text", "checksum", 
      "width", "height", "duration", "upload_status", "total_chunks", 
      "is_video", "uploaded_by", "created_at", "updated_at"
    FROM "media" 
    WHERE "checksum" = $1 
    LIMIT 1;`,
    [String(checksum).trim()]
  );
  return result.rows[0] || null;
}

/**
 * Streams media binary data from Neon PostgreSQL media_chunks to HTTP response,
 * fully supporting HTTP 206 Partial Content (Range requests) for smooth video playback.
 */
export async function streamMediaFromNeon(req, res, media) {
  if (!media) return false;

  const fileSize = Number(media.size);
  let mimeType = media.mime_type || media.mimeType;
  if (!mimeType || mimeType === "application/octet-stream") {
    const ext = path.extname(media.filename || media.path || media.original_name || media.originalName || "").toLowerCase();
    if (ext === ".mp4") mimeType = "video/mp4";
    else if (ext === ".mov") mimeType = "video/quicktime";
    else if (ext === ".webm") mimeType = "video/webm";
    else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";
    else mimeType = "application/octet-stream";
  }
  const checksum = media.checksum || media._id;
  const etag = `"${checksum}"`;

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("ETag", etag);

  // Conditional request (304 Not Modified)
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return true;
  }

  const range = req.headers.range;

  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parts[0] ? parseInt(parts[0], 10) : 0;
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.setHeader("Content-Range", `bytes */${fileSize}`);
      res.status(416).end();
      return true;
    }

    const chunkLength = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Content-Length", chunkLength);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    // Query only chunks overlapping [start, end]
    const pool = getPostgresPool();
    const query = `
      SELECT "chunk_index", "offset_start", "offset_end", "data"
      FROM "media_chunks"
      WHERE "media_id" = $1 AND "offset_start" <= $2 AND "offset_end" >= $3
      ORDER BY "chunk_index" ASC;
    `;

    const chunkRows = await pool.query(query, [media._id, end, start]);

    for (const chunk of chunkRows.rows) {
      if (res.writableEnded || res.destroyed) break;

      const chunkStart = Number(chunk.offset_start);
      const chunkEnd = Number(chunk.offset_end);

      // Slice the exact sub-range needed from this chunk
      const sliceOffsetStart = Math.max(0, start - chunkStart);
      const sliceOffsetEnd = Math.min(chunk.data.length, end - chunkStart + 1);

      if (sliceOffsetStart < sliceOffsetEnd) {
        const slice = chunk.data.subarray(sliceOffsetStart, sliceOffsetEnd);
        res.write(slice);
      }
    }
    res.end();
    return true;
  }

  // Full file streaming (200 OK)
  res.status(200);
  res.setHeader("Content-Length", fileSize);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  if (req.method === "HEAD") {
    res.end();
    return true;
  }

  const pool = getPostgresPool();
  const query = `
    SELECT "data"
    FROM "media_chunks"
    WHERE "media_id" = $1
    ORDER BY "chunk_index" ASC;
  `;

  const chunksResult = await pool.query(query, [media._id]);

  for (const chunk of chunksResult.rows) {
    if (res.writableEnded || res.destroyed) break;
    res.write(chunk.data);
  }
  res.end();
  return true;
}

/**
 * Saves a complete buffer into Neon PostgreSQL with chunked storage in media_chunks.
 * Preserves original quality without lossy downscaling or forced compression.
 */
export async function saveMediaBufferToNeon({
  buffer,
  originalName = "media",
  mimeType,
  folder = "general",
  uploadedBy = null,
  width = null,
  height = null,
  duration = null,
  altText = ""
}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid or empty media buffer.");
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const size = buffer.length;
    const isVideo = mimeType.startsWith("video/");
    const { cleanName, uniqueSuffix } = sanitizeFilename(originalName);
    const ext = path.extname(originalName) || (isVideo ? ".mp4" : ".webp");
    const filename = `${cleanName}-${uniqueSuffix}${ext}`;
    const mediaPath = `${folder}/${filename}`;
    const mediaUrl = `/uploads/${folder}/${filename}`;
    const mediaId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

    const overallHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const totalChunks = Math.ceil(size / NEON_CHUNK_SIZE);

    let validUploadedBy = null;
    if (uploadedBy) {
      const userCheck = await client.query('SELECT "_id" FROM "users" WHERE "_id" = $1', [uploadedBy]);
      if (userCheck.rows.length) validUploadedBy = uploadedBy;
    }

    // 1. Insert media record
    await client.query(
      `INSERT INTO "media" (
        "_id", "filename", "original_name", "mime_type", "size", 
        "url", "path", "category", "alt_text", "checksum", 
        "width", "height", "duration", "upload_status", "total_chunks", 
        "is_video", "uploaded_by", "created_at", "updated_at"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'completed', $14, $15, $16, now(), now())`,
      [
        mediaId, filename, originalName, mimeType, size,
        mediaUrl, mediaPath, folder, altText || originalName, overallHash,
        width, height, duration, totalChunks, isVideo, validUploadedBy
      ]
    );

    // 2. Insert chunks into media_chunks in optimized batches
    let offset = 0;
    const batchSize = 25;
    for (let b = 0; b < totalChunks; b += batchSize) {
      const sliceCount = Math.min(batchSize, totalChunks - b);
      const values = [];
      const placeholders = [];

      for (let s = 0; s < sliceCount; s++) {
        const index = b + s;
        const startByte = index * NEON_CHUNK_SIZE;
        const endByte = Math.min((index + 1) * NEON_CHUNK_SIZE, size);
        const chunkData = buffer.subarray(startByte, endByte);
        const chunkSize = chunkData.length;
        const offsetStart = offset;
        const offsetEnd = offset + chunkSize - 1;
        const chunkHash = crypto.createHash("sha256").update(chunkData).digest("hex");

        const offsetIndex = values.length;
        values.push(mediaId, index, chunkSize, offsetStart, offsetEnd, chunkData, chunkHash);
        placeholders.push(
          `($${offsetIndex + 1}, $${offsetIndex + 2}, $${offsetIndex + 3}, $${offsetIndex + 4}, $${offsetIndex + 5}, $${offsetIndex + 6}, $${offsetIndex + 7})`
        );

        offset += chunkSize;
      }

      await client.query(
        `INSERT INTO "media_chunks" (
          "media_id", "chunk_index", "chunk_size", "offset_start", "offset_end", "data", "sha256"
        ) VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    await client.query("COMMIT");

    const savedMedia = {
      _id: mediaId,
      id: mediaId,
      filename,
      originalName,
      mimeType,
      size,
      url: mediaUrl,
      path: mediaPath,
      category: folder,
      altText: altText || originalName,
      checksum: overallHash,
      width,
      height,
      duration,
      isVideo,
      totalChunks
    };

    // Warm metadata cache immediately
    await setCache(`media:meta:${mediaPath}`, savedMedia, 3600);
    await setCache(`media:meta:${mediaId}`, savedMedia, 3600);

    return savedMedia;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Commits a multi-part chunked upload directly into Neon PostgreSQL.
 * Transfers chunks from media_upload_parts into media_chunks and establishes
 * the persistent media record with full metadata and checksum.
 */
export async function commitChunkedUploadToNeon({
  uploadId,
  userId,
  folder = "general",
  originalName = "upload",
  mimeType,
  size,
  width = null,
  height = null,
  duration = null,
  altText = ""
}) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify upload session
    const sessionRes = await client.query(
      `SELECT "part_count", "total_size", "mime_type", "folder", "expires_at" 
       FROM "media_upload_sessions" 
       WHERE "upload_id" = $1 AND "user_id" = $2 AND "expires_at" > now() 
       FOR UPDATE`,
      [uploadId, String(userId)]
    );

    const session = sessionRes.rows[0];
    if (!session) {
      const err = new Error("Upload session not found or expired.");
      err.status = 404;
      throw err;
    }

    // 2. Verify all parts in order, calculate total size and overall sha256 directly in PostgreSQL
    const partsAggRes = await client.query(
      `SELECT 
         COUNT(*)::INT AS "count",
         COALESCE(SUM(octet_length("data")), 0)::BIGINT AS "total_size",
         encode(sha256(string_agg("data", ''::bytea ORDER BY "part_index" ASC)), 'hex') AS "overall_hash"
       FROM "media_upload_parts" 
       WHERE "upload_id" = $1`,
      [uploadId]
    );

    const partCount = Number(session.part_count);
    const agg = partsAggRes.rows[0];
    const actualCount = Number(agg?.count || 0);
    const calculatedTotalSize = Number(agg?.total_size || 0);
    const overallHash = agg?.overall_hash || "";

    if (actualCount !== partCount) {
      const err = new Error(`Upload incomplete. Expected ${partCount} parts, found ${actualCount}.`);
      err.status = 400;
      throw err;
    }

    if (calculatedTotalSize !== Number(size)) {
      const err = new Error(`Uploaded file size (${calculatedTotalSize} B) does not match expected size (${size} B).`);
      err.status = 400;
      throw err;
    }

    const isVideo = mimeType.startsWith("video/");
    const { cleanName, uniqueSuffix } = sanitizeFilename(originalName);
    const ext = path.extname(originalName) || (isVideo ? ".mp4" : ".webp");
    const filename = `${cleanName}-${uniqueSuffix}${ext}`;
    const mediaPath = `${folder}/${filename}`;
    const mediaUrl = `/uploads/${folder}/${filename}`;
    const mediaId = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

    let validUserId = null;
    if (userId) {
      const userCheck = await client.query('SELECT "_id" FROM "users" WHERE "_id" = $1', [userId]);
      if (userCheck.rows.length) validUserId = userId;
    }

    // 3. Insert persistent record into "media"
    await client.query(
      `INSERT INTO "media" (
        "_id", "filename", "original_name", "mime_type", "size", 
        "url", "path", "category", "alt_text", "checksum", 
        "width", "height", "duration", "upload_status", "total_chunks", 
        "is_video", "uploaded_by", "created_at", "updated_at"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'completed', $14, $15, $16, now(), now())`,
      [
        mediaId, filename, originalName, mimeType, calculatedTotalSize,
        mediaUrl, mediaPath, folder, altText || originalName, overallHash,
        width, height, duration, partCount, isVideo, validUserId
      ]
    );

    // 4. In-Database Zero-Network Chunk Migration:
    // Move all binary chunks directly from media_upload_parts into media_chunks inside Postgres.
    // Window functions compute byte offset_start and offset_end with sub-millisecond efficiency.
    await client.query(
      `INSERT INTO "media_chunks" (
        "media_id", "chunk_index", "chunk_size", "offset_start", "offset_end", "data", "sha256"
      )
      SELECT 
        $1,
        "part_index",
        octet_length("data"),
        COALESCE(SUM(octet_length("data")) OVER (ORDER BY "part_index" ASC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::BIGINT,
        (SUM(octet_length("data")) OVER (ORDER BY "part_index" ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) - 1)::BIGINT,
        "data",
        encode(sha256("data"), 'hex')
      FROM "media_upload_parts"
      WHERE "upload_id" = $2
      ORDER BY "part_index" ASC`,
      [mediaId, uploadId]
    );

    // 5. Cleanup temporary session and parts
    await client.query(`DELETE FROM "media_upload_parts" WHERE "upload_id" = $1`, [uploadId]);
    await client.query(`DELETE FROM "media_upload_sessions" WHERE "upload_id" = $1`, [uploadId]);

    await client.query("COMMIT");

    const committedMedia = {
      _id: mediaId,
      id: mediaId,
      filename,
      originalName,
      mimeType,
      size: calculatedTotalSize,
      url: mediaUrl,
      path: mediaPath,
      category: folder,
      altText: altText || originalName,
      checksum: overallHash,
      width,
      height,
      duration,
      isVideo,
      totalChunks: partCount
    };

    // Warm metadata cache immediately
    await setCache(`media:meta:${mediaPath}`, committedMedia, 3600);
    await setCache(`media:meta:${mediaId}`, committedMedia, 3600);
    await setCache(`media:meta:${mediaUrl}`, committedMedia, 3600);

    return committedMedia;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deletes media and its binary chunks from Neon PostgreSQL.
 */
export async function deleteMediaFromNeon(identifier) {
  if (!identifier) return false;
  const pool = getPostgresPool();
  const raw = String(identifier).trim();
  const normalized = normalizeMediaPath(raw);
  const asUploadUrl = `/uploads/${normalized}`;

  // Invalidate metadata caches
  await deleteCache(`media:meta:${normalized}`);
  await deleteCache(`media:meta:${raw}`);

  const result = await pool.query(
    `DELETE FROM "media" WHERE "path" = $1 OR "url" = $2 OR "filename" = $3 OR "_id" = $4`,
    [normalized, asUploadUrl, normalized, raw]
  );
  return result.rowCount > 0;
}

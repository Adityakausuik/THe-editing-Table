import { getPostgresPool } from "./postgres.js";

export function buildPostgresMediaUploadPartCount(size, chunkSize) {
  const totalSize = Number(size);
  const partSize = Number(chunkSize);
  if (!Number.isSafeInteger(totalSize) || totalSize < 1 || !Number.isSafeInteger(partSize) || partSize < 1) {
    throw new Error("Upload size and chunk size must be positive safe integers.");
  }
  return Math.ceil(totalSize / partSize);
}

export async function createPostgresMediaUploadSession({ uploadId, userId, folder, mimeType, totalSize, partCount, ttlHours = 24 }) {
  const pool = getPostgresPool();
  await pool.query(`DELETE FROM media_upload_sessions WHERE expires_at <= now()`);
  await pool.query(
    `INSERT INTO media_upload_sessions (upload_id, user_id, folder, mime_type, total_size, part_count, expires_at) ` +
      `VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 * interval '1 hour'))`,
    [uploadId, String(userId), folder, mimeType, totalSize, partCount, ttlHours]
  );
}

export async function savePostgresMediaUploadPart({ uploadId, userId, index, count, buffer }) {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const session = await client.query(
      `SELECT part_count, expires_at FROM media_upload_sessions WHERE upload_id = $1 AND user_id = $2 FOR UPDATE`,
      [uploadId, String(userId)]
    );
    const row = session.rows[0];
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      const error = new Error("Upload session expired or not found.");
      error.status = 404;
      throw error;
    }
    if (Number(row.part_count) !== count || index < 0 || index >= count || !Buffer.isBuffer(buffer) || !buffer.length) {
      await client.query("ROLLBACK");
      const error = new Error("Invalid upload chunk.");
      error.status = 400;
      throw error;
    }
    await client.query(
      `INSERT INTO media_upload_parts (upload_id, part_index, data) VALUES ($1, $2, $3) ` +
        `ON CONFLICT (upload_id, part_index) DO UPDATE SET data = EXCLUDED.data, created_at = now()`,
      [uploadId, index, buffer]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function readPostgresMediaUpload({ uploadId, userId }) {
  const pool = getPostgresPool();
  const session = await pool.query(
    `SELECT folder, mime_type, total_size, part_count, expires_at FROM media_upload_sessions ` +
      `WHERE upload_id = $1 AND user_id = $2 AND expires_at > now() LIMIT 1`,
    [uploadId, String(userId)]
  );
  const metadata = session.rows[0];
  if (!metadata) {
    const error = new Error("Upload session expired or not found.");
    error.status = 404;
    throw error;
  }
  const parts = await pool.query(
    `SELECT part_index, data FROM media_upload_parts WHERE upload_id = $1 ORDER BY part_index ASC`,
    [uploadId]
  );
  if (parts.rowCount !== Number(metadata.part_count) || parts.rows.some((part, index) => Number(part.part_index) !== index)) {
    const error = new Error("Upload is incomplete. Please retry the upload.");
    error.status = 400;
    throw error;
  }
  const buffer = Buffer.concat(parts.rows.map((part) => part.data));
  if (buffer.length !== Number(metadata.total_size)) {
    const error = new Error("Upload size did not match the original file.");
    error.status = 400;
    throw error;
  }
  return { ...metadata, buffer };
}

export async function deletePostgresMediaUploadSession(uploadId, userId) {
  const values = [uploadId];
  const ownerFilter = userId == null ? "" : ` AND user_id = $${values.push(String(userId))}`;
  const result = await getPostgresPool().query(
    `DELETE FROM media_upload_sessions WHERE upload_id = $1${ownerFilter}`,
    values
  );
  return result.rowCount > 0;
}

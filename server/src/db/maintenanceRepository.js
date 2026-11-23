import { getPostgresPool } from "./postgres.js";

const EXPIRING_TABLES = ["emailotps", "sessions", "trusteddevices", "media_upload_sessions"];

export function buildExpiredRowsDeleteQuery(table, batchSize = 500) {
  if (!EXPIRING_TABLES.includes(table)) throw new Error("Unsupported expiration table.");
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 5000) {
    throw new Error("Expiration cleanup batch size must be an integer between 1 and 5000.");
  }
  return {
    text: `WITH expired AS (` +
      `SELECT ctid FROM ${table} WHERE expires_at <= $1 ORDER BY expires_at LIMIT $2 FOR UPDATE SKIP LOCKED` +
      `) DELETE FROM ${table} AS target USING expired WHERE target.ctid = expired.ctid`
  };
}

export async function cleanupExpiredPostgresRecords({ pool = getPostgresPool(), now = new Date(), batchSize = 500 } = {}) {
  const deleted = {};
  for (const table of EXPIRING_TABLES) {
    const query = buildExpiredRowsDeleteQuery(table, batchSize);
    deleted[table] = 0;
    while (true) {
      const result = await pool.query(query.text, [now, batchSize]);
      deleted[table] += result.rowCount || 0;
      if ((result.rowCount || 0) < batchSize) break;
    }
  }
  return deleted;
}

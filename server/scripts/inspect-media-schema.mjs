import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";

async function run() {
  const pool = getPostgresPool();
  try {
    const cols = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = 'media' 
       ORDER BY ordinal_position`
    );
    console.log("=== MEDIA TABLE COLUMNS ===");
    console.table(cols.rows);

    const chunks = await pool.query("SELECT to_regclass('media_chunks') as chunks_table");
    console.log("=== MEDIA_CHUNKS TABLE ===");
    console.log(chunks.rows);

    if (chunks.rows[0]?.chunks_table) {
      const chunkCols = await pool.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'media_chunks' 
         ORDER BY ordinal_position`
      );
      console.log("=== MEDIA_CHUNKS COLUMNS ===");
      console.table(chunkCols.rows);
    }

    const sessionCols = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'media_upload_sessions' 
       ORDER BY ordinal_position`
    );
    console.log("=== MEDIA_UPLOAD_SESSIONS COLUMNS ===");
    console.table(sessionCols.rows);

    const partsCols = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'media_upload_parts' 
       ORDER BY ordinal_position`
    );
    console.log("=== MEDIA_UPLOAD_PARTS COLUMNS ===");
    console.table(partsCols.rows);
  } catch (err) {
    console.error("Inspection error:", err);
  } finally {
    await closePostgresPool();
  }
}

run();

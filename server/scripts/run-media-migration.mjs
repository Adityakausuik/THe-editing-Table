import fs from "node:fs";
import path from "node:path";
import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";

async function applyMigration() {
  console.log("=== APPLYING MIGRATION 0002_add_media_storage_columns.sql ===");
  const pool = getPostgresPool();
  const sql = fs.readFileSync(
    path.resolve("server/migrations/0002_add_media_storage_columns.sql"),
    "utf8"
  );

  try {
    const result = await pool.query(sql);
    console.log("Migration executed successfully!");

    // Verify media columns
    const cols = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = 'media' 
       ORDER BY ordinal_position`
    );
    console.log("=== CURRENT MEDIA TABLE COLUMNS ===");
    console.table(cols.rows);

    // Verify media_chunks
    const chunks = await pool.query("SELECT to_regclass('media_chunks') as chunks_table");
    console.log("=== MEDIA_CHUNKS TABLE ===", chunks.rows);

    // Verify schema_migrations
    const migs = await pool.query("SELECT * FROM schema_migrations");
    console.log("=== SCHEMA MIGRATIONS ===", migs.rows);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await closePostgresPool();
  }
}

applyMigration();

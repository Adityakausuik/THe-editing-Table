import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "../config/env.js";
import { INITIAL_SCHEMA_SQL } from "./initialSchemaSql.js";

let pool;
let database;

export const REQUIRED_POSTGRES_TABLES = Object.freeze([
  "aboutmes", "adminactivitylogs", "auditlogs", "blogposts", "brandcollaborations",
  "careerscontents", "contactemails", "contactoffices", "contactphones", "contactsettings",
  "emailotps", "enquiries", "herobackgroundvideos", "heroslides", "jobs", "jobapplications",
  "media", "media_chunks", "media_upload_parts",
  "media_upload_sessions", "migration_runs", "mongo_migration_extras", "mongo_migration_mixed_bson",
  "portfolioitems", "reviews",
  "schema_migrations", "securitypolicies", "services", "sessions", "sitesettings", "teammembers",
  "trusteddevices", "users", "videoanalytics", "videoshowcaseitems", "videoshowcasesettings",
  "workinghours"
]);

function requireDatabaseUrl() {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) {
    const error = new Error("DATABASE_URL is not configured.");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }
  return connectionString;
}

/** Lazily create one pooled Neon connection per warm serverless instance. */
export function getPostgresPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000
    });
    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error.message);
    });
  }
  return pool;
}

/** Shared Drizzle facade for request-scoped, parameterized SQL operations. */
export function getPostgresDatabase() {
  if (!database) database = drizzle(getPostgresPool());
  return database;
}

export async function checkPostgresConnection() {
  const result = await getPostgresPool().query("SELECT 1 AS connected");
  return result.rows[0]?.connected === 1;
}

export async function inspectPostgresSchema() {
  const result = await getPostgresPool().query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'"
  );
  const present = new Set(result.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_POSTGRES_TABLES.filter((name) => !present.has(name));
  return { status: missingTables.length ? "incomplete" : "ready", missingTables };
}

export const MEDIA_STORAGE_MIGRATION_SQL = `
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "checksum" TEXT DEFAULT '';
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "width" INTEGER;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "height" INTEGER;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "duration" DOUBLE PRECISION;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "upload_status" TEXT DEFAULT 'completed';
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "total_chunks" INTEGER DEFAULT 1;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "is_video" BOOLEAN DEFAULT FALSE;
  CREATE INDEX IF NOT EXISTS "idx_media_checksum" ON "media" ("checksum");
  CREATE INDEX IF NOT EXISTS "idx_media_category" ON "media" ("category");
  CREATE INDEX IF NOT EXISTS "idx_media_upload_status" ON "media" ("upload_status");
  CREATE TABLE IF NOT EXISTS "media_chunks" (
    "media_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "chunk_size" INTEGER NOT NULL,
    "offset_start" BIGINT,
    "offset_end" BIGINT,
    "data" BYTEA NOT NULL,
    "sha256" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("media_id", "chunk_index")
  );
  CREATE INDEX IF NOT EXISTS "idx_media_chunks_media_id" ON "media_chunks" ("media_id");
  CREATE INDEX IF NOT EXISTS "idx_media_chunks_offsets" ON "media_chunks" ("media_id", "offset_start", "offset_end");
  INSERT INTO schema_migrations (version, applied_at)
  VALUES ('0002_add_media_storage_columns', now())
  ON CONFLICT (version) DO NOTHING;
`;

export async function ensurePostgresSchema() {
  let schema = await inspectPostgresSchema();
  if (schema.status !== "ready") {
    console.log(`[POSTGRES] Missing ${schema.missingTables.length} tables. Applying initial schema...`);
    try {
      await getPostgresPool().query(INITIAL_SCHEMA_SQL);
      schema = await inspectPostgresSchema();
    } catch (err) {
      console.error(`[POSTGRES] Error applying schema: ${err.message}`);
    }
  }

  // Ensure media storage schema migrations (checksum, chunks, indexes) are applied
  try {
    await getPostgresPool().query(MEDIA_STORAGE_MIGRATION_SQL);
  } catch (err) {
    console.warn(`[POSTGRES] Note on media storage migration: ${err.message}`);
  }

  return schema;
}

export async function closePostgresPool() {
  if (!pool) return;
  const closingPool = pool;
  pool = undefined;
  database = undefined;
  await closingPool.end();
}

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "../config/env.js";
import { INITIAL_SCHEMA_SQL } from "./initialSchemaSql.js";

// In serverless / Node environments (such as Vercel Serverless Functions),
// configure the WebSocket constructor and enable poolQueryViaFetch so queries
// can seamlessly fall back to HTTP fetch without failing if WebSockets are unavailable.
if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws;
}
neonConfig.poolQueryViaFetch = true;

let pool;
let database;
let lastConnectionError = null;

export function getLastPostgresError() {
  return lastConnectionError;
}

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

export const ACTIVE_NEON_DATABASE_URL = "postgresql://neondb_owner:npg_M1Njo6YlUQwW@ep-falling-hall-b3o2td4g-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

function requireDatabaseUrl() {
  let connectionString = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    env.DATABASE_URL
  )?.trim();

  // If the environment variable is missing or points to the expired quota endpoint ep-small-dust-a1jc39yr,
  // route cleanly to the active, provisioned Neon database ep-falling-hall-b3o2td4g.
  if (!connectionString || connectionString.includes("ep-small-dust-a1jc39yr")) {
    console.warn("[POSTGRES] Routing to active production Neon database (ep-falling-hall-b3o2td4g).");
    connectionString = ACTIVE_NEON_DATABASE_URL;
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
      lastConnectionError = {
        message: error.message,
        code: error.code || null,
        name: error.name || null
      };
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
  try {
    lastConnectionError = null;
    const result = await getPostgresPool().query("SELECT 1 AS connected");
    return result.rows[0]?.connected === 1;
  } catch (err) {
    lastConnectionError = {
      message: err.message,
      code: err.code || null,
      name: err.name || null,
      stack: err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : null
    };
    console.error("[POSTGRES] Connection check failed:", err.message);
    return false;
  }
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

export async function executeMultiStatementSql(poolOrClient, sql) {
  const target = poolOrClient && typeof poolOrClient.query === "function" ? poolOrClient : getPostgresPool();
  const statements = String(sql || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await target.query(stmt);
  }
}

export async function ensurePostgresSchema() {
  let schema = await inspectPostgresSchema();
  if (schema.status !== "ready") {
    console.log(`[POSTGRES] Missing ${schema.missingTables.length} tables. Applying initial schema...`);
    try {
      await executeMultiStatementSql(getPostgresPool(), INITIAL_SCHEMA_SQL);
      schema = await inspectPostgresSchema();
    } catch (err) {
      console.error(`[POSTGRES] Error applying schema: ${err.message}`);
    }
  }

  // Ensure media storage schema migrations (checksum, chunks, indexes) are applied
  try {
    await executeMultiStatementSql(getPostgresPool(), MEDIA_STORAGE_MIGRATION_SQL);
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

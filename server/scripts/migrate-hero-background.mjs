import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { getPostgresPool } from "../src/db/postgres.js";

export const HERO_BACKGROUND_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "herobackgroundvideos" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT DEFAULT 'Hero Background Video',
  "video_url" TEXT DEFAULT '',
  "mobile_video_url" TEXT DEFAULT '',
  "poster_url" TEXT DEFAULT '',
  "video_type" TEXT DEFAULT 'video/mp4',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "playback_settings" JSONB DEFAULT '{"autoplay": true, "muted": true, "loop": true, "playsInline": true}'::jsonb,
  "overlay_opacity" DOUBLE PRECISION DEFAULT 0.35,
  "video_position" TEXT DEFAULT 'center',
  "playback_speed" DOUBLE PRECISION DEFAULT 1.0,
  "file_metadata" JSONB DEFAULT '{}'::jsonb,
  "version" INTEGER DEFAULT 1,
  "version_notes" TEXT DEFAULT '',
  "created_by" TEXT DEFAULT '',
  "updated_by" TEXT DEFAULT '',
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_herobackgroundvideos_status" ON "herobackgroundvideos" ("status");
CREATE INDEX IF NOT EXISTS "idx_herobackgroundvideos_created_at" ON "herobackgroundvideos" ("created_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_herobackgroundvideos_single_published" ON "herobackgroundvideos" ("status") WHERE "status" = 'published';
`;

export async function runHeroBackgroundMigration() {
  const pool = getPostgresPool();
  console.log("[MIGRATION] Applying hero background video table to PostgreSQL...");
  await pool.query(HERO_BACKGROUND_SCHEMA_SQL);
  console.log("[MIGRATION] Successfully created herobackgroundvideos table and indexes!");
}

// Always run if executed directly
runHeroBackgroundMigration()
  .then(() => {
    console.log("[MIGRATION COMPLETE] Table herobackgroundvideos is ready.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[MIGRATION ERROR]", err);
    process.exit(1);
  });

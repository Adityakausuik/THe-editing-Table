-- Migration 0002: Add missing columns and tables for Neon media storage
-- Ensures media table has checksum, width, height, duration, upload_status, total_chunks, is_video
-- Ensures media_chunks table and indexes exist for chunked BYTEA streaming
-- Safe, idempotent, non-destructive

BEGIN;

-- 1. Ensure media columns exist
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "checksum" TEXT DEFAULT '';
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "duration" DOUBLE PRECISION;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "upload_status" TEXT DEFAULT 'completed';
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "total_chunks" INTEGER DEFAULT 1;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "is_video" BOOLEAN DEFAULT FALSE;

-- 2. Indexes on media table
CREATE INDEX IF NOT EXISTS "idx_media_checksum" ON "media" ("checksum");
CREATE INDEX IF NOT EXISTS "idx_media_category" ON "media" ("category");
CREATE INDEX IF NOT EXISTS "idx_media_upload_status" ON "media" ("upload_status");

-- 3. Ensure media_chunks table exists
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

-- 4. Indexes on media_chunks table
CREATE INDEX IF NOT EXISTS "idx_media_chunks_media_id" ON "media_chunks" ("media_id");
CREATE INDEX IF NOT EXISTS "idx_media_chunks_offsets" ON "media_chunks" ("media_id", "offset_start", "offset_end");

-- 5. Track migration in schema_migrations
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0002_add_media_storage_columns', now())
ON CONFLICT (version) DO NOTHING;

COMMIT;

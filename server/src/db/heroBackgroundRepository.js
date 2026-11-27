import { getPostgresPool } from "./postgres.js";

function parseJsonField(val, fallback = {}) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function mapHeroBackgroundRow(row) {
  if (!row) return null;
  return {
    _id: row._id,
    id: row._id,
    title: row.title || "Hero Background Video",
    videoUrl: row.video_url || "",
    mobileVideoUrl: row.mobile_video_url || "",
    posterUrl: row.poster_url || "",
    videoType: row.video_type || "video/mp4",
    status: row.status || "draft",
    playbackSettings: parseJsonField(row.playback_settings, {
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true
    }),
    overlayOpacity: row.overlay_opacity != null ? Number(row.overlay_opacity) : 0.35,
    videoPosition: row.video_position || "center",
    playbackSpeed: row.playback_speed != null ? Number(row.playback_speed) : 1.0,
    fileMetadata: parseJsonField(row.file_metadata, {}),
    version: row.version != null ? Number(row.version) : 1,
    versionNotes: row.version_notes || "",
    createdBy: row.created_by || "",
    updatedBy: row.updated_by || "",
    publishedAt: row.published_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export const HERO_BACKGROUND_TABLE_SQL = `
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

let ensureTablePromise = null;
export async function ensureHeroBackgroundTable(pool) {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      const statements = HERO_BACKGROUND_TABLE_SQL.split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await pool.query(stmt);
      }
    })().catch((err) => {
      ensureTablePromise = null;
      throw err;
    });
  }
  return ensureTablePromise;
}

/**
 * Get active published hero background configuration for the public homepage.
 */
export async function getActiveHeroBackground() {
  const pool = getPostgresPool();
  try {
    const res = await pool.query(
      `SELECT * FROM "herobackgroundvideos" WHERE "status" = 'published' LIMIT 1`
    );
    return mapHeroBackgroundRow(res.rows[0]);
  } catch (err) {
    if (err?.code === "42P01" || err?.message?.includes("does not exist")) {
      await ensureHeroBackgroundTable(pool);
      const res = await pool.query(
        `SELECT * FROM "herobackgroundvideos" WHERE "status" = 'published' LIMIT 1`
      );
      return mapHeroBackgroundRow(res.rows[0]);
    }
    throw err;
  }
}

/**
 * Get current draft or active configuration for admin overview.
 */
export async function getAdminHeroBackground() {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  // 1. Look for draft first (work in progress)
  const draftRes = await pool.query(
    `SELECT * FROM "herobackgroundvideos" WHERE "status" = 'draft' ORDER BY "updated_at" DESC LIMIT 1`
  );
  // 2. Look for active published
  const activeRes = await pool.query(
    `SELECT * FROM "herobackgroundvideos" WHERE "status" = 'published' LIMIT 1`
  );

  return {
    draft: mapHeroBackgroundRow(draftRes.rows[0]),
    active: mapHeroBackgroundRow(activeRes.rows[0])
  };
}

/**
 * Retrieve by primary key _id
 */
export async function getHeroBackgroundById(id) {
  const pool = getPostgresPool();
  const res = await pool.query(
    `SELECT * FROM "herobackgroundvideos" WHERE "_id" = $1 LIMIT 1`,
    [String(id)]
  );
  return mapHeroBackgroundRow(res.rows[0]);
}

/**
 * List historical versions with pagination
 */
export async function listHeroBackgroundHistory({ page = 1, limit = 20 } = {}) {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageNum - 1) * pageSize;

  const countRes = await pool.query(
    `SELECT COUNT(*)::integer AS total FROM "herobackgroundvideos"`
  );
  const total = Number(countRes.rows[0]?.total || 0);

  const listRes = await pool.query(
    `SELECT * FROM "herobackgroundvideos" ORDER BY "version" DESC, "created_at" DESC LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  return {
    total,
    page: pageNum,
    limit: pageSize,
    items: listRes.rows.map(mapHeroBackgroundRow)
  };
}

/**
 * Save or update the draft configuration.
 */
export async function saveHeroBackgroundDraft(data, user) {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  const userId = user?.id || user?._id || user?.email || "admin";

  // Check if a draft exists
  const existingRes = await pool.query(
    `SELECT "_id", "version" FROM "herobackgroundvideos" WHERE "status" = 'draft' ORDER BY "updated_at" DESC LIMIT 1`
  );

  if (existingRes.rows.length > 0) {
    const draftId = existingRes.rows[0]._id;
    // Update existing draft
    const updateRes = await pool.query(
      `UPDATE "herobackgroundvideos" SET
        "title" = COALESCE($1, "title"),
        "video_url" = COALESCE($2, "video_url"),
        "mobile_video_url" = COALESCE($3, "mobile_video_url"),
        "poster_url" = COALESCE($4, "poster_url"),
        "video_type" = COALESCE($5, "video_type"),
        "playback_settings" = COALESCE($6::jsonb, "playback_settings"),
        "overlay_opacity" = COALESCE($7, "overlay_opacity"),
        "video_position" = COALESCE($8, "video_position"),
        "playback_speed" = COALESCE($9, "playback_speed"),
        "file_metadata" = COALESCE($10::jsonb, "file_metadata"),
        "version_notes" = COALESCE($11, "version_notes"),
        "updated_by" = $12,
        "updated_at" = now()
      WHERE "_id" = $13
      RETURNING *`,
      [
        data.title,
        data.videoUrl,
        data.mobileVideoUrl,
        data.posterUrl,
        data.videoType,
        data.playbackSettings ? JSON.stringify(data.playbackSettings) : null,
        data.overlayOpacity != null ? Number(data.overlayOpacity) : null,
        data.videoPosition,
        data.playbackSpeed != null ? Number(data.playbackSpeed) : null,
        data.fileMetadata ? JSON.stringify(data.fileMetadata) : null,
        data.versionNotes,
        userId,
        draftId
      ]
    );
    return mapHeroBackgroundRow(updateRes.rows[0]);
  }

  // Create new draft with next version
  const maxVersionRes = await pool.query(
    `SELECT COALESCE(MAX("version"), 0) AS max_v FROM "herobackgroundvideos"`
  );
  const nextVersion = Number(maxVersionRes.rows[0]?.max_v || 0) + 1;

  const insertRes = await pool.query(
    `INSERT INTO "herobackgroundvideos" (
      "title",
      "video_url",
      "mobile_video_url",
      "poster_url",
      "video_type",
      "status",
      "playback_settings",
      "overlay_opacity",
      "video_position",
      "playback_speed",
      "file_metadata",
      "version",
      "version_notes",
      "created_by",
      "updated_by",
      "created_at",
      "updated_at"
    ) VALUES (
      $1, $2, $3, $4, $5, 'draft', $6::jsonb, $7, $8, $9, $10::jsonb, $11, $12, $13, $13, now(), now()
    ) RETURNING *`,
    [
      data.title || "Hero Background Video",
      data.videoUrl || "",
      data.mobileVideoUrl || "",
      data.posterUrl || "",
      data.videoType || "video/mp4",
      JSON.stringify(data.playbackSettings || { autoplay: true, muted: true, loop: true, playsInline: true }),
      data.overlayOpacity != null ? Number(data.overlayOpacity) : 0.35,
      data.videoPosition || "center",
      data.playbackSpeed != null ? Number(data.playbackSpeed) : 1.0,
      JSON.stringify(data.fileMetadata || {}),
      nextVersion,
      data.versionNotes || `Draft version ${nextVersion}`,
      userId
    ]
  );
  return mapHeroBackgroundRow(insertRes.rows[0]);
}

/**
 * Publish a configuration record to live.
 * Atomic transaction ensures only one published version exists.
 */
export async function publishHeroBackground(id, user) {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  const client = await pool.connect();
  const userId = user?.id || user?._id || user?.email || "admin";

  try {
    await client.query("BEGIN");

    // Check if target exists and has a video
    const targetRes = await client.query(
      `SELECT * FROM "herobackgroundvideos" WHERE "_id" = $1 LIMIT 1 FOR UPDATE`,
      [String(id)]
    );
    if (!targetRes.rows.length) {
      const err = new Error("Hero background video configuration not found.");
      err.status = 404;
      throw err;
    }

    const target = targetRes.rows[0];
    if (!target.video_url && !target.poster_url) {
      const err = new Error("Cannot publish configuration without at least a background video or poster image.");
      err.status = 400;
      throw err;
    }

    // Demote any currently published row to 'archived'
    await client.query(
      `UPDATE "herobackgroundvideos" SET "status" = 'archived', "updated_at" = now() WHERE "status" = 'published'`
    );

    // Promote target to published
    const publishRes = await client.query(
      `UPDATE "herobackgroundvideos" SET
        "status" = 'published',
        "published_at" = now(),
        "updated_by" = $1,
        "updated_at" = now()
      WHERE "_id" = $2
      RETURNING *`,
      [userId, String(id)]
    );

    await client.query("COMMIT");
    return mapHeroBackgroundRow(publishRes.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Unpublish the active video (reverts status to 'draft').
 */
export async function unpublishHeroBackground(id, user) {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  const userId = user?.id || user?._id || user?.email || "admin";

  const res = await pool.query(
    `UPDATE "herobackgroundvideos" SET
      "status" = 'draft',
      "updated_by" = $1,
      "updated_at" = now()
    WHERE "_id" = $2 AND "status" = 'published'
    RETURNING *`,
    [userId, String(id)]
  );

  if (!res.rows.length) {
    const err = new Error("Active published configuration not found.");
    err.status = 404;
    throw err;
  }

  return mapHeroBackgroundRow(res.rows[0]);
}

/**
 * Restore a historical version.
 * Clones the version into a newly published state atomically.
 */
export async function restoreHeroBackgroundVersion(versionId, user) {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  const client = await pool.connect();
  const userId = user?.id || user?._id || user?.email || "admin";

  try {
    await client.query("BEGIN");

    // 1. Fetch source version
    const sourceRes = await client.query(
      `SELECT * FROM "herobackgroundvideos" WHERE "_id" = $1 LIMIT 1`,
      [String(versionId)]
    );
    if (!sourceRes.rows.length) {
      const err = new Error("Target version to restore was not found.");
      err.status = 404;
      throw err;
    }
    const source = sourceRes.rows[0];

    // 2. Archive any currently published
    await client.query(
      `UPDATE "herobackgroundvideos" SET "status" = 'archived', "updated_at" = now() WHERE "status" = 'published'`
    );

    // 3. Get next version number
    const maxVRes = await client.query(
      `SELECT COALESCE(MAX("version"), 0) AS max_v FROM "herobackgroundvideos"`
    );
    const nextVersion = Number(maxVRes.rows[0]?.max_v || 0) + 1;

    // 4. Create new restored published row
    const restoredRes = await client.query(
      `INSERT INTO "herobackgroundvideos" (
        "title",
        "video_url",
        "mobile_video_url",
        "poster_url",
        "video_type",
        "status",
        "playback_settings",
        "overlay_opacity",
        "video_position",
        "playback_speed",
        "file_metadata",
        "version",
        "version_notes",
        "created_by",
        "updated_by",
        "published_at",
        "created_at",
        "updated_at"
      ) VALUES (
        $1, $2, $3, $4, $5, 'published', $6::jsonb, $7, $8, $9, $10::jsonb, $11, $12, $13, $13, now(), now(), now()
      ) RETURNING *`,
      [
        source.title,
        source.video_url,
        source.mobile_video_url,
        source.poster_url,
        source.video_type,
        JSON.stringify(source.playback_settings || {}),
        source.overlay_opacity,
        source.video_position,
        source.playback_speed,
        JSON.stringify(source.file_metadata || {}),
        nextVersion,
        `Restored from Version ${source.version}`,
        userId
      ]
    );

    await client.query("COMMIT");
    return mapHeroBackgroundRow(restoredRes.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a specific configuration version (cannot delete currently published).
 */
export async function deleteHeroBackgroundVersion(id) {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  const targetRes = await pool.query(
    `SELECT * FROM "herobackgroundvideos" WHERE "_id" = $1 LIMIT 1`,
    [String(id)]
  );
  if (!targetRes.rows.length) {
    const err = new Error("Hero background record not found.");
    err.status = 404;
    throw err;
  }

  const target = targetRes.rows[0];
  if (target.status === "published") {
    const err = new Error("Cannot delete active published configuration. Unpublish first.");
    err.status = 400;
    throw err;
  }

  await pool.query(
    `DELETE FROM "herobackgroundvideos" WHERE "_id" = $1`,
    [String(id)]
  );

  return mapHeroBackgroundRow(target);
}

/**
 * Remove an individual asset (desktop, mobile, or poster) from the active draft.
 */
export async function removeAssetFromDraft(assetType, user) {
  const pool = getPostgresPool();
  await ensureHeroBackgroundTable(pool);
  const userId = user?.id || user?._id || user?.email || "admin";

  let columnToClear;
  if (assetType === "desktop") columnToClear = "video_url";
  else if (assetType === "mobile") columnToClear = "mobile_video_url";
  else if (assetType === "poster") columnToClear = "poster_url";
  else {
    const err = new Error("Invalid asset type. Permitted values: desktop, mobile, poster.");
    err.status = 400;
    throw err;
  }

  const res = await pool.query(
    `UPDATE "herobackgroundvideos" SET
      "${columnToClear}" = '',
      "updated_by" = $1,
      "updated_at" = now()
    WHERE "status" = 'draft'
    RETURNING *`,
    [userId]
  );

  if (!res.rows.length) {
    const err = new Error("No draft configuration found to modify.");
    err.status = 404;
    throw err;
  }

  return mapHeroBackgroundRow(res.rows[0]);
}

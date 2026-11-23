import { getPostgresPool } from "./postgres.js";
import VideoShowcaseItem from "../models/VideoShowcaseItem.model.js";
import VideoShowcaseSettings from "../models/VideoShowcaseSettings.model.js";
import {
  createPostgresCmsRecord,
  deletePostgresCmsRecord,
  getPostgresCmsRecord,
  listPostgresCmsRecords,
  mapPostgresCmsRow,
  reorderPostgresCmsRecords,
  updatePostgresCmsRecord
} from "./cmsRepository.js";

export function buildPostgresVideoAdminListQuery({ search = "", status = "", category = "", sourceType = "", featured = "", isTrash = false, sort = "", page = 1, limit = 20 } = {}) {
  const values = [];
  const filters = [isTrash ? '"deleted_at" IS NOT NULL' : '"deleted_at" IS NULL'];
  if (status === "active") filters.push('"is_active" = TRUE');
  if (status === "inactive") filters.push('"is_active" = FALSE');
  if (featured === "true") filters.push('"is_featured" = TRUE');
  if (featured === "false") filters.push('"is_featured" = FALSE');
  if (category) filters.push(`"category" = $${values.push(category)}`);
  if (sourceType) filters.push(`"source_type" = $${values.push(sourceType)}`);
  if (search) {
    const escaped = String(search).replace(/[\\%_]/g, "\\$&");
    const parameter = `$${values.push(`%${escaped}%`)}`;
    filters.push(`("title" ILIKE ${parameter} ESCAPE E'\\\\' OR "property_name" ILIKE ${parameter} ESCAPE E'\\\\' OR "location" ILIKE ${parameter} ESCAPE E'\\\\' OR "category" ILIKE ${parameter} ESCAPE E'\\\\' OR "description" ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  const order = sort === "title" ? '"title" ASC'
    : sort === "date" ? '"created_at" DESC NULLS LAST'
      : sort === "views" ? '"views" DESC NULLS LAST'
        : sort === "order" ? '"order" ASC'
          : '"order" ASC, "created_at" DESC NULLS LAST';
  const where = ` WHERE ${filters.join(" AND ")}`;
  const pageNumber = Math.max(1, Math.trunc(Number(page) || 1));
  const pageSize = Math.min(250, Math.max(1, Math.trunc(Number(limit) || 20)));
  const count = { text: `SELECT COUNT(*)::integer AS total FROM "videoshowcaseitems"${where}`, values };
  const listValues = [...values, pageSize, (pageNumber - 1) * pageSize];
  const list = {
    text: `SELECT * FROM "videoshowcaseitems"${where} ORDER BY ${order} LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    values: listValues
  };
  return { count, list, page: pageNumber, limit: pageSize };
}

export async function listPostgresVideoShowcaseItems(options = {}) {
  const pool = getPostgresPool();
  const built = buildPostgresVideoAdminListQuery(options);
  const [count, items] = await Promise.all([
    pool.query(built.count.text, built.count.values),
    pool.query(built.list.text, built.list.values)
  ]);
  return { total: Number(count.rows[0]?.total || 0), page: built.page, limit: built.limit, items: items.rows.map((row) => mapPostgresCmsRow(VideoShowcaseItem, row)) };
}

export async function listPostgresPublicVideoShowcaseItems(now = new Date()) {
  const result = await getPostgresPool().query(
    `SELECT * FROM "videoshowcaseitems" WHERE "is_active" = TRUE AND "deleted_at" IS NULL ` +
      `AND ("published_at" IS NULL OR "published_at" <= $1) AND ("expires_at" IS NULL OR "expires_at" > $1) ` +
      `ORDER BY "order" ASC, "created_at" DESC NULLS LAST`,
    [now]
  );
  return result.rows.map((row) => mapPostgresCmsRow(VideoShowcaseItem, row));
}

export async function findPostgresVideoShowcaseBySlug(slug) {
  const result = await getPostgresPool().query(
    `SELECT * FROM "videoshowcaseitems" WHERE "slug" = $1 AND "is_active" = TRUE AND "deleted_at" IS NULL LIMIT 1`,
    [slug]
  );
  return mapPostgresCmsRow(VideoShowcaseItem, result.rows[0]);
}

export async function findPostgresVideoShowcaseById(id) {
  return getPostgresCmsRecord(VideoShowcaseItem, String(id));
}

export async function videoShowcaseSlugExists(slug, exceptId) {
  const values = [slug];
  const except = exceptId ? ` AND "_id" <> $${values.push(String(exceptId))}` : "";
  const result = await getPostgresPool().query(`SELECT 1 FROM "videoshowcaseitems" WHERE "slug" = $1${except} LIMIT 1`, values);
  return result.rowCount > 0;
}

export async function countPostgresVideoShowcaseItems({ includeDeleted = false } = {}) {
  const result = await getPostgresPool().query(
    `SELECT COUNT(*)::integer AS total FROM "videoshowcaseitems"${includeDeleted ? "" : ' WHERE "deleted_at" IS NULL'}`
  );
  return Number(result.rows[0]?.total || 0);
}

export async function createPostgresVideoShowcaseItem(payload) {
  const item = new VideoShowcaseItem(payload);
  await item.validate();
  const raw = item.toObject({ depopulate: true, flattenMaps: true });
  return VideoShowcaseItem.hydrate(await createPostgresCmsRecord(VideoShowcaseItem, String(item._id), raw));
}

export async function updatePostgresVideoShowcaseItem(id, payload) {
  const current = await getPostgresCmsRecord(VideoShowcaseItem, String(id));
  if (!current) return null;
  const candidate = VideoShowcaseItem.hydrate(current);
  candidate.set(payload);
  await candidate.validate();
  const updated = await updatePostgresCmsRecord(VideoShowcaseItem, String(id), payload);
  return updated ? VideoShowcaseItem.hydrate(updated) : null;
}

export async function deletePostgresVideoShowcaseItem(id) {
  return deletePostgresCmsRecord(VideoShowcaseItem, String(id));
}

export async function reorderPostgresVideoShowcaseItems(items) {
  return reorderPostgresCmsRecords(VideoShowcaseItem, "order", items);
}

export async function getPostgresOrderedVideoShowcaseItems() {
  return listPostgresCmsRecords(VideoShowcaseItem, { publicFilter: { deletedAt: null }, orderField: "order", admin: true });
}

export async function bulkUpdatePostgresVideoShowcaseItems(ids, update) {
  const columnMap = {
    isActive: '"is_active"',
    isFeatured: '"is_featured"',
    deletedAt: '"deleted_at"',
    updatedBy: '"updated_by"'
  };
  const entries = Object.entries(update).filter(([key]) => columnMap[key]);
  if (!entries.length || !ids.length) return { modifiedCount: 0 };
  const values = [ids.map(String)];
  const assignments = [];
  for (const [key, value] of entries) {
    const index = values.push(key === "updatedBy" ? String(value) : value);
    assignments.push(`${columnMap[key]} = $${index}`);
  }
  assignments.push('"updated_at" = now()', '"__v" = "__v" + 1');
  const result = await getPostgresPool().query(
    `UPDATE "videoshowcaseitems" SET ${assignments.join(", ")} WHERE "_id" = ANY($1::text[])`,
    values
  );
  return { modifiedCount: result.rowCount };
}

export async function getOrCreatePostgresVideoShowcaseSettings() {
  const result = await getPostgresPool().query(
    `INSERT INTO "videoshowcasesettings" ("settings_key") VALUES ($1) ` +
      `ON CONFLICT ("settings_key") DO UPDATE SET "settings_key" = EXCLUDED."settings_key" RETURNING *`,
    ["video-showcase"]
  );
  return mapPostgresCmsRow(VideoShowcaseSettings, result.rows[0]);
}

export async function updatePostgresVideoShowcaseSettings(payload) {
  const settings = await getOrCreatePostgresVideoShowcaseSettings();
  const candidate = VideoShowcaseSettings.hydrate(settings);
  candidate.set(payload);
  await candidate.validate();
  return updatePostgresCmsRecord(VideoShowcaseSettings, String(settings._id), payload);
}

export async function recordPostgresVideoEvent({ videoId, eventType, clientInfo }) {
  const counters = {
    impression: ['"views" = "views" + 1'],
    play: ['"play_clicks" = "play_clicks" + 1', '"views" = "views" + 1'],
    complete: ['"completed_views" = "completed_views" + 1'],
    cta_click: ['"cta_clicks" = "cta_clicks" + 1']
  };
  if (!counters[eventType]) throw new Error("Unsupported video event type.");
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE "videoshowcaseitems" SET ${[...counters[eventType], '"updated_at" = now()', '"__v" = "__v" + 1'].join(", ")} ` +
        `WHERE "_id" = $1 AND "deleted_at" IS NULL RETURNING "_id"`,
      [String(videoId)]
    );
    if (!updated.rowCount) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `INSERT INTO "videoanalytics" ("video_id", "event_type", "session_id", "device_type", "browser", "operating_system", "referrer", "ip_hash", "created_at") ` +
        `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [String(videoId), eventType, clientInfo.sessionId, clientInfo.deviceType, clientInfo.browser, clientInfo.operatingSystem, clientInfo.referrer, clientInfo.ipHash]
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePostgresVideoAnalytics(videoId) {
  const result = await getPostgresPool().query(`DELETE FROM "videoanalytics" WHERE "video_id" = $1`, [String(videoId)]);
  return result.rowCount;
}

export async function getPostgresVideoShowcaseAnalytics(sinceDate) {
  const pool = getPostgresPool();
  const [stats, devices, events, top] = await Promise.all([
    pool.query(`SELECT COUNT(*)::integer AS total_videos, COUNT(*) FILTER (WHERE "is_active" = TRUE)::integer AS active_videos, COUNT(*) FILTER (WHERE "is_active" = FALSE)::integer AS inactive_videos, COUNT(*) FILTER (WHERE "is_featured" = TRUE)::integer AS featured_videos, COALESCE(SUM("views"), 0)::bigint AS total_views, COALESCE(SUM("play_clicks"), 0)::bigint AS total_play_clicks, COALESCE(SUM("completed_views"), 0)::bigint AS total_completed_views, COALESCE(SUM("cta_clicks"), 0)::bigint AS total_cta_clicks FROM "videoshowcaseitems" WHERE "deleted_at" IS NULL`),
    pool.query(`SELECT "device_type" AS "_id", COUNT(*)::integer AS count FROM "videoanalytics" WHERE "created_at" >= $1 GROUP BY "device_type"`, [sinceDate]),
    pool.query(`SELECT "event_type" AS "_id", COUNT(*)::integer AS count FROM "videoanalytics" WHERE "created_at" >= $1 GROUP BY "event_type"`, [sinceDate]),
    pool.query(`SELECT * FROM "videoshowcaseitems" WHERE "deleted_at" IS NULL ORDER BY "views" DESC NULLS LAST, "play_clicks" DESC NULLS LAST LIMIT 5`)
  ]);
  const row = stats.rows[0] || {};
  const totals = {
    totalViews: Number(row.total_views || 0),
    totalPlayClicks: Number(row.total_play_clicks || 0),
    totalCompletedViews: Number(row.total_completed_views || 0),
    totalCtaClicks: Number(row.total_cta_clicks || 0)
  };
  return {
    summary: {
      totalVideos: Number(row.total_videos || 0),
      activeVideos: Number(row.active_videos || 0),
      inactiveVideos: Number(row.inactive_videos || 0),
      featuredVideos: Number(row.featured_videos || 0),
      ...totals,
      playRate: totals.totalViews ? ((totals.totalPlayClicks / totals.totalViews) * 100).toFixed(1) : "0",
      completionRate: totals.totalPlayClicks ? ((totals.totalCompletedViews / totals.totalPlayClicks) * 100).toFixed(1) : "0",
      ctr: totals.totalViews ? ((totals.totalCtaClicks / totals.totalViews) * 100).toFixed(1) : "0"
    },
    deviceBreakdown: devices.rows.map((entry) => ({ _id: entry._id, count: Number(entry.count) })),
    eventBreakdown: events.rows.map((entry) => ({ _id: entry._id, count: Number(entry.count) })),
    topVideos: top.rows.map((entry) => mapPostgresCmsRow(VideoShowcaseItem, entry))
  };
}

export async function writePostgresVideoShowcaseActivity(adminId, action, entityId, changes = {}) {
  await getPostgresPool().query(
    `INSERT INTO "adminactivitylogs" ("admin_id", "action", "entity_type", "entity_id", "changes", "created_at") ` +
      `VALUES ($1, $2, 'VideoShowcase', $3, $4::jsonb, now())`,
    [adminId ? String(adminId) : null, action, entityId ? String(entityId) : null, JSON.stringify(changes)]
  );
}

export async function listPostgresVideoShowcaseActivity({ page = 1, limit = 20 } = {}) {
  const pageNumber = Math.max(1, Math.trunc(Number(page) || 1));
  const pageSize = Math.min(250, Math.max(1, Math.trunc(Number(limit) || 20)));
  const pool = getPostgresPool();
  const [count, logs] = await Promise.all([
    pool.query(`SELECT COUNT(*)::integer AS total FROM "adminactivitylogs" WHERE "entity_type" = 'VideoShowcase'`),
    pool.query(
      `SELECT l.*, u."name" AS admin_name, u."email" AS admin_email FROM "adminactivitylogs" l ` +
        `LEFT JOIN "users" u ON u."_id" = l."admin_id" WHERE l."entity_type" = 'VideoShowcase' ` +
        `ORDER BY l."created_at" DESC NULLS LAST LIMIT $1 OFFSET $2`,
      [pageSize, (pageNumber - 1) * pageSize]
    )
  ]);
  return {
    page: pageNumber,
    limit: pageSize,
    total: Number(count.rows[0]?.total || 0),
    logs: logs.rows.map((row) => ({
      _id: row._id,
      adminId: row.admin_id ? { _id: row.admin_id, name: row.admin_name, email: row.admin_email } : null,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      changes: row.changes,
      createdAt: row.created_at
    }))
  };
}

import { getPostgresPool } from "./postgres.js";
import PhotoShowcaseItem from "../models/PhotoShowcaseItem.model.js";
import PhotoShowcaseSettings from "../models/PhotoShowcaseSettings.model.js";
import {
  createPostgresCmsRecord,
  deletePostgresCmsRecord,
  getPostgresCmsRecord,
  listPostgresCmsRecords,
  mapPostgresCmsRow,
  reorderPostgresCmsRecords,
  updatePostgresCmsRecord
} from "./cmsRepository.js";


export function buildPostgresPhotoAdminListQuery({ search = "", status = "", category = "", isTrash = false, page = 1, limit = 50 } = {}) {
  const values = [];
  const filters = [];
  filters.push(isTrash ? '"deleted_at" IS NOT NULL' : '"deleted_at" IS NULL');
  if (status === "active") filters.push('"is_active" = TRUE');
  if (status === "inactive") filters.push('"is_active" = FALSE');
  if (category) filters.push(`"category" = $${values.push(category)}`);
  if (search) {
    const escaped = String(search).replace(/[\\%_]/g, "\\$&");
    const parameter = `$${values.push(`%${escaped}%`)}`;
    filters.push(`("title" ILIKE ${parameter} ESCAPE E'\\\\' OR "property_name" ILIKE ${parameter} ESCAPE E'\\\\' OR "location" ILIKE ${parameter} ESCAPE E'\\\\' OR "category" ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  const where = ` WHERE ${filters.join(" AND ")}`;
  const pageSize = Math.min(250, Math.max(1, Math.trunc(Number(limit) || 50)));
  const pageNumber = Math.max(1, Math.trunc(Number(page) || 1));
  const count = { text: `SELECT COUNT(*)::integer AS total FROM "photoshowcaseitems"${where}`, values };
  const listValues = [...values, pageSize, (pageNumber - 1) * pageSize];
  const list = {
    text: `SELECT * FROM "photoshowcaseitems"${where} ORDER BY "order" ASC, "created_at" DESC NULLS LAST LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    values: listValues
  };
  return { count, list, page: pageNumber, limit: pageSize };
}

export async function listPostgresPhotoShowcaseItems(options = {}) {
  const pool = getPostgresPool();
  const built = buildPostgresPhotoAdminListQuery(options);
  const [count, items] = await Promise.all([
    pool.query(built.count.text, built.count.values),
    pool.query(built.list.text, built.list.values)
  ]);
  return { total: Number(count.rows[0]?.total || 0), items: items.rows.map((row) => mapPostgresCmsRow(PhotoShowcaseItem, row)) };
}

export async function listPostgresPublicPhotoShowcaseItems() {
  return listPostgresCmsRecords(PhotoShowcaseItem, {
    publicFilter: { isActive: true, deletedAt: null },
    orderField: "order",
    admin: false
  });
}

export async function findPostgresPhotoShowcaseBySlug(slug) {
  const result = await getPostgresPool().query(
    `SELECT * FROM "photoshowcaseitems" WHERE "slug" = $1 AND "is_active" = TRUE AND "deleted_at" IS NULL LIMIT 1`,
    [slug]
  );
  if (!result.rows[0]) return null;
  return mapPostgresCmsRow(PhotoShowcaseItem, result.rows[0]);
}

export async function findPostgresPhotoShowcaseById(itemId) {
  return getPostgresCmsRecord(PhotoShowcaseItem, String(itemId));
}

export async function photoShowcaseSlugExists(slug, exceptId) {
  const values = [slug];
  const except = exceptId ? ` AND "_id" <> $${values.push(String(exceptId))}` : "";
  const result = await getPostgresPool().query(
    `SELECT 1 FROM "photoshowcaseitems" WHERE "slug" = $1${except} LIMIT 1`,
    values
  );
  return result.rowCount > 0;
}

export async function countPostgresPhotoShowcaseItems({ includeDeleted = false } = {}) {
  const result = await getPostgresPool().query(
    `SELECT COUNT(*)::integer AS total FROM "photoshowcaseitems"${includeDeleted ? "" : ' WHERE "deleted_at" IS NULL'}`
  );
  return Number(result.rows[0]?.total || 0);
}

export async function createPostgresPhotoShowcaseItem(payload) {
  const item = new PhotoShowcaseItem(payload);
  await item.validate();
  const raw = item.toObject({ depopulate: true, flattenMaps: true });
  return PhotoShowcaseItem.hydrate(await createPostgresCmsRecord(PhotoShowcaseItem, String(item._id), raw));
}

export async function updatePostgresPhotoShowcaseItem(itemId, payload) {
  const current = await getPostgresCmsRecord(PhotoShowcaseItem, String(itemId));
  if (!current) return null;
  const candidate = PhotoShowcaseItem.hydrate(current);
  candidate.set(payload);
  await candidate.validate();
  return PhotoShowcaseItem.hydrate(await updatePostgresCmsRecord(PhotoShowcaseItem, String(itemId), payload));
}

export async function deletePostgresPhotoShowcaseItem(itemId) {
  return deletePostgresCmsRecord(PhotoShowcaseItem, String(itemId));
}

export async function reorderPostgresPhotoShowcaseItems(items) {
  return reorderPostgresCmsRecords(PhotoShowcaseItem, "order", items);
}

export async function getPostgresOrderedPhotoShowcaseItems() {
  return listPostgresCmsRecords(PhotoShowcaseItem, {
    publicFilter: { deletedAt: null },
    orderField: "order",
    admin: true
  });
}

export async function getOrCreatePostgresPhotoShowcaseSettings() {
  const result = await getPostgresPool().query(
    `INSERT INTO "photoshowcasesettings" ("settings_key") VALUES ($1) ` +
      `ON CONFLICT ("settings_key") DO UPDATE SET "settings_key" = EXCLUDED."settings_key" RETURNING *`,
    ["photo-showcase"]
  );
  return mapPostgresCmsRow(PhotoShowcaseSettings, result.rows[0]);
}

export async function updatePostgresPhotoShowcaseSettings(payload) {
  const settings = await getOrCreatePostgresPhotoShowcaseSettings();
  const candidate = PhotoShowcaseSettings.hydrate(settings);
  candidate.set(payload);
  await candidate.validate();
  return updatePostgresCmsRecord(PhotoShowcaseSettings, String(settings._id), payload);
}

export async function getPostgresPhotoShowcaseAnalytics() {
  const pool = getPostgresPool();
  const [totals, top] = await Promise.all([
    pool.query(`SELECT COUNT(*)::integer AS total_photos, COALESCE(SUM("views"), 0)::bigint AS total_views, COALESCE(SUM("clicks"), 0)::bigint AS total_clicks FROM "photoshowcaseitems" WHERE "deleted_at" IS NULL`),
    pool.query(`SELECT * FROM "photoshowcaseitems" WHERE "deleted_at" IS NULL ORDER BY "views" DESC NULLS LAST LIMIT 5`)
  ]);
  const totalPhotos = Number(totals.rows[0]?.total_photos || 0);
  const totalViews = Number(totals.rows[0]?.total_views || 0);
  const totalClicks = Number(totals.rows[0]?.total_clicks || 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  return {
    totalPhotos,
    totalViews,
    totalClicks,
    ctr: `${ctr}%`,
    topPhotos: top.rows.map((row) => mapPostgresCmsRow(PhotoShowcaseItem, row))
  };
}

export async function writePostgresPhotoShowcaseActivity(adminId, action, entityId, changes = {}) {
  await getPostgresPool().query(
    `INSERT INTO "adminactivitylogs" ("admin_id", "action", "entity_type", "entity_id", "changes", "created_at") ` +
      `VALUES ($1, $2, 'PhotoShowcase', $3, $4::jsonb, now())`,
    [adminId ? String(adminId) : null, action, entityId ? String(entityId) : null, JSON.stringify(changes)]
  );
}

export async function listPostgresPhotoShowcaseActivity() {
  const result = await getPostgresPool().query(
    `SELECT l.*, u."name" AS admin_name, u."email" AS admin_email, u."role" AS admin_role ` +
      `FROM "adminactivitylogs" l LEFT JOIN "users" u ON u."_id" = l."admin_id" ` +
      `WHERE l."entity_type" = 'PhotoShowcase' ORDER BY l."created_at" DESC NULLS LAST LIMIT 50`
  );
  return result.rows.map((row) => ({
    _id: row._id,
    adminId: row.admin_id ? { _id: row.admin_id, name: row.admin_name, email: row.admin_email, role: row.admin_role } : null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    changes: row.changes,
    createdAt: row.created_at
  }));
}

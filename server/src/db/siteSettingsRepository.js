import { getPostgresPool } from "./postgres.js";

export function fromPostgresSiteSetting(row) {
  if (!row) return null;
  return {
    _id: row._id,
    key: row.key,
    value: row.value,
    group: row.group,
    description: row.description,
    updatedBy: row.updated_by,
    __v: row.__v,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listPostgresSiteSettings(keys) {
  const result = await getPostgresPool().query(
    'SELECT * FROM "sitesettings" WHERE "key" = ANY($1::text[]) ORDER BY "key" ASC',
    [keys]
  );
  return result.rows.map(fromPostgresSiteSetting);
}

export async function listAllPostgresSiteSettings() {
  const result = await getPostgresPool().query('SELECT * FROM "sitesettings" ORDER BY "key" ASC');
  return result.rows.map(fromPostgresSiteSetting);
}

export async function savePostgresSiteSetting({ key, value, group, description, updatedBy }) {
  const result = await getPostgresPool().query(
    `INSERT INTO "sitesettings" ("key", "value", "group", "description", "updated_by") ` +
      `VALUES ($1, $2::jsonb, $3, $4, $5) ` +
      `ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "group" = EXCLUDED."group", ` +
      `"description" = EXCLUDED."description", "updated_by" = EXCLUDED."updated_by", ` +
      `"updated_at" = now(), "__v" = "sitesettings"."__v" + 1 RETURNING *`,
    [key, JSON.stringify(value), group, description, updatedBy || null]
  );
  return fromPostgresSiteSetting(result.rows[0]);
}

export async function writePostgresCmsAudit(user, action, entity, entityId, details) {
  await getPostgresPool().query(
    `INSERT INTO "auditlogs" ("user", "user_email", "role", "action", "entity", "entity_id", "details", "result") ` +
      `VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'success')`,
    [user?.id || null, user?.email || "system", user?.role || "system", action, entity, entityId, JSON.stringify(details ?? null)]
  );
}

export async function listPostgresCmsAuditLogs(limit = 100) {
  const rowLimit = Math.min(500, Math.max(1, Math.trunc(Number(limit) || 100)));
  const result = await getPostgresPool().query(
    `SELECT "_id", "user", "user_email", "role", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "result", "metadata", "created_at", "updated_at" ` +
      `FROM "auditlogs" ORDER BY "created_at" DESC NULLS LAST LIMIT $1`,
    [rowLimit]
  );
  return result.rows.map((row) => ({
    _id: row._id,
    user: row.user,
    userEmail: row.user_email,
    role: row.role,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    result: row.result,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

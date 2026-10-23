import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.model.js";
import { isPostgresSelected } from "../config/databaseMode.js";
import { getPostgresPool } from "../db/postgres.js";

export function buildPostgresSecurityAudit({ user, action, result, entity, entityId, details, ipAddress, userAgent, metadata }) {
  return {
    text: `INSERT INTO "auditlogs" ("user", "user_email", "role", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "result", "metadata", "created_at", "updated_at") ` +
      `VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb, now(), now())`,
    values: [
      user?._id?.toString?.() || user?.id?.toString?.() || null,
      user?.email || "system",
      user?.role || "unknown",
      action,
      entity,
      entityId || user?._id?.toString?.() || user?.id?.toString?.() || "",
      JSON.stringify(details ?? {}),
      ipAddress || "",
      userAgent || "",
      result,
      JSON.stringify(metadata ?? {})
    ]
  };
}

export async function writeSecurityAudit({ req, user, action, result = "success", entity = "Security", entityId = "", metadata = {}, details = {} }) {
  if (isPostgresSelected()) {
    const query = buildPostgresSecurityAudit({
      user,
      action,
      result,
      entity,
      entityId,
      details,
      ipAddress: req?.ip,
      userAgent: String(req?.get?.("user-agent") || "").slice(0, 500),
      metadata
    });
    try {
      await getPostgresPool().query(query.text, query.values);
    } catch {
      // Security auditing remains best-effort, matching the MongoDB path below.
    }
    return;
  }

  if (mongoose.connection.readyState !== 1) return;
  await AuditLog.create({
    user: user?._id || user?.id,
    userEmail: user?.email || metadata.email || "system",
    role: user?.role || "unknown",
    action,
    entity,
    entityId: entityId || String(user?._id || user?.id || ""),
    details,
    ipAddress: req?.ip || "",
    userAgent: String(req?.get?.("user-agent") || "").slice(0, 500),
    result,
    metadata
  }).catch(() => null);
}

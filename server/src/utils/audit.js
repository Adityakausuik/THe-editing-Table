import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.model.js";

export async function writeSecurityAudit({ req, user, action, result = "success", entity = "Security", entityId = "", metadata = {}, details = {} }) {
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

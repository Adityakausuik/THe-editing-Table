import { env } from "../config/env.js";
import { isPostgresSelected } from "../config/databaseMode.js";

const SAFE_READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PREVIEW_INQUIRY_PATH = "/api/v1/enquiries";

export function createMigrationWriteFreeze({
  enabled = env.MIGRATION_WRITE_FREEZE,
  allowPreviewInquiry = env.VERCEL_ENV === "preview" && isPostgresSelected()
} = {}) {
  return (req, res, next) => {
    const method = String(req.method || "").toUpperCase();
    const path = String(req.path || req.url || "").split("?", 1)[0].replace(/\/$/, "");
    const isPreviewInquiry = allowPreviewInquiry && method === "POST" && path === PREVIEW_INQUIRY_PATH;

    if (!enabled || SAFE_READ_METHODS.has(method) || isPreviewInquiry) return next();

    res.setHeader("Retry-After", "300");
    return res.status(503).json({
      success: false,
      code: "MIGRATION_MAINTENANCE",
      message: "The site is temporarily read-only for a scheduled database migration. Please try again shortly.",
      data: null
    });
  };
}

export default createMigrationWriteFreeze();

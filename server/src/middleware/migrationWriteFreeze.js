import { env } from "../config/env.js";

const SAFE_READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function createMigrationWriteFreeze({ enabled = env.MIGRATION_WRITE_FREEZE } = {}) {
  return (req, res, next) => {
    if (!enabled || SAFE_READ_METHODS.has(String(req.method || "").toUpperCase())) return next();

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

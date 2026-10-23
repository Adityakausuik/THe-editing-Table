import { Router } from "express";
import { env } from "../config/env.js";
import { isPostgresSelected } from "../config/databaseMode.js";
import { cleanupExpiredPostgresRecords } from "../db/maintenanceRepository.js";
import { isAuthorizedCronRequest } from "../utils/cronAuth.js";

const router = Router();

router.get("/cleanup-expired", async (req, res, next) => {
  if (!isPostgresSelected()) {
    return res.status(200).json({ success: true, skipped: true, reason: "PostgreSQL is not the active database." });
  }
  if (!env.CRON_SECRET) {
    return res.status(503).json({ success: false, message: "Scheduled maintenance is not configured." });
  }
  if (!isAuthorizedCronRequest(req.get("authorization"), env.CRON_SECRET)) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  try {
    const deleted = await cleanupExpiredPostgresRecords();
    return res.status(200).json({ success: true, deleted });
  } catch (error) {
    return next(error);
  }
});

export default router;

import { Router } from "express";
import {
  bulkAdminAction,
  createAdminVideo,
  duplicateAdminVideo,
  getAdminActivityLogs,
  getAdminAnalytics,
  getAdminSettings,
  getAdminVideoById,
  getAdminVideos,
  getPublicSettings,
  getPublicVideoBySlug,
  getPublicVideos,
  permanentDeleteAdminVideo,
  reorderAdminVideos,
  restoreAdminVideo,
  softDeleteAdminVideo,
  toggleAdminFeatured,
  toggleAdminStatus,
  trackComplete,
  trackCtaClick,
  trackImpression,
  trackPlay,
  updateAdminSettings,
  updateAdminVideo
} from "../controllers/videoShowcase.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

export const publicVideoShowcaseRouter = Router();
export const adminVideoShowcaseRouter = Router();

// ----------------------------------------------------
// PUBLIC ROUTES
// ----------------------------------------------------
publicVideoShowcaseRouter.get("/", getPublicVideos);
publicVideoShowcaseRouter.get("/settings", getPublicSettings);
publicVideoShowcaseRouter.get("/:slug", getPublicVideoBySlug);
publicVideoShowcaseRouter.post("/:id/impression", trackImpression);
publicVideoShowcaseRouter.post("/:id/play", trackPlay);
publicVideoShowcaseRouter.post("/:id/complete", trackComplete);
publicVideoShowcaseRouter.post("/:id/cta-click", trackCtaClick);

// ----------------------------------------------------
// ADMIN ROUTES (Protected by authenticate)
// ----------------------------------------------------
adminVideoShowcaseRouter.use(authenticate);

adminVideoShowcaseRouter.get("/", getAdminVideos);
adminVideoShowcaseRouter.post("/", createAdminVideo);

adminVideoShowcaseRouter.get("/settings", getAdminSettings);
adminVideoShowcaseRouter.put("/settings", updateAdminSettings);

adminVideoShowcaseRouter.get("/analytics", getAdminAnalytics);
adminVideoShowcaseRouter.get("/activity-logs", getAdminActivityLogs);

adminVideoShowcaseRouter.patch("/reorder", reorderAdminVideos);
adminVideoShowcaseRouter.post("/bulk-action", bulkAdminAction);

adminVideoShowcaseRouter.get("/:id", getAdminVideoById);
adminVideoShowcaseRouter.put("/:id", updateAdminVideo);
adminVideoShowcaseRouter.delete("/:id", softDeleteAdminVideo);
adminVideoShowcaseRouter.delete("/:id/permanent", requireRole("superadmin"), permanentDeleteAdminVideo);

adminVideoShowcaseRouter.patch("/:id/status", toggleAdminStatus);
adminVideoShowcaseRouter.patch("/:id/featured", toggleAdminFeatured);
adminVideoShowcaseRouter.post("/:id/duplicate", duplicateAdminVideo);
adminVideoShowcaseRouter.post("/:id/restore", restoreAdminVideo);

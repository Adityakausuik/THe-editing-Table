import { Router } from "express";
import {
  createAdminPhoto,
  duplicateAdminPhoto,
  getAdminAnalytics,
  getAdminLogs,
  getAdminPhotos,
  getAdminSettings,
  getPublicPhotoBySlug,
  getPublicPhotos,
  getPublicSettings,
  permanentDeleteAdminPhoto,
  reorderAdminPhotos,
  restoreAdminPhoto,
  softDeleteAdminPhoto,
  toggleAdminFeatured,
  toggleAdminStatus,
  updateAdminPhoto,
  updateAdminSettings
} from "../controllers/photoShowcase.controller.js";
import { authenticate } from "../middleware/auth.js";

export const publicPhotoShowcaseRouter = Router();
export const adminPhotoShowcaseRouter = Router();

publicPhotoShowcaseRouter.get("/", getPublicPhotos);
publicPhotoShowcaseRouter.get("/settings", getPublicSettings);
publicPhotoShowcaseRouter.get("/:slug", getPublicPhotoBySlug);

adminPhotoShowcaseRouter.use(authenticate);
adminPhotoShowcaseRouter.get("/", getAdminPhotos);
adminPhotoShowcaseRouter.post("/", createAdminPhoto);
adminPhotoShowcaseRouter.get("/settings", getAdminSettings);
adminPhotoShowcaseRouter.put("/settings", updateAdminSettings);
adminPhotoShowcaseRouter.get("/analytics", getAdminAnalytics);
adminPhotoShowcaseRouter.get("/logs", getAdminLogs);
adminPhotoShowcaseRouter.patch("/reorder", reorderAdminPhotos);
adminPhotoShowcaseRouter.post("/:id/duplicate", duplicateAdminPhoto);
adminPhotoShowcaseRouter.patch("/:id/restore", restoreAdminPhoto);
adminPhotoShowcaseRouter.delete("/:id/permanent", permanentDeleteAdminPhoto);
adminPhotoShowcaseRouter.put("/:id", updateAdminPhoto);
adminPhotoShowcaseRouter.delete("/:id", softDeleteAdminPhoto);
adminPhotoShowcaseRouter.patch("/:id/status", toggleAdminStatus);
adminPhotoShowcaseRouter.patch("/:id/featured", toggleAdminFeatured);

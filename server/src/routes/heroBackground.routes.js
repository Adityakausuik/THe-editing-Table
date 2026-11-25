import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  deleteHeroVersion,
  getActiveHeroVideo,
  getAdminHeroConfig,
  getHeroVersionHistory,
  publishHeroVideo,
  removeHeroDraftAsset,
  restoreHeroVersion,
  saveHeroDraft,
  unpublishHeroVideo,
  uploadDesktopVideoAsset,
  uploadMobileVideoAsset,
  uploadPosterAsset
} from "../controllers/heroBackground.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireMinimumRole } from "../middleware/rbac.js";
import { heroVideoUploadMiddleware } from "../middleware/heroVideoUpload.js";

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: {
    success: false,
    message: "Too many upload attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 1. Public Router
export const publicHeroVideoRouter = Router();
publicHeroVideoRouter.get("/active", getActiveHeroVideo);
publicHeroVideoRouter.get("/", getActiveHeroVideo);

// 2. Protected Admin Router
export const adminHeroVideoRouter = Router();

// Protect all admin endpoints with authentication and minimum role = admin
adminHeroVideoRouter.use(authenticate, requireMinimumRole("admin"));

// Configuration & overview
adminHeroVideoRouter.get("/", getAdminHeroConfig);
adminHeroVideoRouter.get("/config", getAdminHeroConfig);
adminHeroVideoRouter.get("/history", getHeroVersionHistory);

// Asset uploads
adminHeroVideoRouter.post(
  "/upload/desktop",
  uploadRateLimiter,
  heroVideoUploadMiddleware.single("video"),
  uploadDesktopVideoAsset
);

adminHeroVideoRouter.post(
  "/upload/mobile",
  uploadRateLimiter,
  heroVideoUploadMiddleware.single("video"),
  uploadMobileVideoAsset
);

adminHeroVideoRouter.post(
  "/upload/poster",
  uploadRateLimiter,
  heroVideoUploadMiddleware.single("poster"),
  uploadPosterAsset
);

// Draft & Publish lifecycle
adminHeroVideoRouter.post("/draft", saveHeroDraft);
adminHeroVideoRouter.put("/settings", saveHeroDraft);
adminHeroVideoRouter.post("/publish", publishHeroVideo);
adminHeroVideoRouter.post("/unpublish", unpublishHeroVideo);
adminHeroVideoRouter.post("/restore/:id", restoreHeroVersion);

// Asset & Version deletion
adminHeroVideoRouter.delete("/asset/:type", removeHeroDraftAsset);
adminHeroVideoRouter.delete("/:id", deleteHeroVersion);

import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  approveReview,
  bulkReviewAction,
  deleteReview,
  exportReviewsCsv,
  getAdminReviewById,
  getAdminReviews,
  getAdminReviewStats,
  getFeaturedReviews,
  getPublicReviews,
  rejectReview,
  replyToReview,
  submitReview,
  toggleFeatureReview,
  toggleVerifyReview,
  updateAdminReview
} from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireMinimumRole } from "../middleware/rbac.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { uploadPublicReviewImage } from "../controllers/upload.controller.js";

const router = Router();
const publicReviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Review submission limit reached. Please try again later.", data: null }
});

// PUBLIC ENDPOINTS
router.post("/upload", publicReviewLimiter, uploadMiddleware.single("file"), asyncHandler(uploadPublicReviewImage));
router.post("/", publicReviewLimiter, asyncHandler(submitReview));
router.get("/", asyncHandler(getPublicReviews));
router.get("/featured", asyncHandler(getFeaturedReviews));

// ADMIN SPECIFIC ENDPOINTS (Must precede generic parameter routes)
router.get("/admin/stats", authenticate, asyncHandler(getAdminReviewStats));
router.get("/admin/export-csv", authenticate, asyncHandler(exportReviewsCsv));
router.post("/admin/bulk-action", authenticate, requireMinimumRole("editor"), asyncHandler(bulkReviewAction));
router.get("/admin", authenticate, asyncHandler(getAdminReviews));

// ADMIN GENERIC PARAMETER ENDPOINTS
router.get("/admin/:id", authenticate, asyncHandler(getAdminReviewById));
router.patch("/admin/:id/approve", authenticate, requireMinimumRole("editor"), asyncHandler(approveReview));
router.patch("/admin/:id/reject", authenticate, requireMinimumRole("editor"), asyncHandler(rejectReview));
router.patch("/admin/:id/feature", authenticate, requireMinimumRole("editor"), asyncHandler(toggleFeatureReview));
router.patch("/admin/:id/verify", authenticate, requireMinimumRole("editor"), asyncHandler(toggleVerifyReview));
router.patch("/admin/:id/reply", authenticate, requireMinimumRole("editor"), asyncHandler(replyToReview));
router.patch("/admin/:id", authenticate, requireMinimumRole("editor"), asyncHandler(updateAdminReview));
router.delete("/admin/:id", authenticate, requireMinimumRole("editor"), asyncHandler(deleteReview));

export default router;

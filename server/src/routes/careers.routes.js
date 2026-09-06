import { Router } from "express";
import {
  createJob,
  deleteApplication,
  deleteJob,
  duplicateJob,
  getAdminApplications,
  getAdminJobs,
  getApplicationById,
  getCareersContent,
  getCareersStats,
  getPublicJobById,
  getPublicJobs,
  submitApplication,
  toggleJobStatus,
  updateApplicationNotes,
  updateApplicationStatus,
  updateCareersContent,
  updateJob
} from "../controllers/careers.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { resumeUploadMiddleware } from "../middleware/careersUpload.js";
import { requireMinimumRole } from "../middleware/rbac.js";

const router = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get("/jobs", asyncHandler(getPublicJobs));
router.get("/jobs/:id", asyncHandler(getPublicJobById));
router.get("/content", asyncHandler(getCareersContent));
router.post("/apply", resumeUploadMiddleware.single("resume"), asyncHandler(submitApplication));

// ==========================================
// ADMIN ROUTES (PROTECTED)
// ==========================================
const adminAuth = [authenticate, requireMinimumRole("editor")];

// Careers Overview Stats
router.get("/admin/stats", adminAuth, asyncHandler(getCareersStats));

// Job Vacancy Management
router.get("/admin/jobs", adminAuth, asyncHandler(getAdminJobs));
router.post("/admin/jobs", adminAuth, asyncHandler(createJob));
router.put("/admin/jobs/:id", adminAuth, asyncHandler(updateJob));
router.patch("/admin/jobs/:id", adminAuth, asyncHandler(updateJob));
router.delete("/admin/jobs/:id", adminAuth, asyncHandler(deleteJob));
router.patch("/admin/jobs/:id/status", adminAuth, asyncHandler(toggleJobStatus));
router.post("/admin/jobs/:id/duplicate", adminAuth, asyncHandler(duplicateJob));

// Application Management
router.get("/admin/applications", adminAuth, asyncHandler(getAdminApplications));
router.get("/admin/applications/:id", adminAuth, asyncHandler(getApplicationById));
router.patch("/admin/applications/:id/status", adminAuth, asyncHandler(updateApplicationStatus));
router.patch("/admin/applications/:id/notes", adminAuth, asyncHandler(updateApplicationNotes));
router.delete("/admin/applications/:id", adminAuth, asyncHandler(deleteApplication));

// Static Content Management
router.get("/admin/content", adminAuth, asyncHandler(getCareersContent));
router.put("/admin/content", adminAuth, asyncHandler(updateCareersContent));

export default router;

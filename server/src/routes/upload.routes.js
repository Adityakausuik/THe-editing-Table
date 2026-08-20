import { Router } from "express";
import { uploadSingleMedia, uploadMultipleMedia } from "../controllers/upload.controller.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { authenticate } from "../middleware/auth.js";
import { requireMinimumRole } from "../middleware/rbac.js";

const router = Router();

router.post("/single", authenticate, requireMinimumRole("editor"), uploadMiddleware.single("file"), uploadSingleMedia);
router.post("/multiple", authenticate, requireMinimumRole("editor"), uploadMiddleware.array("files", 10), uploadMultipleMedia);

export default router;

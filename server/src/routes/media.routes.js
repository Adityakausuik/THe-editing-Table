import { Router } from "express";
import { uploadMedia, getMediaFiles, deleteMedia } from "../controllers/media.controller.js";
import { authenticate } from "../middleware/auth.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { requireMinimumRole } from "../middleware/rbac.js";

const router = Router();

router.get("/", authenticate, getMediaFiles);
router.post("/upload", authenticate, requireMinimumRole("editor"), uploadMiddleware.single("file"), uploadMedia);
router.delete("/:id", authenticate, requireMinimumRole("editor"), deleteMedia);

export default router;

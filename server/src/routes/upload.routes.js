import { Router } from "express";
import {
  abortChunkedUpload,
  beginChunkedUpload,
  finishChunkedUpload,
  uploadChunk,
  uploadMultipleMedia,
  uploadSingleMedia
} from "../controllers/upload.controller.js";
import { uploadChunkMiddleware, uploadMiddleware } from "../middleware/upload.js";
import { authenticate } from "../middleware/auth.js";
import { requireMinimumRole } from "../middleware/rbac.js";

const router = Router();

router.post("/chunked/start", authenticate, requireMinimumRole("editor"), beginChunkedUpload);
router.post("/chunked/part", authenticate, requireMinimumRole("editor"), uploadChunkMiddleware.single("chunk"), uploadChunk);
router.post("/chunked/finish", authenticate, requireMinimumRole("editor"), finishChunkedUpload);
router.post("/chunked/abort", authenticate, requireMinimumRole("editor"), abortChunkedUpload);

router.post("/single", authenticate, requireMinimumRole("editor"), uploadMiddleware.single("file"), uploadSingleMedia);
router.post("/multiple", authenticate, requireMinimumRole("editor"), uploadMiddleware.array("files", 10), uploadMultipleMedia);

export default router;

import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { processAndSaveFile, UPLOAD_CHUNK_SIZE, validateUploadMetadata } from "../middleware/upload.js";
import Media from "../models/Media.model.js";
import { ALLOWED_MODULE_FOLDERS, safeDeleteFile } from "../utils/fileUtils.js";
import { cleanupExpiredUploadParts, deleteUploadParts, readUploadParts, saveUploadPart } from "../utils/gridfs.js";
import { randomUUID } from "node:crypto";

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function requireDb(res) {
  if (isDbConnected()) return true;
  try {
    await connectDatabase();
    if (isDbConnected()) return true;
  } catch (err) {
    console.warn("[upload:requireDb] Auto-connect attempt failed:", err.message);
  }
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. Media cannot be uploaded.",
    data: null
  });
  return false;
}

export async function uploadSingleMedia(req, res, next) {
  try {
    if (!await requireDb(res)) return;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided for upload.", data: null });
    }

    const folder = req.body.folder || req.query.folder || "general";
    const saved = await processAndSaveFile(req.file, folder);

    try {
      await Media.create({
        filename: saved.filename,
        originalName: req.file.originalname,
        mimeType: saved.mimeType,
        size: saved.size,
        url: saved.url,
        path: saved.path,
        category: folder,
        altText: req.body.altText || req.file.originalname,
        uploadedBy: req.user?.id
      });
    } catch (dbErr) {
      safeDeleteFile(saved.url);
      throw dbErr;
    }

    return res.status(201).json({
      success: true,
      message: "File uploaded and processed successfully",
      data: saved
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadMultipleMedia(req, res, next) {
  try {
    if (!await requireDb(res)) return;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files provided for upload.", data: null });
    }

    const folder = req.body.folder || req.query.folder || "general";
    const savedResults = [];

    try {
      for (const file of req.files) {
        const saved = await processAndSaveFile(file, folder);
        savedResults.push({ saved, file });
      }

      await Media.insertMany(
        savedResults.map(({ saved, file }) => ({
          filename: saved.filename,
          originalName: file.originalname,
          mimeType: saved.mimeType,
          size: saved.size,
          url: saved.url,
          path: saved.path,
          category: folder,
          altText: file.originalname,
          uploadedBy: req.user?.id
        }))
      );
    } catch (error) {
      savedResults.forEach(({ saved }) => safeDeleteFile(saved.url));
      throw error;
    }

    const responseData = savedResults.map(({ saved }) => saved);

    return res.status(201).json({
      success: true,
      message: `${responseData.length} files uploaded and processed successfully`,
      data: responseData
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadPublicReviewImage(req, res, next) {
  if (req.file && !req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({
      success: false,
      message: "Review attachments must be images.",
      data: null
    });
  }
  req.body.folder = "reviews";
  return uploadSingleMedia(req, res, next);
}

export async function beginChunkedUpload(req, res) {
  try {
    if (!await requireDb(res)) return;
    await cleanupExpiredUploadParts().catch((error) => {
      console.warn("[upload] Expired temporary upload cleanup failed:", error.message);
    });
    const { size } = validateUploadMetadata(req.body || {});
    const folder = req.body.folder || "general";
    if (!ALLOWED_MODULE_FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: "Invalid upload folder.", data: null });
    }
    return res.status(201).json({
      success: true,
      message: "Upload session created.",
      data: { uploadId: randomUUID().replace(/-/g, ""), chunkSize: UPLOAD_CHUNK_SIZE, size }
    });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message, data: null });
  }
}

export async function uploadChunk(req, res, next) {
  try {
    if (!await requireDb(res)) return;
    const { uploadId, index, count } = req.body || {};
    const chunkIndex = Number(index);
    const chunkCount = Number(count);
    if (!/^[a-f0-9]{32}$/.test(String(uploadId || "")) || !Number.isInteger(chunkIndex) ||
        !Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > 20 ||
        chunkIndex < 0 || chunkIndex >= chunkCount || !req.file) {
      return res.status(400).json({ success: false, message: "Invalid upload chunk.", data: null });
    }
    await saveUploadPart(uploadId, chunkIndex, req.file.buffer);
    return res.status(200).json({ success: true, message: "Upload chunk stored.", data: { index: chunkIndex } });
  } catch (error) {
    next(error);
  }
}

export async function finishChunkedUpload(req, res, next) {
  const uploadId = String(req.body?.uploadId || "");
  if (!/^[a-f0-9]{32}$/.test(uploadId)) {
    return res.status(400).json({ success: false, message: "Invalid upload session.", data: null });
  }
  try {
    if (!await requireDb(res)) return;
    const { mimeType, originalName, size, folder = "general" } = req.body || {};
    const validation = validateUploadMetadata({ mimeType, size });
    if (!ALLOWED_MODULE_FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: "Invalid upload folder.", data: null });
    }
    const chunkCount = Math.ceil(validation.size / UPLOAD_CHUNK_SIZE);
    const buffer = await readUploadParts(uploadId, chunkCount, validation.size);
    const safeOriginalName = String(originalName || "upload").slice(0, 240);
    const file = { originalname: safeOriginalName, mimetype: mimeType, size: buffer.length, buffer };
    const saved = await processAndSaveFile(file, folder);
    try {
      await Media.create({
        filename: saved.filename,
        originalName: safeOriginalName,
        mimeType: saved.mimeType,
        size: saved.size,
        url: saved.url,
        path: saved.path,
        category: folder,
        altText: safeOriginalName,
        uploadedBy: req.user?.id
      });
    } catch (dbErr) {
      safeDeleteFile(saved.url);
      throw dbErr;
    }
    console.info(`[upload] Completed ${validation.isVideo ? "video" : "image"} upload`, {
      requestId: req.get("x-vercel-id") || undefined,
      size: validation.size,
      folder
    });
    return res.status(201).json({ success: true, message: "File uploaded and processed successfully.", data: saved });
  } catch (error) {
    next(error);
  } finally {
    await deleteUploadParts(uploadId).catch((error) => {
      console.warn("[upload] Temporary chunk cleanup failed:", error.message);
    });
  }
}

export async function abortChunkedUpload(req, res, next) {
  try {
    if (!await requireDb(res)) return;
    const { uploadId } = req.body || {};
    if (!/^[a-f0-9]{32}$/.test(String(uploadId || ""))) {
      return res.status(400).json({ success: false, message: "Invalid upload session.", data: null });
    }
    await deleteUploadParts(uploadId);
    return res.status(200).json({ success: true, message: "Incomplete upload removed.", data: null });
  } catch (error) {
    next(error);
  }
}

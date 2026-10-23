import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { processAndSaveFile, UPLOAD_CHUNK_SIZE, validateUploadMetadata } from "../middleware/upload.js";
import Media from "../models/Media.model.js";
import { ALLOWED_MODULE_FOLDERS, safeDeleteFile } from "../utils/fileUtils.js";
import { cleanupExpiredUploadParts, deleteUploadParts, readUploadParts, saveUploadPart } from "../utils/gridfs.js";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import {
  buildPostgresMediaUploadPartCount,
  createPostgresMediaUploadSession,
  deletePostgresMediaUploadSession,
  readPostgresMediaUpload,
  savePostgresMediaUploadPart
} from "../db/mediaUploadRepository.js";
import { createPostgresMediaRecord, createPostgresMediaRecords } from "../db/mediaRepository.js";
import { isPostgresSelected } from "../config/databaseMode.js";

function usesPostgres() {
  return isPostgresSelected();
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function requireDb(res) {
  if (usesPostgres()) return true;
  if (env.VERCEL_ENV === "preview") {
    res.status(503).json({ success: false, message: "Preview database is not configured.", data: null });
    return false;
  }
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
      const payload = {
        filename: saved.filename,
        originalName: req.file.originalname,
        mimeType: saved.mimeType,
        size: saved.size,
        url: saved.url,
        path: saved.path,
        category: folder,
        altText: req.body.altText || req.file.originalname,
        uploadedBy: req.user?.id
      };
      const media = usesPostgres()
        ? await createPostgresMediaRecord(Media, payload)
        : await Media.create(payload);
      Object.assign(saved, media.toObject?.() || media);
    } catch (dbErr) {
      safeDeleteFile(saved.url, { allowPostgresBlobDeletion: true });
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

      const payloads = savedResults.map(({ saved, file }) => ({
          filename: saved.filename,
          originalName: file.originalname,
          mimeType: saved.mimeType,
          size: saved.size,
          url: saved.url,
          path: saved.path,
          category: folder,
          altText: file.originalname,
          uploadedBy: req.user?.id
      }));
      const mediaRecords = usesPostgres()
        ? await createPostgresMediaRecords(Media, payloads)
        : await Media.insertMany(payloads);
      savedResults.forEach(({ saved }, index) => Object.assign(saved, mediaRecords[index].toObject?.() || mediaRecords[index]));
    } catch (error) {
      if (!usesPostgres() && savedResults.length) {
        await Media.deleteMany({ url: { $in: savedResults.map(({ saved }) => saved.url) } }).catch((cleanupError) => {
          console.warn("[upload] Partial media metadata rollback failed:", cleanupError.message);
        });
      }
      savedResults.forEach(({ saved }) => safeDeleteFile(saved.url, { allowPostgresBlobDeletion: true }));
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
    if (!usesPostgres()) await cleanupExpiredUploadParts().catch((error) => {
      console.warn("[upload] Expired temporary upload cleanup failed:", error.message);
    });
    const { size } = validateUploadMetadata(req.body || {});
    const folder = req.body.folder || "general";
    if (!ALLOWED_MODULE_FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: "Invalid upload folder.", data: null });
    }
    const uploadId = randomUUID().replace(/-/g, "");
    if (usesPostgres()) {
      const partCount = buildPostgresMediaUploadPartCount(size, UPLOAD_CHUNK_SIZE);
      await createPostgresMediaUploadSession({ uploadId, userId: req.user?.id, folder, mimeType: req.body.mimeType, totalSize: size, partCount });
    }
    return res.status(201).json({
      success: true,
      message: "Upload session created.",
      data: { uploadId, chunkSize: UPLOAD_CHUNK_SIZE, size }
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
    if (usesPostgres()) await savePostgresMediaUploadPart({ uploadId, userId: req.user?.id, index: chunkIndex, count: chunkCount, buffer: req.file.buffer });
    else await saveUploadPart(uploadId, chunkIndex, req.file.buffer);
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
    let buffer;
    if (usesPostgres()) {
      const upload = await readPostgresMediaUpload({ uploadId, userId: req.user?.id });
      if (upload.folder !== folder || upload.mime_type !== mimeType || Number(upload.total_size) !== validation.size || Number(upload.part_count) !== chunkCount) {
        const error = new Error("Upload metadata does not match the started upload session.");
        error.status = 400;
        throw error;
      }
      buffer = upload.buffer;
    } else buffer = await readUploadParts(uploadId, chunkCount, validation.size);
    const safeOriginalName = String(originalName || "upload").slice(0, 240);
    const file = { originalname: safeOriginalName, mimetype: mimeType, size: buffer.length, buffer };
    const saved = await processAndSaveFile(file, folder);
    try {
      const payload = {
        filename: saved.filename,
        originalName: safeOriginalName,
        mimeType: saved.mimeType,
        size: saved.size,
        url: saved.url,
        path: saved.path,
        category: folder,
        altText: safeOriginalName,
        uploadedBy: req.user?.id
      };
      const media = usesPostgres()
        ? await createPostgresMediaRecord(Media, payload)
        : await Media.create(payload);
      Object.assign(saved, media.toObject?.() || media);
    } catch (dbErr) {
      safeDeleteFile(saved.url, { allowPostgresBlobDeletion: true });
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
    const cleanup = usesPostgres()
      ? deletePostgresMediaUploadSession(uploadId, req.user?.id)
      : deleteUploadParts(uploadId);
    await cleanup.catch((error) => {
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
    if (usesPostgres()) await deletePostgresMediaUploadSession(uploadId, req.user?.id);
    else await deleteUploadParts(uploadId);
    return res.status(200).json({ success: true, message: "Incomplete upload removed.", data: null });
  } catch (error) {
    next(error);
  }
}

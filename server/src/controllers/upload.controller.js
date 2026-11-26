import { normalizeMimeType, processAndSaveFile, UPLOAD_CHUNK_SIZE, validateUploadMetadata } from "../middleware/upload.js";
import Media from "../models/Media.model.js";
import { ALLOWED_MODULE_FOLDERS, safeDeleteFile } from "../utils/fileUtils.js";
import { randomUUID } from "node:crypto";
import {
  buildPostgresMediaUploadPartCount,
  createPostgresMediaUploadSession,
  deletePostgresMediaUploadSession,
  savePostgresMediaUploadPart
} from "../db/mediaUploadRepository.js";
import { createPostgresMediaRecord, createPostgresMediaRecords } from "../db/mediaRepository.js";
import { commitChunkedUploadToNeon, saveMediaBufferToNeon } from "../db/neonMediaStorage.js";

export async function uploadSingleMedia(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided for upload.", data: null });
    }

    const folder = req.body.folder || req.query.folder || "general";

    const saved = await saveMediaBufferToNeon({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder,
      uploadedBy: req.user?.id,
      altText: req.body.altText || req.file.originalname
    });
    return res.status(201).json({
      success: true,
      message: "File uploaded and stored in Neon PostgreSQL successfully.",
      data: saved
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadMultipleMedia(req, res, next) {
  try {
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
      const mediaRecords = await createPostgresMediaRecords(Media, payloads);
      savedResults.forEach(({ saved }, index) => Object.assign(saved, mediaRecords[index].toObject?.() || mediaRecords[index]));
    } catch (error) {
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
    const { size, mimeType: validatedMime } = validateUploadMetadata(req.body || {});
    const folder = req.body.folder || "general";
    if (!ALLOWED_MODULE_FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: "Invalid upload folder.", data: null });
    }
    const uploadId = randomUUID().replace(/-/g, "");
    const partCount = buildPostgresMediaUploadPartCount(size, UPLOAD_CHUNK_SIZE);
    await createPostgresMediaUploadSession({ uploadId, userId: req.user?.id, folder, mimeType: validatedMime, totalSize: size, partCount });

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
    const { uploadId, index, count } = req.body || {};
    const chunkIndex = Number(index);
    const chunkCount = Number(count);
    if (!/^[a-f0-9]{32}$/.test(String(uploadId || "")) || !Number.isInteger(chunkIndex) ||
        !Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > 50000 ||
        chunkIndex < 0 || chunkIndex >= chunkCount || !req.file) {
      return res.status(400).json({ success: false, message: "Invalid upload chunk.", data: null });
    }
    await savePostgresMediaUploadPart({ uploadId, userId: req.user?.id, index: chunkIndex, count: chunkCount, buffer: req.file.buffer });
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
    const { mimeType, originalName, size, folder = "general" } = req.body || {};
    const validation = validateUploadMetadata({ mimeType, size, originalName });
    if (!ALLOWED_MODULE_FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: "Invalid upload folder.", data: null });
    }

    const safeOriginalName = String(originalName || "upload").slice(0, 240);

    const saved = await commitChunkedUploadToNeon({
      uploadId,
      userId: req.user?.id,
      folder,
      originalName: safeOriginalName,
      mimeType: validation.mimeType,
      size: validation.size,
      altText: safeOriginalName
    });

    console.info(`[upload] Stored ${validation.isVideo ? "video" : "image"} in Neon PostgreSQL`, {
      id: saved._id,
      size: validation.size,
      folder
    });
    return res.status(201).json({
      success: true,
      message: "File uploaded and stored in Neon PostgreSQL successfully.",
      data: saved
    });
  } catch (error) {
    next(error);
  } finally {
    await deletePostgresMediaUploadSession(uploadId, req.user?.id).catch((error) => {
      console.warn("[upload] Temporary chunk cleanup failed:", error.message);
    });
  }
}

export async function abortChunkedUpload(req, res, next) {
  try {
    const { uploadId } = req.body || {};
    if (!/^[a-f0-9]{32}$/.test(String(uploadId || ""))) {
      return res.status(400).json({ success: false, message: "Invalid upload session.", data: null });
    }
    await deletePostgresMediaUploadSession(uploadId, req.user?.id);
    return res.status(200).json({ success: true, message: "Incomplete upload removed.", data: null });
  } catch (error) {
    next(error);
  }
}

export async function getUploadConfig(req, res) {
  return res.json({
    success: true,
    data: {
      storageBackend: "neon-postgres",
      chunkSize: UPLOAD_CHUNK_SIZE,
      allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      allowedVideoTypes: ["video/mp4", "video/quicktime", "video/webm"]
    }
  });
}

export async function generateBlobClientToken(req, res) {
  return res.status(410).json({
    success: false,
    message: "Direct Vercel Blob tokens are deprecated. Media is uploaded directly to Neon PostgreSQL chunked storage.",
    code: "BLOB_STORAGE_DEPRECATED"
  });
}

export async function recordUploadedMedia(req, res, next) {
  try {
    const { url, filename, originalName, mimeType, size, folder = "general" } = req.body || {};
    if (!url || !filename) {
      return res.status(400).json({ success: false, message: "Missing required media details." });
    }
    const safeOriginalName = String(originalName || filename).slice(0, 240);
    const normalizedMime = normalizeMimeType(mimeType, safeOriginalName);
    const payload = {
      filename,
      originalName: safeOriginalName,
      mimeType: normalizedMime,
      size: Number(size) || 0,
      url,
      path: `${folder}/${filename}`,
      category: folder,
      altText: safeOriginalName,
      checksum: req.body?.checksum || "",
      width: req.body?.width || null,
      height: req.body?.height || null,
      duration: req.body?.duration || null,
      uploadStatus: "completed",
      totalChunks: req.body?.totalChunks || 1,
      isVideo: req.body?.isVideo !== undefined ? Boolean(req.body.isVideo) : normalizedMime.startsWith("video/"),
      uploadedBy: req.user?.id
    };
    const media = await createPostgresMediaRecord(Media, payload);
    return res.status(201).json({
      success: true,
      message: "Media metadata recorded successfully.",
      data: { ...payload, ...(media.toObject?.() || media) }
    });
  } catch (error) {
    next(error);
  }
}

import mongoose from "mongoose";
import { processAndSaveFile } from "../middleware/upload.js";
import Media from "../models/Media.model.js";
import { safeDeleteFile } from "../utils/fileUtils.js";

function requireDb(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. Media cannot be uploaded.",
    data: null
  });
  return false;
}

export async function uploadSingleMedia(req, res, next) {
  try {
    if (!requireDb(res)) return;
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
    if (!requireDb(res)) return;
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

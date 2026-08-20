import mongoose from "mongoose";
import { processAndSaveFile } from "../middleware/upload.js";
import Media from "../models/Media.model.js";
import { safeDeleteFile } from "../utils/fileUtils.js";
import { isMediaReferenced } from "../utils/mediaCleanup.js";

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDb(res) {
  if (isDbConnected()) return true;
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. Media changes were not saved.",
    data: null
  });
  return false;
}

export async function uploadMedia(req, res, next) {
  try {
    if (!requireDb(res)) return;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded", data: null });
    }

    const { category, altText } = req.body;
    const saved = await processAndSaveFile(req.file, category || "general");

    let media;
    try {
      media = await Media.create({
        filename: saved.filename,
        originalName: req.file.originalname,
        mimeType: saved.mimeType,
        size: saved.size,
        url: saved.url,
        path: saved.path,
        category: category || "general",
        altText: altText || req.file.originalname,
        uploadedBy: req.user?.id
      });
    } catch (error) {
      safeDeleteFile(saved.url);
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Media file uploaded successfully",
      data: media
    });
  } catch (err) {
    next(err);
  }
}

export async function getMediaFiles(req, res, next) {
  try {
    if (!requireDb(res)) return;
    const { category, search } = req.query;
    const query = {};

    if (category && category !== "All") query.category = category;
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: "i" } },
        { altText: { $regex: search, $options: "i" } }
      ];
    }

    const mediaList = await Media.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, message: "Media files retrieved successfully", data: mediaList });
  } catch (err) {
    next(err);
  }
}

export async function deleteMedia(req, res, next) {
  try {
    if (!requireDb(res)) return;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID", data: null });
    }

    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Media file not found", data: null });
    if (await isMediaReferenced(media.url)) {
      return res.status(409).json({
        success: false,
        message: "This media file is still used by published or CMS content.",
        data: null
      });
    }

    await Media.findByIdAndDelete(req.params.id);
    safeDeleteFile(media.url);
    return res.json({ success: true, message: "Media file deleted successfully", data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}

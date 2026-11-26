import { isValidId } from "../utils/ids.js";
import { processAndSaveFile } from "../middleware/upload.js";
import Media from "../models/Media.model.js";
import { safeDeleteFile } from "../utils/fileUtils.js";
import { createPostgresMediaRecord, deletePostgresMediaRecord, isPostgresMediaReferenced, listPostgresMediaRecords } from "../db/mediaRepository.js";
import { getPostgresCmsRecord } from "../db/cmsRepository.js";

export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded", data: null });
    }

    const { category, altText } = req.body;
    const saved = await processAndSaveFile(req.file, category || "general");

    let media;
    try {
      const payload = {
        filename: saved.filename,
        originalName: req.file.originalname,
        mimeType: saved.mimeType,
        size: saved.size,
        url: saved.url,
        path: saved.path,
        category: category || "general",
        altText: altText || req.file.originalname,
        uploadedBy: req.user?.id
      };
      media = await createPostgresMediaRecord(Media, payload);
    } catch (error) {
      safeDeleteFile(saved.url, { allowPostgresBlobDeletion: true });
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
    const { category, search } = req.query;
    const mediaList = await listPostgresMediaRecords(Media, { category, search });
    return res.json({ success: true, message: "Media files retrieved successfully", data: mediaList });
  } catch (err) {
    next(err);
  }
}

export async function deleteMedia(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID", data: null });
    }

    const media = await getPostgresCmsRecord(Media, req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Media file not found", data: null });
    if (await isPostgresMediaReferenced(media.url)) {
      return res.status(409).json({
        success: false,
        message: "This media file is still used by published or CMS content.",
        data: null
      });
    }

    await deletePostgresMediaRecord(Media, req.params.id);
    safeDeleteFile(media.url);
    return res.json({ success: true, message: "Media file deleted successfully", data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}

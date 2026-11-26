import fs from "fs";
import path from "path";
import multer from "multer";
import { ensureUploadDirectories, resolveUploadsDirectory, sanitizeFilename } from "../utils/fileUtils.js";
import { isPostgresSelected } from "../config/databaseMode.js";
import { saveMediaBufferToNeon } from "../db/neonMediaStorage.js";

import { normalizeMimeType } from "./upload.js";

// Generous headroom to eliminate artificial Multer 'File too large' rejections
export const MAX_HERO_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_HERO_POSTER_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif"
]);

const memoryStorage = multer.memoryStorage();

export const heroVideoUploadMiddleware = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_HERO_VIDEO_SIZE },
  fileFilter: (req, file, cb) => {
    const normalized = normalizeMimeType(file.mimetype, file.originalname);
    const isVideo = ALLOWED_VIDEO_MIMES.has(normalized);
    const isImage = ALLOWED_IMAGE_MIMES.has(normalized);
    if (!isVideo && !isImage) {
      const err = new Error("Unsupported file format. Permitted formats: MP4, MOV, WebM for video; JPG, PNG, WEBP, GIF for poster.");
      err.status = 415;
      return cb(err, false);
    }
    file.mimetype = normalized;
    cb(null, true);
  }
});

/**
 * Validate magic bytes / file signatures to prevent spoofed file extensions.
 */
export function validateFileSignature(buffer, mimetype, originalname) {
  if (!buffer || buffer.length < 12) {
    const err = new Error("Corrupted or empty file.");
    err.status = 400;
    throw err;
  }

  const ext = path.extname(originalname || "").toLowerCase();

  // 1. MP4 & MOV (QuickTime)
  if (mimetype === "video/mp4" || ext === ".mp4" || mimetype === "video/quicktime" || ext === ".mov") {
    const headerStr = buffer.subarray(0, 64).toString("latin1");
    const isIsoMedia = headerStr.includes("ftyp") || headerStr.includes("moov") || headerStr.includes("mdat") || headerStr.includes("wide") || headerStr.includes("free") || headerStr.includes("qt  ");
    if (!isIsoMedia) {
      const err = new Error("Invalid MP4/MOV file: missing media box signature.");
      err.status = 400;
      throw err;
    }
    return { isVideo: true, format: ext === ".mov" || mimetype === "video/quicktime" ? "mov" : "mp4" };
  }

  // 2. WebM (EBML header starts with 0x1A 0x45 0xDF 0xA3)
  if (mimetype === "video/webm" || ext === ".webm") {
    const isEbml = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    const headerStr = buffer.subarray(0, 64).toString("latin1");
    if (!isEbml && !headerStr.includes("webm")) {
      const err = new Error("Invalid WebM file: missing EBML/WebM signature.");
      err.status = 400;
      throw err;
    }
    return { isVideo: true, format: "webm" };
  }

  // 3. JPEG (0xFF 0xD8 0xFF)
  if (mimetype === "image/jpeg" || ext === ".jpg" || ext === ".jpeg") {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      const err = new Error("Invalid JPEG image signature.");
      err.status = 400;
      throw err;
    }
    return { isVideo: false, format: "jpeg" };
  }

  // 4. PNG (0x89 0x50 0x4E 0x47)
  if (mimetype === "image/png" || ext === ".png") {
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      const err = new Error("Invalid PNG image signature.");
      err.status = 400;
      throw err;
    }
    return { isVideo: false, format: "png" };
  }

  // 5. WEBP (Starts with RIFF, contains WEBP at byte 8-12)
  if (mimetype === "image/webp" || ext === ".webp") {
    const riff = buffer.subarray(0, 4).toString("latin1");
    const webp = buffer.subarray(8, 12).toString("latin1");
    if (riff !== "RIFF" || webp !== "WEBP") {
      const err = new Error("Invalid WEBP image signature.");
      err.status = 400;
      throw err;
    }
    return { isVideo: false, format: "webp" };
  }

  // 6. GIF (GIF87a or GIF89a: 0x47 0x49 0x46 0x38)
  if (mimetype === "image/gif" || ext === ".gif") {
    const gifHeader = buffer.subarray(0, 6).toString("latin1");
    if (!gifHeader.startsWith("GIF87a") && !gifHeader.startsWith("GIF89a")) {
      const err = new Error("Invalid GIF image signature.");
      err.status = 400;
      throw err;
    }
    return { isVideo: false, format: "gif" };
  }

  const err = new Error(`Unsupported media signature for type ${mimetype}`);
  err.status = 415;
  throw err;
}

/**
 * Upload and save hero video or poster asset.
 */
export async function saveHeroAsset(file, assetType = "desktop") {
  if (!file || !file.buffer) {
    const err = new Error("No file uploaded.");
    err.status = 400;
    throw err;
  }

  if (isVideoExpected && !isVideo) {
    const err = new Error(`Asset type '${assetType}' requires an MP4, MOV, or WebM video file.`);
    err.status = 400;
    throw err;
  }

  if (!isVideoExpected && isVideo) {
    const err = new Error("Poster fallback asset must be an image file (JPG, PNG, or WEBP).");
    err.status = 400;
    throw err;
  }

  const folder = `hero/${assetType}`;
  const { cleanName, uniqueSuffix, ext } = sanitizeFilename(file.originalname);
  const fileExt = ext || (format === "jpeg" ? ".jpg" : `.${format}`);
  const finalFilename = `${cleanName}-${uniqueSuffix}${fileExt}`;

  if (isPostgresSelected()) {
    const saved = await saveMediaBufferToNeon({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder,
      altText: `${assetType} hero asset`
    });
    return {
      url: saved.url,
      pathname: saved.path,
      filename: saved.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: saved.size,
      isVideo,
      format,
      storageType: "neon-postgres"
    };
  }

  // Local storage fallback
  ensureUploadDirectories();
  const targetDir = path.join(resolveUploadsDirectory(), folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const localFilePath = path.join(targetDir, finalFilename);
  fs.writeFileSync(localFilePath, file.buffer);

  const publicUrl = `/uploads/${folder}/${finalFilename}`;
  return {
    url: publicUrl,
    pathname: `${folder}/${finalFilename}`,
    filename: finalFilename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    isVideo,
    format,
    storageType: "local"
  };
}

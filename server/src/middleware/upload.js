import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { ALLOWED_MODULE_FOLDERS, ensureUploadDirectories, isServerlessEnvironment, resolveUploadsDirectory, sanitizeFilename } from "../utils/fileUtils.js";
import { isPostgresSelected } from "../config/databaseMode.js";
import { saveMediaBufferToNeon } from "../db/neonMediaStorage.js";

export const UPLOAD_CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunk target for reliable serverless transit

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif"
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm"
]);

/**
 * Normalizes varied and browser-specific MIME types and file extensions to standard MIME strings.
 */
export function normalizeMimeType(rawMime, filename = "") {
  const mime = String(rawMime || "").toLowerCase().trim().split(";")[0].trim();
  const ext = path.extname(filename || "").toLowerCase();

  if (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/pjpeg" ||
    ext === ".jpg" ||
    ext === ".jpeg"
  ) {
    return "image/jpeg";
  }
  if (mime === "image/png" || mime === "image/x-png" || ext === ".png") {
    return "image/png";
  }
  if (mime === "image/webp" || ext === ".webp") {
    return "image/webp";
  }
  if (mime === "image/gif" || ext === ".gif") {
    return "image/gif";
  }
  if (mime === "video/mp4" || mime === "video/m4v" || ext === ".mp4" || ext === ".m4v") {
    return "video/mp4";
  }
  if (mime === "video/quicktime" || mime === "video/mov" || mime === "video/x-quicktime" || ext === ".mov") {
    return "video/quicktime";
  }
  if (mime === "video/webm" || mime === "video/x-matroska" || ext === ".webm") {
    return "video/webm";
  }

  if (ALLOWED_IMAGE_TYPES.has(mime) || ALLOWED_VIDEO_TYPES.has(mime)) {
    return mime;
  }

  return mime || "application/octet-stream";
}

// Memory storage for Sharp buffer processing
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const normalizedMime = normalizeMimeType(file.mimetype, file.originalname);
  if (ALLOWED_IMAGE_TYPES.has(normalizedMime) || ALLOWED_VIDEO_TYPES.has(normalizedMime)) {
    file.mimetype = normalizedMime;
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Permitted formats: JPG, PNG, WEBP, GIF, MP4, MOV, and WebM."), false);
  }
};

// Generous memory limits to avoid artificial Multer 'File too large' rejections
export const uploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB headroom for direct single uploads
});

// Chunks are binary slices (~3MB-4MB); 20MB buffer headroom prevents any premature 'File too large' errors
export const uploadChunkMiddleware = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

export function validateUploadMetadata({ mimeType, size, originalName = "" }) {
  const normalizedSize = Number(size);
  const normalizedMime = normalizeMimeType(mimeType, originalName);
  const isImage = ALLOWED_IMAGE_TYPES.has(normalizedMime);
  const isVideo = ALLOWED_VIDEO_TYPES.has(normalizedMime);

  if (!isImage && !isVideo) {
    const error = new Error("Unsupported file type. Permitted formats: JPG, PNG, WEBP, GIF, MP4, MOV, and WebM.");
    error.status = 415;
    throw error;
  }
  if (!Number.isSafeInteger(normalizedSize) || normalizedSize < 1) {
    const error = new Error("Invalid file size.");
    error.status = 400;
    throw error;
  }
  return { size: normalizedSize, isVideo, mimeType: normalizedMime };
}

export async function processAndSaveFile(file, requestedFolder = "general") {
  const folder = ALLOWED_MODULE_FOLDERS.includes(requestedFolder) ? requestedFolder : "general";

  const { cleanName, uniqueSuffix } = sanitizeFilename(file.originalname);
  const { isVideo, mimeType: normalizedMime } = validateUploadMetadata({
    mimeType: file.mimetype,
    size: file.size,
    originalName: file.originalname
  });
  file.mimetype = normalizedMime;

  if (isVideo) {
    const signature = file.buffer.subarray(0, 64).toString("latin1");
    const isMp4Family = signature.includes("ftyp") ||
      (normalizedMime === "video/webm" && (signature.includes("webm") || (file.buffer[0] === 0x1a && file.buffer[1] === 0x45))) ||
      (normalizedMime === "video/quicktime" && (signature.includes("ftyp") || signature.includes("moov") || signature.includes("mdat") || signature.includes("wide") || signature.includes("free") || signature.includes("qt  ")));
    if (!isMp4Family) {
      const error = new Error("Uploaded video content does not match an allowed media format (MP4, MOV, WebM).");
      error.status = 400;
      throw error;
    }

    if (isPostgresSelected()) {
      return await saveMediaBufferToNeon({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: normalizedMime,
        folder
      });
    }

    ensureUploadDirectories();
    const targetDir = path.join(resolveUploadsDirectory(), folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const ext = path.extname(file.originalname) || (normalizedMime === "video/webm" ? ".webm" : normalizedMime === "video/quicktime" ? ".mov" : ".mp4");
    const filename = `${cleanName}-${uniqueSuffix}${ext}`;
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    return {
      filename,
      url: `/uploads/${folder}/${filename}`,
      path: `${folder}/${filename}`,
      mimeType: file.mimetype,
      size: file.size,
      isVideo: true
    };
  }

  // Image validation via Sharp
  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    const error = new Error("The uploaded file is not a valid supported image.");
    error.status = 415;
    throw error;
  }
  const detectedMime = ({ jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" })[metadata.format];
  if (!detectedMime || detectedMime !== normalizedMime) {
    const error = new Error("The file contents do not match the selected image type.");
    error.status = 415;
    throw error;
  }

  // Store original image buffer directly into Neon PostgreSQL
  if (isPostgresSelected()) {
    return await saveMediaBufferToNeon({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: normalizedMime,
      folder,
      width: metadata.width,
      height: metadata.height
    });
  }

  ensureUploadDirectories();
  const targetDir = path.join(resolveUploadsDirectory(), folder);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const webpFilename = `${cleanName}-${uniqueSuffix}.webp`;
  const thumbFilename = `${cleanName}-${uniqueSuffix}-thumb.webp`;
  const webpPath = path.join(targetDir, webpFilename);
  const thumbPath = path.join(targetDir, thumbFilename);

  const isAnimated = Boolean(metadata.pages && metadata.pages > 1);

  // Preserve high fidelity for local storage fallback
  const processedBuffer = await sharp(file.buffer, isAnimated ? { animated: true } : {})
    .rotate()
    .webp({ quality: 90, effort: 4 })
    .toBuffer();

  const thumbBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 480, height: 480, fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  try {
    fs.writeFileSync(webpPath, processedBuffer);
    fs.writeFileSync(thumbPath, thumbBuffer);
  } catch (error) {
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    throw error;
  }

  return {
    filename: webpFilename,
    url: `/uploads/${folder}/${webpFilename}`,
    thumbUrl: `/uploads/${folder}/${thumbFilename}`,
    path: `${folder}/${webpFilename}`,
    mimeType: "image/webp",
    size: processedBuffer.length,
    isVideo: false
  };
}

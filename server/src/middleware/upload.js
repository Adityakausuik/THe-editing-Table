import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { ALLOWED_MODULE_FOLDERS, ensureUploadDirectories, isServerlessEnvironment, resolveUploadsDirectory, sanitizeFilename } from "../utils/fileUtils.js";
import { deleteVercelBlob, isBlobStorageConfigured, putVercelBlob } from "../utils/blobStorage.js";
import { isPostgresSelected } from "../config/databaseMode.js";

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
export const UPLOAD_CHUNK_SIZE = 3 * 1024 * 1024;

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
  if (mime === "video/mp4" || ext === ".mp4") {
    return "video/mp4";
  }
  if (mime === "video/webm" || ext === ".webm") {
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
    cb(new Error("Unsupported file type. Permitted formats: JPG, PNG, WEBP, GIF, and MP4."), false);
  }
};

export const uploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_SIZE }
});

// Chunks are raw binary slices; overall file validation occurs at /chunked/start and /chunked/finish
export const uploadChunkMiddleware = multer({
  storage: memoryStorage,
  limits: { fileSize: UPLOAD_CHUNK_SIZE }
});

export function validateUploadMetadata({ mimeType, size, originalName = "" }) {
  const normalizedSize = Number(size);
  const normalizedMime = normalizeMimeType(mimeType, originalName);
  const isImage = ALLOWED_IMAGE_TYPES.has(normalizedMime);
  const isVideo = ALLOWED_VIDEO_TYPES.has(normalizedMime);

  if (!isImage && !isVideo) {
    const error = new Error("Unsupported file type. Permitted formats: JPG, PNG, WEBP, GIF, and MP4.");
    error.status = 415;
    throw error;
  }
  const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (!Number.isSafeInteger(normalizedSize) || normalizedSize < 1 || normalizedSize > limit) {
    const error = new Error(isVideo ? "Videos must be 50MB or smaller." : "Images must be 15MB or smaller.");
    error.status = 413;
    throw error;
  }
  return { size: normalizedSize, isVideo, mimeType: normalizedMime };
}

export async function processAndSaveFile(file, requestedFolder = "general") {
  const folder = ALLOWED_MODULE_FOLDERS.includes(requestedFolder) ? requestedFolder : "general";
  const useBlob = isBlobStorageConfigured("public");
  const isPreviewOrServerless = isServerlessEnvironment() || process.env.VERCEL_ENV === "preview";

  if (!useBlob && isPreviewOrServerless) {
    const error = new Error("Public media storage is not configured. Configure the Preview public Blob store before uploading.");
    error.code = "BLOB_STORAGE_NOT_CONFIGURED";
    error.status = 503;
    throw error;
  }
  let targetDir;
  if (!useBlob) {
    ensureUploadDirectories();
    targetDir = path.join(resolveUploadsDirectory(), folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  }

  const { cleanName, uniqueSuffix } = sanitizeFilename(file.originalname);
  const { isVideo, mimeType: normalizedMime } = validateUploadMetadata({
    mimeType: file.mimetype,
    size: file.size,
    originalName: file.originalname
  });
  file.mimetype = normalizedMime;

  if (isVideo) {
    const signature = file.buffer.subarray(0, 64).toString("latin1");
    const isMp4Family = signature.includes("ftyp") || (normalizedMime === "video/webm" && signature.includes("webm"));
    if (!isMp4Family) {
      const error = new Error("Uploaded video content does not match an allowed media format.");
      error.status = 400;
      throw error;
    }

    const ext = path.extname(file.originalname) || (normalizedMime === "video/webm" ? ".webm" : ".mp4");
    const filename = `${cleanName}-${uniqueSuffix}${ext}`;
    if (useBlob) {
      const blob = await putVercelBlob(`${folder}/${filename}`, file.buffer, { access: "public", contentType: file.mimetype, multipart: true });
      return { filename: blob.pathname.split("/").pop(), url: blob.url, path: blob.pathname, mimeType: file.mimetype, size: file.size, isVideo: true };
    }
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

  // Image processing via Sharp
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
  const webpFilename = `${cleanName}-${uniqueSuffix}.webp`;
  const thumbFilename = `${cleanName}-${uniqueSuffix}-thumb.webp`;
  const webpPath = useBlob ? null : path.join(targetDir, webpFilename);
  const thumbPath = useBlob ? null : path.join(targetDir, thumbFilename);

  const isAnimated = Boolean(metadata.pages && metadata.pages > 1);

  // Main WebP optimization
  const processedBuffer = await sharp(file.buffer, isAnimated ? { animated: true } : {})
    .rotate() // Auto-orient based on EXIF
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const thumbBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 400, height: 400, fit: "cover" })
    .webp({ quality: 75 })
    .toBuffer();

  if (useBlob) {
    let mainBlob;
    try {
      mainBlob = await putVercelBlob(`${folder}/${webpFilename}`, processedBuffer, { access: "public", contentType: "image/webp" });
      return {
        filename: mainBlob.pathname.split("/").pop(),
        url: mainBlob.url,
        path: mainBlob.pathname,
        mimeType: "image/webp",
        size: processedBuffer.length,
        isVideo: false
      };
    } catch (error) {
      if (mainBlob?.url) await deleteVercelBlob(mainBlob.url).catch(() => {});
      throw error;
    }
  }

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

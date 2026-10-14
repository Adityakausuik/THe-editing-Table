import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { ALLOWED_MODULE_FOLDERS, ensureUploadDirectories, resolveUploadsDirectory, sanitizeFilename } from "../utils/fileUtils.js";
import { deleteFromGridFS, saveBufferToGridFS } from "../utils/gridfs.js";

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
export const UPLOAD_CHUNK_SIZE = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4"]);

// Memory storage for Sharp buffer processing
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype) || ALLOWED_VIDEO_TYPES.has(file.mimetype)) {
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

export const uploadChunkMiddleware = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: UPLOAD_CHUNK_SIZE }
});

export function validateUploadMetadata({ mimeType, size }) {
  const normalizedSize = Number(size);
  const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
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
  return { size: normalizedSize, isVideo };
}

export async function processAndSaveFile(file, requestedFolder = "general") {
  ensureUploadDirectories();
  const folder = ALLOWED_MODULE_FOLDERS.includes(requestedFolder) ? requestedFolder : "general";
  const activeUploadsDir = resolveUploadsDirectory();
  const targetDir = path.join(activeUploadsDir, folder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { cleanName, uniqueSuffix } = sanitizeFilename(file.originalname);
  const { isVideo } = validateUploadMetadata({ mimeType: file.mimetype, size: file.size });

  if (isVideo) {
    const signature = file.buffer.subarray(0, 16).toString("latin1");
    const isMp4Family = signature.includes("ftyp");
    if (!isMp4Family) {
      const error = new Error("Uploaded video content does not match an allowed media format.");
      error.status = 400;
      throw error;
    }

    // Persist the original video in GridFS. Vercel's function filesystem is only a cache.
    const ext = path.extname(file.originalname) || ".mp4";
    const filename = `${cleanName}-${uniqueSuffix}${ext}`;
    const filePath = path.join(targetDir, filename);

    await saveBufferToGridFS(filename, file.buffer, file.mimetype, folder);
    try { fs.writeFileSync(filePath, file.buffer); } catch (err) {
      console.info(`[upload] Local video cache unavailable for ${filename}: ${err.message}`);
    }

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
  if (!detectedMime || detectedMime !== file.mimetype) {
    const error = new Error("The file contents do not match the selected image type.");
    error.status = 415;
    throw error;
  }
  const webpFilename = `${cleanName}-${uniqueSuffix}.webp`;
  const thumbFilename = `${cleanName}-${uniqueSuffix}-thumb.webp`;
  const webpPath = path.join(targetDir, webpFilename);
  const thumbPath = path.join(targetDir, thumbFilename);

  // Main WebP optimization
  const processedBuffer = await sharp(file.buffer)
    .rotate() // Auto-orient based on EXIF
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const thumbBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 400, height: 400, fit: "cover" })
    .webp({ quality: 75 })
    .toBuffer();

  try {
    const persisted = await Promise.allSettled([
      saveBufferToGridFS(webpFilename, processedBuffer, "image/webp", folder),
      saveBufferToGridFS(thumbFilename, thumbBuffer, "image/webp", folder)
    ]);
    const failed = persisted.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    try {
      fs.writeFileSync(webpPath, processedBuffer);
      fs.writeFileSync(thumbPath, thumbBuffer);
    } catch (err) {
      console.info(`[upload] Local image cache unavailable for ${webpFilename}: ${err.message}`);
    }
  } catch (error) {
    // GridFS is the durable store; do not return success if persistence failed.
    await Promise.all([
      deleteFromGridFS(`${folder}/${webpFilename}`),
      deleteFromGridFS(`${folder}/${thumbFilename}`)
    ]);
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

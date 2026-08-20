import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { ALLOWED_MODULE_FOLDERS, ensureUploadDirectories, sanitizeFilename, UPLOADS_DIR } from "../utils/fileUtils.js";

// Memory storage for Sharp buffer processing
const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/gif"];
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];

  if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Permitted formats: JPEG, PNG, WEBP, AVIF, GIF, MP4, WEBM, MOV."), false);
  }
};

export const uploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file limit
});

export async function processAndSaveFile(file, requestedFolder = "general") {
  ensureUploadDirectories();
  const folder = ALLOWED_MODULE_FOLDERS.includes(requestedFolder) ? requestedFolder : "general";
  const targetDir = path.join(UPLOADS_DIR, folder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { cleanName, uniqueSuffix } = sanitizeFilename(file.originalname);
  const isVideo = file.mimetype.startsWith("video/");

  if (isVideo) {
    const signature = file.buffer.subarray(0, 16).toString("latin1");
    const isMp4Family = signature.includes("ftyp");
    const isWebm = file.buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (!isMp4Family && !isWebm) {
      const error = new Error("Uploaded video content does not match an allowed media format.");
      error.status = 400;
      throw error;
    }

    // Save video file directly
    const ext = path.extname(file.originalname) || ".mp4";
    const filename = `${cleanName}-${uniqueSuffix}${ext}`;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    return {
      filename,
      url: `/uploads/${folder}/${filename}`,
      path: filePath,
      mimeType: file.mimetype,
      size: file.size,
      isVideo: true
    };
  }

  if (file.size > 15 * 1024 * 1024) {
    const error = new Error("Images must be 15MB or smaller.");
    error.status = 413;
    throw error;
  }

  // Image processing via Sharp
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

  try {
    fs.writeFileSync(webpPath, processedBuffer);

    const thumbBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: "cover" })
      .webp({ quality: 75 })
      .toBuffer();

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
    path: webpPath,
    mimeType: "image/webp",
    size: processedBuffer.length,
    isVideo: false
  };
}

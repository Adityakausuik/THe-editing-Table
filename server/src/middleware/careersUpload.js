import fs from "fs";
import path from "path";
import multer from "multer";
import { ensureUploadDirectories, isServerlessEnvironment, resolveUploadsDirectory, sanitizeFilename } from "../utils/fileUtils.js";
import { saveBufferToGridFS } from "../utils/gridfs.js";
import { isBlobStorageConfigured, putVercelBlob } from "../utils/blobStorage.js";
import { connectGridFs, isGridFsConnected } from "../config/gridfsDb.js";

const memoryStorage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream" // Some browsers/OS report octet-stream for docx
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error("Unsupported resume format. Permitted formats: PDF, DOC, DOCX."), false);
  }

  if (ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype.startsWith("application/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid resume file type. Permitted formats: PDF, DOC, DOCX."), false);
  }
};

export const resumeUploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max limit
});

export async function processAndSaveResume(file) {
  // Basic signature inspection
  const ext = path.extname(file.originalname || "").toLowerCase();
  const bufferHeader = file.buffer.subarray(0, 8).toString("latin1");

  if (ext === ".pdf" && !bufferHeader.includes("%PDF")) {
    const error = new Error("Uploaded PDF content appears corrupted or invalid.");
    error.status = 400;
    throw error;
  }

  const { cleanName, uniqueSuffix } = sanitizeFilename(file.originalname);
  const filename = `${cleanName}-${uniqueSuffix}${ext}`;
  const mimeType = file.mimetype || (ext === ".pdf" ? "application/pdf" : "application/msword");

  if (isBlobStorageConfigured("private")) {
    const blob = await putVercelBlob(`resumes/${filename}`, file.buffer, { access: "private", contentType: mimeType });
    return { filename: blob.pathname.split("/").pop(), url: blob.url, path: blob.pathname, originalName: file.originalname, size: file.size, mimeType };
  }

  await connectGridFs().catch(() => {});
  const gridFsConnected = isGridFsConnected();
  if (isServerlessEnvironment() && !gridFsConnected) {
    const error = new Error("Durable resume storage is unavailable. Configure the deployment's GridFS connection.");
    error.code = "GRIDFS_STORAGE_UNAVAILABLE";
    error.status = 503;
    throw error;
  }

  ensureUploadDirectories();
  const activeUploadsDir = resolveUploadsDirectory();
  const targetDir = path.join(activeUploadsDir, "resumes");
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const filePath = path.join(targetDir, filename);

  // GridFS is the durable store. A Vercel function's filesystem is temporary,
  // so never report success unless the resume is persisted there first.
  if (gridFsConnected) await saveBufferToGridFS(filename, file.buffer, mimeType, "resumes");
  else if (isServerlessEnvironment()) {
    const error = new Error("Durable resume storage is unavailable.");
    error.status = 503;
    throw error;
  }
  try {
    fs.writeFileSync(filePath, file.buffer);
  } catch (err) {
    console.info(`[upload] Local resume cache unavailable for ${filename}: ${err.message}`);
  }

  return {
    filename,
    url: `/uploads/resumes/${filename}`,
    path: gridFsConnected ? `resumes/${filename}` : filePath,
    originalName: file.originalname,
    size: file.size,
    mimeType
  };
}

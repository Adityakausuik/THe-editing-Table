import fs from "fs";
import path from "path";
import multer from "multer";
import { ensureUploadDirectories, resolveUploadsDirectory, sanitizeFilename } from "../utils/fileUtils.js";

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
  ensureUploadDirectories();
  const activeUploadsDir = resolveUploadsDirectory();
  const targetDir = path.join(activeUploadsDir, "resumes");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

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
  const filePath = path.join(targetDir, filename);

  fs.writeFileSync(filePath, file.buffer);

  return {
    filename,
    url: `/uploads/resumes/${filename}`,
    path: filePath,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype || (ext === ".pdf" ? "application/pdf" : "application/msword")
  };
}

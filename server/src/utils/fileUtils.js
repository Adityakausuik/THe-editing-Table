import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// Comprehensive detection for Vercel and AWS Lambda serverless runtime environments
export function isServerlessEnvironment() {
  const currentFilePath = typeof import.meta.url === "string" ? fileURLToPath(import.meta.url) : "";
  const cwd = process.cwd() || "";

  return Boolean(
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_REGION ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    cwd.includes("/var/task") ||
    cwd.includes("\\var\\task") ||
    currentFilePath.includes("/var/task") ||
    currentFilePath.includes("\\var\\task")
  );
}

export function resolveUploadsDirectory() {
  if (isServerlessEnvironment()) {
    return path.join(os.tmpdir() || "/tmp", "uploads");
  }

  // Local development / dedicated server / container
  try {
    const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const localDir = path.join(serverRoot, "uploads");

    // Guard: Never return any path inside /var/task
    if (localDir.includes("/var/task") || localDir.includes("\\var\\task")) {
      return path.join(os.tmpdir() || "/tmp", "uploads");
    }

    return localDir;
  } catch {
    return path.join(os.tmpdir() || "/tmp", "uploads");
  }
}

export const UPLOADS_DIR = resolveUploadsDirectory();
const BASE_UPLOADS_DIR = UPLOADS_DIR;

export const ALLOWED_MODULE_FOLDERS = [
  "partners",
  "services",
  "portfolio",
  "weddings",
  "brands",
  "blogs",
  "team",
  "hero",
  "reviews",
  "general",
  "resumes",
  "careers",
  "video-showcase",
  "video-showcase/videos",
  "video-showcase/mobile",
  "video-showcase/thumbnails",
  "video-showcase/captions"
];

export function ensureUploadDirectories() {
  const targetBase = resolveUploadsDirectory();

  // If path is somehow inside /var/task, abort immediately
  if (targetBase.includes("/var/task") || targetBase.includes("\\var\\task")) {
    return;
  }

  try {
    if (!fs.existsSync(targetBase)) {
      fs.mkdirSync(targetBase, { recursive: true });
    }

    ALLOWED_MODULE_FOLDERS.forEach((folder) => {
      const dir = path.join(targetBase, folder);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  } catch (err) {
    // Non-fatal warning: never throw or crash on directory initialization
    console.warn(`[Uploads Notice] Non-fatal directory note for ${targetBase}: ${err.message}`);
  }
}

export function sanitizeFilename(originalName = "file") {
  const ext = path.extname(originalName).toLowerCase();
  const nameWithoutExt = path.basename(originalName, ext);
  const cleanName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return { cleanName: cleanName || "media", uniqueSuffix, ext };
}

export function safeDeleteFile(relativePathOrUrl) {
  if (!relativePathOrUrl || typeof relativePathOrUrl !== "string") return false;

  // Don't delete remote unsplash/external URLs
  if (relativePathOrUrl.startsWith("http://") || relativePathOrUrl.startsWith("https://")) {
    // Only attempt if it's served from our own host/uploads
    if (!relativePathOrUrl.includes("/uploads/")) return false;
  }

  try {
    // Extract relative /uploads/... path
    const cleanRelativePath = relativePathOrUrl
      .replace(/^https?:\/\/[^/]+/, "")
      .replace(/^\/+/, "")
      .replace(/^api[\\/]uploads[\\/]/, `uploads${path.sep}`);

    const uploadsRelativePath = cleanRelativePath.replace(/^uploads[\\/]/, "");
    const absoluteTarget = path.resolve(UPLOADS_DIR, uploadsRelativePath);

    // Strict path traversal check: Must be inside BASE_UPLOADS_DIR
    if (absoluteTarget !== BASE_UPLOADS_DIR && !absoluteTarget.startsWith(`${BASE_UPLOADS_DIR}${path.sep}`)) {
      console.warn(`[Security Alert] Blocked unsafe file deletion attempt outside /uploads: ${absoluteTarget}`);
      return false;
    }

    if (fs.existsSync(absoluteTarget)) {
      fs.unlinkSync(absoluteTarget);

      // Check if thumbnail version exists and delete it
      const ext = path.extname(absoluteTarget);
      const thumbPath = absoluteTarget.replace(ext, `-thumb${ext}`);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
      return true;
    }
  } catch (err) {
    console.error("Safe file deletion error:", err);
  }
  return false;
}

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// Detect if running in Vercel / AWS Lambda serverless environment
export function isServerlessEnvironment() {
  return Boolean(
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
}

export function resolveUploadsDirectory() {
  if (isServerlessEnvironment()) {
    return path.join(os.tmpdir() || "/tmp", "uploads");
  }

  // Local development / dedicated server / container
  try {
    const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    return path.join(serverRoot, "uploads");
  } catch {
    return path.join(process.cwd(), "uploads");
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
  "video-showcase",
  "video-showcase/videos",
  "video-showcase/mobile",
  "video-showcase/thumbnails",
  "video-showcase/captions"
];

export function ensureUploadDirectories() {
  try {
    if (!fs.existsSync(BASE_UPLOADS_DIR)) {
      fs.mkdirSync(BASE_UPLOADS_DIR, { recursive: true });
    }

    ALLOWED_MODULE_FOLDERS.forEach((folder) => {
      const dir = path.join(BASE_UPLOADS_DIR, folder);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  } catch (err) {
    // Non-fatal warning: never crash serverless boot
    console.warn(`[Uploads Notice] Could not initialize upload directory ${BASE_UPLOADS_DIR}: ${err.message}`);
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

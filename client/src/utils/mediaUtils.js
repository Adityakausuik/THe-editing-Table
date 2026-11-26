export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
export const CHUNK_BYTES = 3 * 1024 * 1024; // 3MB

export const ALLOWED_MIME_MAP = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/png": "image/png",
  "image/x-png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "video/mp4": "video/mp4",
  "video/webm": "video/webm"
};

export const EXTENSION_MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

/**
 * Normalizes client file MIME type using both file.type and filename extension fallback.
 */
export function normalizeClientMimeType(file) {
  if (!file) return "";
  const rawType = String(file.type || "").toLowerCase().trim().split(";")[0].trim();
  const name = String(file.name || "").toLowerCase();
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";

  if (ALLOWED_MIME_MAP[rawType]) {
    return ALLOWED_MIME_MAP[rawType];
  }

  if (EXTENSION_MIME_MAP[ext]) {
    return EXTENSION_MIME_MAP[ext];
  }

  return rawType;
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

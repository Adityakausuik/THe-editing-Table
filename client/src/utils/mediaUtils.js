export const CHUNK_BYTES = 3 * 1024 * 1024; // 3MB chunk slice for reliable transport

export const ALLOWED_MIME_MAP = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/png": "image/png",
  "image/x-png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "video/mp4": "video/mp4",
  "video/quicktime": "video/quicktime",
  "video/mov": "video/quicktime",
  "video/x-quicktime": "video/quicktime",
  "video/webm": "video/webm",
  "video/m4v": "video/mp4",
  "video/x-matroska": "video/webm"
};

export const EXTENSION_MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/mp4"
};

export function isVideoMimeType(mimeType = "") {
  const norm = String(mimeType || "").toLowerCase().trim();
  return (
    norm === "video/mp4" ||
    norm === "video/quicktime" ||
    norm === "video/mov" ||
    norm === "video/x-quicktime" ||
    norm === "video/webm" ||
    norm === "video/m4v" ||
    norm.startsWith("video/")
  );
}

export function isImageMimeType(mimeType = "") {
  return String(mimeType).startsWith("image/");
}

export function isVideoMedia(urlOrName = "") {
  if (!urlOrName) return false;
  const clean = String(urlOrName).toLowerCase().split("?")[0].split("#")[0].trim();
  return /\.(mp4|webm|mov|m4v|mkv)$/i.test(clean) || clean.includes("youtube.com") || clean.includes("youtu.be");
}

export function isImageMedia(urlOrName = "") {
  if (!urlOrName) return false;
  const clean = String(urlOrName).toLowerCase().split("?")[0].split("#")[0].trim();
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(clean);
}

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

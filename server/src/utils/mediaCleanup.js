import { safeDeleteFile } from "./fileUtils.js";
import { isPostgresMediaReferenced } from "../db/mediaRepository.js";

export function normalizeMediaPath(value = "") {
  if (typeof value !== "string" || !value.includes("/uploads/")) return "";
  return value
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/api\/uploads\//, "/uploads/");
}

export function extractMediaPaths(value) {
  const paths = new Set();

  function visit(current) {
    if (typeof current === "string") {
      const normalized = normalizeMediaPath(current);
      if (normalized) paths.add(normalized);
      return;
    }

    if (!current || typeof current !== "object") return;
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    Object.values(current).forEach(visit);
  }

  visit(value);
  return [...paths];
}

export async function isMediaReferenced(path) {
  const normalized = normalizeMediaPath(path);
  if (!normalized) return false;
  return isPostgresMediaReferenced(normalized);
}

export async function deleteUnreferencedMedia(paths = []) {
  const candidates = [...new Set(paths.map(normalizeMediaPath).filter(Boolean))];
  if (candidates.length === 0) return;

  for (const candidate of candidates) {
    const isReferenced = await isPostgresMediaReferenced(candidate);
    if (!isReferenced) {
      safeDeleteFile(candidate);
    }
  }
}

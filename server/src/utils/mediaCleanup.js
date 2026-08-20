import BlogPost from "../models/BlogPost.model.js";
import BrandCollaboration from "../models/BrandCollaboration.model.js";
import HeroSlide from "../models/HeroSlide.model.js";
import Media from "../models/Media.model.js";
import Partner from "../models/Partner.model.js";
import PortfolioItem from "../models/PortfolioItem.model.js";
import Review from "../models/Review.model.js";
import Service from "../models/Service.model.js";
import TeamMember from "../models/TeamMember.model.js";
import WeddingGalleryItem from "../models/WeddingGalleryItem.model.js";
import { safeDeleteFile } from "./fileUtils.js";

const CONTENT_MODELS = [
  HeroSlide,
  Partner,
  Service,
  PortfolioItem,
  Review,
  WeddingGalleryItem,
  BrandCollaboration,
  BlogPost,
  TeamMember
];

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

async function getReferencedMediaPaths() {
  const documents = await Promise.all(CONTENT_MODELS.map((Model) => Model.find().lean()));
  return new Set(documents.flatMap((items) => items.flatMap(extractMediaPaths)));
}

export async function isMediaReferenced(path) {
  const normalized = normalizeMediaPath(path);
  if (!normalized) return false;
  const referenced = await getReferencedMediaPaths();
  return referenced.has(normalized);
}

export async function deleteUnreferencedMedia(paths = []) {
  const candidates = [...new Set(paths.map(normalizeMediaPath).filter(Boolean))];
  if (candidates.length === 0) return;

  const referenced = await getReferencedMediaPaths();
  const removable = candidates.filter((url) => !referenced.has(url));
  if (removable.length === 0) return;

  await Media.deleteMany({
    $or: [
      { url: { $in: removable } },
      { url: { $in: paths } }
    ]
  });

  removable.forEach((url) => safeDeleteFile(url));
}

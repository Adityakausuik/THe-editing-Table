import { createId, isValidId } from "../utils/ids.js";
import { deleteUnreferencedMedia, extractMediaPaths } from "../utils/mediaCleanup.js";
import { writeSecurityAudit } from "../utils/audit.js";
import { getCache, setCache, deleteCache, invalidateCmsCache } from "../config/redis.js";
import {
  createPostgresHeroSlide,
  deletePostgresHeroSlide,
  getPostgresHeroSlide,
  listPostgresHeroSlides,
  listPublishedHeroSlides,
  reorderPostgresHeroSlides,
  updatePostgresHeroSlide
} from "../db/heroSlideRepository.js";

const HERO_STRING_FIELDS = [
  "slideKey",
  "slideType",
  "layoutType",
  "label",
  "eyebrow",
  "title",
  "subtitle",
  "tag",
  "caption",
  "description",
  "quote",
  "ctaText",
  "ctaLink",
  "trustLabel",
  "mainImage",
  "status"
];

const HERO_ARRAY_FIELDS = ["headingLines", "featureItems"];
const HERO_TYPES = new Set(["ceo", "team", "collaborations"]);
const HERO_LAYOUTS = new Set(["ceo_editorial", "team_layered", "brand_strips"]);
const HERO_STATUSES = new Set(["draft", "published", "inactive"]);

function sanitize(value = "") {
  if (typeof value !== "string") return "";
  return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").trim();
}

function toPlain(doc) {
  if (!doc) return doc;
  return typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
}

function normalizeHeroForClient(doc) {
  const slide = toPlain(doc);
  if (!slide) return slide;
  const imageGrid = Array.isArray(slide.imageGrid) && slide.imageGrid.length
    ? slide.imageGrid
    : Array.isArray(slide.images) ? slide.images : [];

  const mainImage = slide.mainImage || "";
  const cleanPath = typeof mainImage === "string" ? mainImage.split("?")[0].split("#")[0].toLowerCase() : "";
  const isVideo = (
    cleanPath.endsWith(".mp4") ||
    cleanPath.endsWith(".mov") ||
    cleanPath.endsWith(".webm") ||
    cleanPath.endsWith(".m4v") ||
    cleanPath.endsWith(".mkv")
  );

  return {
    ...slide,
    images: imageGrid,
    imageGrid,
    slideNumber: slide.slideNumber || slide.order,
    status: slide.status || (slide.active === false ? "inactive" : "published"),
    active: slide.active !== false && slide.status === "published",
    isVideo,
    mediaType: isVideo ? "video" : (mainImage ? "image" : "none"),
    videoUrl: isVideo ? mainImage : null
  };
}

function buildHeroPayload(payload = {}) {
  const next = {};

  HERO_STRING_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) next[field] = sanitize(payload[field]);
  });

  if (!next.slideKey && (payload.title || payload.label || payload.eyebrow)) {
    const base = (payload.title || payload.label || payload.eyebrow)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    next.slideKey = `slide-${base || Date.now().toString(36)}`;
  }

  HERO_ARRAY_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      next[field] = Array.isArray(payload[field])
        ? payload[field].map((item) => sanitize(item)).filter(Boolean)
        : [];
    }
  });

  if (payload.imageGrid !== undefined || payload.images !== undefined) {
    const rawImages = Array.isArray(payload.imageGrid)
      ? payload.imageGrid
      : Array.isArray(payload.images) ? payload.images : [];
    next.imageGrid = rawImages.map((image) => sanitize(image)).filter(Boolean);
    next.images = [...next.imageGrid];
  }

  if (payload.active !== undefined) {
    next.active = Boolean(payload.active);
    if (payload.status === undefined) {
      next.status = next.active ? "published" : "inactive";
    }
  }

  if (payload.order !== undefined) {
    const parsedOrder = Number(payload.order);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      const error = new Error("Order must be a positive integer.");
      error.status = 400;
      throw error;
    }
    next.order = parsedOrder;
  }

  if (payload.slideNumber !== undefined) {
    const parsedNumber = Number(payload.slideNumber);
    if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
      const error = new Error("Slide number must be a positive integer.");
      error.status = 400;
      throw error;
    }
    next.slideNumber = parsedNumber;
  }

  if (next.slideType && !HERO_TYPES.has(next.slideType)) {
    const error = new Error("Invalid slide type.");
    error.status = 400;
    throw error;
  }
  if (next.layoutType && !HERO_LAYOUTS.has(next.layoutType)) {
    const error = new Error("Invalid layout type.");
    error.status = 400;
    throw error;
  }
  if (next.status && !HERO_STATUSES.has(next.status)) {
    const error = new Error("Invalid slide status.");
    error.status = 400;
    throw error;
  }
  if (next.slideKey && !/^[a-z0-9_-]+$/i.test(next.slideKey)) {
    const error = new Error("Slide key contains invalid characters.");
    error.status = 400;
    throw error;
  }
  if (next.title !== undefined && !next.title) {
    const error = new Error("Title is required.");
    error.status = 400;
    throw error;
  }
  if (next.title?.length > 150 || next.subtitle?.length > 300 || next.description?.length > 1000) {
    const error = new Error("Hero slide text exceeds the allowed length.");
    error.status = 400;
    throw error;
  }

  return next;
}

async function normalizeAllHeroSlideOrders() {
  const slides = await listPostgresHeroSlides();
  if (slides.length) await reorderPostgresHeroSlides(slides.map((slide) => slide._id));
}

async function writeAudit(req, action, entityId) {
  await writeSecurityAudit({
    req,
    user: req.user,
    action,
    entity: "HeroSlide",
    entityId: String(entityId)
  });
}

export async function getPublicHeroSlides(req, res) {
  try {
    const cacheKey = "cms:hero-slides:public";
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      return res.json(cached);
    }

    const slides = await listPublishedHeroSlides();
    const payload = {
      success: true,
      message: "Public hero slides retrieved successfully",
      data: slides.map(normalizeHeroForClient)
    };
    await setCache(cacheKey, payload, 300);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    return res.json(payload);
  } catch {
    return res.status(503).json({ success: false, message: "PostgreSQL is unavailable. Hero slide data cannot be retrieved.", data: null });
  }
}

export async function getAdminHeroSlides(req, res) {
  try {
    const slides = await listPostgresHeroSlides();
    return res.json({
      success: true,
      message: "Admin hero slides retrieved successfully",
      data: slides.map(normalizeHeroForClient)
    });
  } catch {
    return res.status(503).json({ success: false, message: "PostgreSQL is unavailable. Hero slide data cannot be retrieved.", data: null });
  }
}

export async function createHeroSlide(req, res) {
  try {
    const payload = buildHeroPayload(req.body);
    if (!payload.slideKey || !payload.title) {
      return res.status(400).json({
        success: false,
        message: "Slide key and title are required.",
        data: null
      });
    }

    const highest = Math.max(0, ...(await listPostgresHeroSlides()).map((item) => Number(item.order) || 0));
    const order = payload.order || highest + 1;
    const slideData = {
      ...payload,
      order,
      slideNumber: payload.slideNumber || order,
      slideType: payload.slideType || "ceo",
      layoutType: payload.layoutType || "ceo_editorial",
      active: payload.active ?? true,
      status: payload.status || "published"
    };
    const slide = await createPostgresHeroSlide(createId(), slideData);

    await normalizeAllHeroSlideOrders();
    await invalidateCmsCache("hero");
    await writeAudit(req, "HERO_SLIDE_CREATE", slide._id);
    const saved = await getPostgresHeroSlide(slide._id);
    return res.status(201).json({
      success: true,
      message: "Hero slide created successfully",
      data: normalizeHeroForClient(saved)
    });
  } catch (error) {
    const duplicate = error?.code === 11000 || error?.code === "23505";
    const status = duplicate ? 409 : Number(error.status || 400);
    const message = duplicate ? "Slide key must be unique." : error.message;
    return res.status(status).json({ success: false, message: message || "Hero slide create failed", data: null });
  }
}

export async function updateHeroSlide(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid slide ID.", data: null });
    }

    const existing = await getPostgresHeroSlide(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Hero slide not found.", data: null });
    }

    const payload = buildHeroPayload(req.body);
    const updated = await updatePostgresHeroSlide(id, payload);

    if (payload.order !== undefined || payload.slideNumber !== undefined) {
      await normalizeAllHeroSlideOrders();
    }

    const oldMedia = extractMediaPaths(existing);
    const currentMedia = new Set(extractMediaPaths(updated));
    await deleteUnreferencedMedia(oldMedia.filter((url) => !currentMedia.has(url)));
    await invalidateCmsCache("hero");
    await writeAudit(req, "HERO_SLIDE_UPDATE", id);

    return res.json({
      success: true,
      message: "Hero slide updated successfully",
      data: normalizeHeroForClient(updated)
    });
  } catch (error) {
    const duplicate = error?.code === 11000 || error?.code === "23505";
    const status = duplicate ? 409 : Number(error.status || 400);
    const message = duplicate ? "Slide key must be unique." : error.message;
    return res.status(status).json({ success: false, message: message || "Hero slide update failed", data: null });
  }
}

export async function deleteHeroSlide(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid slide ID.", data: null });
    }

    const deleted = await deletePostgresHeroSlide(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Hero slide not found.", data: null });
    }

    await normalizeAllHeroSlideOrders();
    await deleteUnreferencedMedia(extractMediaPaths(deleted));
    await invalidateCmsCache("hero");
    await writeAudit(req, "HERO_SLIDE_DELETE", id);
    return res.json({ success: true, message: "Hero slide deleted successfully", data: { id } });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Hero slide delete failed",
      data: null
    });
  }
}

export async function reorderHeroSlides(req, res) {
  try {
    const rawItems = req.body.items || req.body.orderedIds || req.body.slides;
    let orderedIds = [];
    if (Array.isArray(rawItems)) {
      orderedIds = rawItems.map((item) => (typeof item === "string" ? item : (item?.id || item?._id))).filter(Boolean);
    } else if (Array.isArray(req.body.orderedIds)) {
      orderedIds = req.body.orderedIds.map((item) => (typeof item === "string" ? item : (item?.id || item?._id))).filter(Boolean);
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an ordered array of slide IDs.",
        data: null
      });
    }

    const validIds = orderedIds.filter((id) => isValidId(id));
    const allSlides = await listPostgresHeroSlides();
    const totalSlides = allSlides.length;

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid Hero slide IDs provided for reorder.",
        data: null
      });
    }

    // Reconcile list: ensure all existing slides are accounted for
    const orderedSet = new Set(validIds.map(String));
    const reconciledIds = [...validIds];
    for (const slide of allSlides) {
      const sId = String(slide.id || slide._id);
      if (!orderedSet.has(sId)) {
        reconciledIds.push(sId);
        orderedSet.add(sId);
      }
    }

    const existingCount = (await Promise.all(reconciledIds.map((id) => getPostgresHeroSlide(id)))).filter(Boolean).length;
    if (existingCount !== reconciledIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more Hero slides no longer exist.",
        data: null
      });
    }

    await reorderPostgresHeroSlides(reconciledIds);
    await invalidateCmsCache("hero");
    await writeAudit(req, "HERO_SLIDE_REORDER", "bulk");

    const slides = await listPostgresHeroSlides();
    return res.json({
      success: true,
      message: "Hero slides reordered successfully",
      data: slides.map(normalizeHeroForClient)
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Hero slide reorder failed",
      data: null
    });
  }
}

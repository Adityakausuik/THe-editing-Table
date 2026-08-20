import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.model.js";
import HeroSlide from "../models/HeroSlide.model.js";
import { deleteUnreferencedMedia, extractMediaPaths } from "../utils/mediaCleanup.js";

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

function requireDb(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. Hero slide data cannot be retrieved or changed.",
    data: null
  });
  return false;
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

  return {
    ...slide,
    images: imageGrid,
    imageGrid,
    slideNumber: slide.slideNumber || slide.order,
    status: slide.status || (slide.active === false ? "inactive" : "published"),
    active: slide.active !== false && slide.status === "published"
  };
}

function buildHeroPayload(payload = {}) {
  const next = {};

  HERO_STRING_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) next[field] = sanitize(payload[field]);
  });

  HERO_ARRAY_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      next[field] = Array.isArray(payload[field]) ? payload[field].map(sanitize).filter(Boolean) : [];
    }
  });

  const requestedImages = payload.imageGrid ?? payload.images;
  if (requestedImages !== undefined) {
    const imageGrid = Array.isArray(requestedImages) ? requestedImages.map(sanitize).filter(Boolean) : [];
    next.imageGrid = imageGrid;
    next.images = imageGrid;
  }

  if (payload.featuredImageIndex !== undefined) {
    next.featuredImageIndex = Math.max(0, Number(payload.featuredImageIndex) || 0);
  }
  if (payload.transitionDuration !== undefined) {
    next.transitionDuration = Math.max(1000, Number(payload.transitionDuration) || 5000);
  }
  if (payload.order !== undefined) next.order = Math.max(1, Number(payload.order) || 1);
  if (payload.slideNumber !== undefined) next.slideNumber = Math.max(1, Number(payload.slideNumber) || 1);
  if (payload.active !== undefined) next.active = Boolean(payload.active);

  if (next.slideType && !HERO_TYPES.has(next.slideType)) {
    const error = new Error("Invalid Hero slide type.");
    error.status = 400;
    throw error;
  }
  if (next.layoutType && !HERO_LAYOUTS.has(next.layoutType)) {
    const error = new Error("Invalid Hero layout type.");
    error.status = 400;
    throw error;
  }
  if (next.status && !HERO_STATUSES.has(next.status)) {
    const error = new Error("Hero status must be draft, published, or inactive.");
    error.status = 400;
    throw error;
  }

  if (next.status !== undefined && payload.active === undefined) {
    next.active = next.status === "published";
  } else if (next.active !== undefined && payload.status === undefined) {
    next.status = next.active ? "published" : "inactive";
  }

  return next;
}

async function normalizeAllHeroSlideOrders() {
  const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 }).select("_id");
  if (slides.length === 0) return;

  await HeroSlide.bulkWrite(
    slides.map((slide, index) => ({
      updateOne: {
        filter: { _id: slide._id },
        update: { $set: { order: index + 1, slideNumber: index + 1 } }
      }
    }))
  );
}

async function writeAudit(req, action, entityId) {
  await AuditLog.create({
    action,
    entity: "HeroSlide",
    entityId: String(entityId),
    user: req.user?.id,
    userEmail: req.user?.email,
    ipAddress: req.ip || ""
  }).catch(() => null);
}

export async function getPublicHeroSlides(req, res) {
  try {
    if (!requireDb(res)) return;
    const slides = await HeroSlide.find({ active: true, status: "published" })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      message: "Public hero slides retrieved successfully",
      data: slides.map(normalizeHeroForClient)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Public hero slides fetch failed",
      data: null
    });
  }
}

export async function getAdminHeroSlides(req, res) {
  try {
    if (!requireDb(res)) return;
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 }).lean();
    return res.json({
      success: true,
      message: "Admin hero slides retrieved successfully",
      data: slides.map(normalizeHeroForClient)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Admin hero slides fetch failed",
      data: null
    });
  }
}

export async function createHeroSlide(req, res) {
  try {
    if (!requireDb(res)) return;
    const payload = buildHeroPayload(req.body);
    if (!payload.slideKey || !payload.title) {
      return res.status(400).json({
        success: false,
        message: "Slide key and title are required.",
        data: null
      });
    }

    const highest = await HeroSlide.findOne().sort({ order: -1 }).select("order").lean();
    const order = payload.order || Number(highest?.order || 0) + 1;
    const slide = await HeroSlide.create({
      ...payload,
      order,
      slideNumber: payload.slideNumber || order,
      slideType: payload.slideType || "ceo",
      layoutType: payload.layoutType || "ceo_editorial",
      active: payload.active ?? true,
      status: payload.status || "published"
    });

    await normalizeAllHeroSlideOrders();
    await writeAudit(req, "HERO_SLIDE_CREATE", slide._id);
    const saved = await HeroSlide.findById(slide._id).lean();
    return res.status(201).json({
      success: true,
      message: "Hero slide created successfully",
      data: normalizeHeroForClient(saved)
    });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : Number(error.status || 400);
    const message = error?.code === 11000 ? "Slide key must be unique." : error.message;
    return res.status(status).json({ success: false, message: message || "Hero slide create failed", data: null });
  }
}

export async function updateHeroSlide(req, res) {
  try {
    if (!requireDb(res)) return;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid slide ID.", data: null });
    }

    const existing = await HeroSlide.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Hero slide not found.", data: null });
    }

    const payload = buildHeroPayload(req.body);
    const updated = await HeroSlide.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (payload.order !== undefined || payload.slideNumber !== undefined) {
      await normalizeAllHeroSlideOrders();
    }

    const oldMedia = extractMediaPaths(existing);
    const currentMedia = new Set(extractMediaPaths(updated));
    await deleteUnreferencedMedia(oldMedia.filter((url) => !currentMedia.has(url)));
    await writeAudit(req, "HERO_SLIDE_UPDATE", id);

    const saved = await HeroSlide.findById(id).lean();
    return res.json({
      success: true,
      message: "Hero slide updated successfully",
      data: normalizeHeroForClient(saved)
    });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : Number(error.status || 400);
    const message = error?.code === 11000 ? "Slide key must be unique." : error.message;
    return res.status(status).json({ success: false, message: message || "Hero slide update failed", data: null });
  }
}

export async function deleteHeroSlide(req, res) {
  try {
    if (!requireDb(res)) return;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid slide ID.", data: null });
    }

    const deleted = await HeroSlide.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Hero slide not found.", data: null });
    }

    await normalizeAllHeroSlideOrders();
    await deleteUnreferencedMedia(extractMediaPaths(deleted));
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
    if (!requireDb(res)) return;
    const orderedIds = req.body.orderedIds ||
      (Array.isArray(req.body.slides) ? req.body.slides.map((item) => item.id || item._id) : []);

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an ordered array of slide IDs.",
        data: null
      });
    }

    const validIds = orderedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const totalSlides = await HeroSlide.countDocuments();
    if (
      validIds.length !== orderedIds.length ||
      new Set(validIds.map(String)).size !== validIds.length ||
      validIds.length !== totalSlides
    ) {
      return res.status(400).json({
        success: false,
        message: "Reorder must contain every Hero slide exactly once.",
        data: null
      });
    }

    const existingCount = await HeroSlide.countDocuments({ _id: { $in: validIds } });
    if (existingCount !== validIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more Hero slides no longer exist.",
        data: null
      });
    }

    await HeroSlide.bulkWrite(
      validIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: index + 1, slideNumber: index + 1 } }
        }
      }))
    );
    await writeAudit(req, "HERO_SLIDE_REORDER", "bulk");

    const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 }).lean();
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

import crypto from "crypto";
import mongoose from "mongoose";
import AdminActivityLog from "../models/AdminActivityLog.model.js";
import VideoAnalytics from "../models/VideoAnalytics.model.js";
import VideoShowcaseItem from "../models/VideoShowcaseItem.model.js";
import VideoShowcaseSettings from "../models/VideoShowcaseSettings.model.js";
import { safeDeleteFile } from "../utils/fileUtils.js";

const VIDEO_SHOWCASE_HEADING = "We Turn Your Raw Footage Into Stories Worth Watching";
const VIDEO_SHOWCASE_SUBHEADING =
  "From cinematic wedding films and emotional highlights to brand campaigns, reels, and professional post-production — The Editing Table transforms every frame into a polished visual experience designed to connect, engage, and leave a lasting impression.";
const LEGACY_VIDEO_SHOWCASE_HEADING = "We Specialize in Scroll-Stopping Real Estate Videos";
const LEGACY_VIDEO_SHOWCASE_SUBHEADING =
  "Cinematic property walkthroughs, drone films and social media videos designed to attract attention and generate enquiries.";

function normalizeVideoShowcaseCopy(settings) {
  const normalized = typeof settings?.toObject === "function" ? settings.toObject() : { ...settings };
  if (normalized.heading === LEGACY_VIDEO_SHOWCASE_HEADING) normalized.heading = VIDEO_SHOWCASE_HEADING;
  if (normalized.subheading === LEGACY_VIDEO_SHOWCASE_SUBHEADING) normalized.subheading = VIDEO_SHOWCASE_SUBHEADING;
  return normalized;
}

const DEFAULT_VIDEO_SHOWCASE_ITEMS = [
  {
    _id: "demo-v1",
    title: "Villa Belle Époque Walkthrough",
    slug: "villa-belle-epoque-walkthrough",
    description: "Cinematic 4K architectural walkthrough of a historic luxury estate on the French Riviera.",
    propertyName: "Villa Belle Époque",
    location: "Cannes • French Riviera",
    category: "Real Estate & Architecture",
    tags: ["Real Estate", "Luxury", "Walkthrough", "Drone"],
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" },
    duration: 45,
    badgeText: "Featured Luxury Estate",
    ctaText: "Inquire Property Film",
    ctaUrl: "/contactus",
    order: 1,
    isFeatured: true,
    isActive: true,
    autoplay: true,
    loop: true,
    muted: true,
    views: 1420,
    playClicks: 890,
    completedViews: 650,
    ctaClicks: 140
  },
  {
    _id: "demo-v2",
    title: "The Penthouse at 432 Park",
    slug: "the-penthouse-at-432-park",
    description: "High-contrast editorial film showcasing panoramic skyline views and custom interior finishes.",
    propertyName: "The Sky Penthouse",
    location: "Manhattan • New York",
    category: "Real Estate & Architecture",
    tags: ["Penthouse", "Manhattan", "Architecture"],
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80" },
    duration: 38,
    badgeText: "High-Rise Penthouse",
    ctaText: "Book Video Edit",
    ctaUrl: "/contactus",
    order: 2,
    isFeatured: false,
    isActive: true,
    autoplay: true,
    loop: true,
    muted: true,
    views: 1180,
    playClicks: 710,
    completedViews: 520,
    ctaClicks: 98
  },
  {
    _id: "demo-v3",
    title: "Château de Montclare Aerial Showcase",
    slug: "chateau-de-montclare-aerial-showcase",
    description: "Dramatic FPV drone cinematography across 200 acres of vineyards and private gardens.",
    propertyName: "Château de Montclare",
    location: "Bordeaux • France",
    category: "Drone & Aerial Films",
    tags: ["Drone", "Estate", "Vineyard"],
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" },
    duration: 60,
    badgeText: "Masterpiece Aerial",
    ctaText: "View Case Study",
    ctaUrl: "/portfolio",
    order: 3,
    isFeatured: true,
    isActive: true,
    autoplay: true,
    loop: true,
    muted: true,
    views: 2450,
    playClicks: 1620,
    completedViews: 1210,
    ctaClicks: 310
  },
  {
    _id: "demo-v4",
    title: "Minimalist Modern Residence",
    slug: "minimalist-modern-residence",
    description: "Sleek architectural lighting study highlighting glass, concrete, and organic timber elements.",
    propertyName: "The Glass Pavilion",
    location: "Beverly Hills • Los Angeles",
    category: "Architectural Design",
    tags: ["Minimalist", "Modern", "Los Angeles"],
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80" },
    duration: 52,
    badgeText: "Modern Architecture",
    ctaText: "Request Quote",
    ctaUrl: "/contactus",
    order: 4,
    isFeatured: false,
    isActive: true,
    autoplay: true,
    loop: true,
    muted: true,
    views: 940,
    playClicks: 580,
    completedViews: 410,
    ctaClicks: 75
  },
  {
    _id: "demo-v5",
    title: "Amalfi Coastal Haven Estate",
    slug: "amalfi-coastal-haven-estate",
    description: "Sun-drenched editorial property reel designed for luxury Mediterranean real estate marketing.",
    propertyName: "Cliffside Villa Amalfi",
    location: "Positano • Italy",
    category: "Luxury Destination",
    tags: ["Amalfi", "Italy", "Luxury"],
    sourceType: "upload",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: { url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80" },
    duration: 42,
    badgeText: "Coastal Sanctuary",
    ctaText: "Explore Suite",
    ctaUrl: "/services",
    order: 5,
    isFeatured: false,
    isActive: true,
    autoplay: true,
    loop: true,
    muted: true,
    views: 1310,
    playClicks: 820,
    completedViews: 610,
    ctaClicks: 115
  }
];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `video-${Date.now()}`;
}

function hashIp(ip = "") {
  if (!ip) return "";
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function extractClientInfo(req) {
  const userAgent = req.headers["user-agent"] || "";
  let deviceType = "Desktop";
  if (/mobile/i.test(userAgent)) deviceType = "Mobile";
  else if (/ipad|tablet/i.test(userAgent)) deviceType = "Tablet";

  let browser = "Unknown";
  if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/safari/i.test(userAgent)) browser = "Safari";
  else if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/edge/i.test(userAgent)) browser = "Edge";

  let operatingSystem = "Unknown";
  if (/windows/i.test(userAgent)) operatingSystem = "Windows";
  else if (/macintosh|mac os/i.test(userAgent)) operatingSystem = "macOS";
  else if (/android/i.test(userAgent)) operatingSystem = "Android";
  else if (/iphone|ipad|ipod/i.test(userAgent)) operatingSystem = "iOS";

  const rawIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
  const ipHash = hashIp(rawIp);
  const sessionId = req.headers["x-session-id"] || req.cookies?.sessionId || ipHash;

  return {
    deviceType,
    browser,
    operatingSystem,
    referrer: req.headers["referer"] || req.headers["referrer"] || "",
    ipHash,
    sessionId
  };
}

async function logAdminActivity(adminId, action, entityId, changes = {}) {
  try {
    if (!adminId || !isDbConnected()) return;
    await AdminActivityLog.create({
      adminId,
      action,
      entityType: "VideoShowcase",
      entityId,
      changes
    });
  } catch (err) {
    console.error("Admin activity logging failed:", err.message);
  }
}

// ----------------------------------------------------
// PUBLIC CONTROLLERS
// ----------------------------------------------------

export async function getPublicVideos(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        message: "Serving default showcase items (Database offline)",
        data: DEFAULT_VIDEO_SHOWCASE_ITEMS
      });
    }

    const now = new Date();
    const query = {
      isActive: true,
      deletedAt: null,
      $and: [
        { $or: [{ publishedAt: null }, { publishedAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }
      ]
    };

    const items = await VideoShowcaseItem.find(query).sort({ order: 1, createdAt: -1 }).lean();

    if (items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Serving default showcase items (No items found)",
        data: DEFAULT_VIDEO_SHOWCASE_ITEMS
      });
    }

    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (err) {
    next(err);
  }
}

export async function getPublicSettings(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        data: {
          heading: VIDEO_SHOWCASE_HEADING,
          subheading: VIDEO_SHOWCASE_SUBHEADING,
          showSection: true,
          showSubheading: true,
          alignment: "center",
          headingColor: "#2F3A2F",
          textColor: "#687567",
          backgroundColor: "#F8FBF7",
          sectionPaddingTop: 96,
          sectionPaddingBottom: 96,
          maxWidth: 1440,
          autoplay: true,
          autoplayDelay: 4000,
          infiniteLoop: true,
          pauseOnHover: true,
          cardRadius: 24,
          cardGap: 20,
          shadowIntensity: 1,
          showArrows: true,
          showPagination: true,
          desktopSlides: 5,
          tabletSlides: 3,
          mobileSlides: 1,
          ctaText: "Explore Our Portfolio",
          ctaUrl: "/portfolio",
          ctaVisible: true,
          ctaNewTab: false,
          anchorId: "video-showcase"
        }
      });
    }

    let settings = await VideoShowcaseSettings.findOne({ settingsKey: "video-showcase" }).lean();
    if (!settings) {
      settings = await VideoShowcaseSettings.create({ settingsKey: "video-showcase" });
    }

    return res.status(200).json({
      success: true,
      data: normalizeVideoShowcaseCopy(settings)
    });
  } catch (err) {
    next(err);
  }
}

export async function getPublicVideoBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    if (!isDbConnected()) {
      const found = DEFAULT_VIDEO_SHOWCASE_ITEMS.find((v) => v.slug === slug);
      if (!found) return res.status(404).json({ success: false, message: "Video not found", data: null });
      return res.status(200).json({ success: true, data: found });
    }

    const item = await VideoShowcaseItem.findOne({ slug, isActive: true, deletedAt: null }).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function trackImpression(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !isDbConnected()) {
      return res.status(200).json({ success: true, message: "Tracked" });
    }

    const info = extractClientInfo(req);
    await VideoAnalytics.create({ videoId: id, eventType: "impression", ...info });
    await VideoShowcaseItem.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return res.status(200).json({ success: true, message: "Impression recorded" });
  } catch (err) {
    next(err);
  }
}

export async function trackPlay(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !isDbConnected()) {
      return res.status(200).json({ success: true, message: "Tracked" });
    }

    const info = extractClientInfo(req);
    await VideoAnalytics.create({ videoId: id, eventType: "play", ...info });
    await VideoShowcaseItem.findByIdAndUpdate(id, { $inc: { playClicks: 1, views: 1 } });

    return res.status(200).json({ success: true, message: "Play recorded" });
  } catch (err) {
    next(err);
  }
}

export async function trackComplete(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !isDbConnected()) {
      return res.status(200).json({ success: true, message: "Tracked" });
    }

    const info = extractClientInfo(req);
    await VideoAnalytics.create({ videoId: id, eventType: "complete", ...info });
    await VideoShowcaseItem.findByIdAndUpdate(id, { $inc: { completedViews: 1 } });

    return res.status(200).json({ success: true, message: "Completion recorded" });
  } catch (err) {
    next(err);
  }
}

export async function trackCtaClick(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !isDbConnected()) {
      return res.status(200).json({ success: true, message: "Tracked" });
    }

    const info = extractClientInfo(req);
    await VideoAnalytics.create({ videoId: id, eventType: "cta_click", ...info });
    await VideoShowcaseItem.findByIdAndUpdate(id, { $inc: { ctaClicks: 1 } });

    return res.status(200).json({ success: true, message: "CTA click recorded" });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// ADMIN CONTROLLERS
// ----------------------------------------------------

export async function getAdminVideos(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, category, sourceType, featured, isTrash, sort } = req.query;

    const query = {};

    if (isTrash === "true") {
      query.deletedAt = { $ne: null };
    } else {
      query.deletedAt = null;
    }

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (featured === "true") query.isFeatured = true;
    if (featured === "false") query.isFeatured = false;
    if (category) query.category = category;
    if (sourceType) query.sourceType = sourceType;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { propertyName: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    let sortObj = { order: 1, createdAt: -1 };
    if (sort === "title") sortObj = { title: 1 };
    if (sort === "date") sortObj = { createdAt: -1 };
    if (sort === "views") sortObj = { views: -1 };
    if (sort === "order") sortObj = { order: 1 };

    const total = await VideoShowcaseItem.countDocuments(query);
    const items = await VideoShowcaseItem.find(query).sort(sortObj).skip(skip).limit(limit);

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function createAdminVideo(req, res, next) {
  try {
    const payload = req.body;
    if (!payload.title) {
      return res.status(400).json({ success: false, message: "Video title is required", data: null });
    }

    let baseSlug = slugify(payload.slug || payload.title);
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await VideoShowcaseItem.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${count++}`;
    }

    const nextOrder = payload.order ?? ((await VideoShowcaseItem.countDocuments({ deletedAt: null })) + 1);

    const item = await VideoShowcaseItem.create({
      ...payload,
      slug: uniqueSlug,
      order: nextOrder,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    await logAdminActivity(req.user?.id, "CREATE_VIDEO", item._id, { title: item.title });

    return res.status(201).json({
      success: true,
      message: "Video showcase item created successfully",
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminVideoById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const item = await VideoShowcaseItem.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const existing = await VideoShowcaseItem.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    const payload = req.body;
    if (payload.slug && payload.slug !== existing.slug) {
      let baseSlug = slugify(payload.slug);
      let uniqueSlug = baseSlug;
      let count = 1;
      while (await VideoShowcaseItem.findOne({ slug: uniqueSlug, _id: { $ne: id } })) {
        uniqueSlug = `${baseSlug}-${count++}`;
      }
      payload.slug = uniqueSlug;
    }

    payload.updatedBy = req.user?.id;

    const updated = await VideoShowcaseItem.findByIdAndUpdate(id, payload, { new: true, runValidators: true });

    await logAdminActivity(req.user?.id, "UPDATE_VIDEO", id, { title: updated.title });

    return res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function softDeleteAdminVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const item = await VideoShowcaseItem.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), isActive: false, updatedBy: req.user?.id },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    await logAdminActivity(req.user?.id, "DELETE_VIDEO", id, { title: item.title });

    return res.status(200).json({
      success: true,
      message: "Video moved to trash successfully",
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function permanentDeleteAdminVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const item = await VideoShowcaseItem.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    // Safe media cleanup
    if (item.videoFile?.url) safeDeleteFile(item.videoFile.url);
    if (item.mobileVideoFile?.url) safeDeleteFile(item.mobileVideoFile.url);
    if (item.thumbnail?.url) safeDeleteFile(item.thumbnail.url);
    if (item.mobileThumbnail?.url) safeDeleteFile(item.mobileThumbnail.url);
    if (item.captionUrl) safeDeleteFile(item.captionUrl);

    await VideoAnalytics.deleteMany({ videoId: id });
    await VideoShowcaseItem.findByIdAndDelete(id);

    await logAdminActivity(req.user?.id, "PERMANENT_DELETE_VIDEO", id, { title: item.title });

    return res.status(200).json({
      success: true,
      message: "Video permanently deleted",
      data: null
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleAdminStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const item = await VideoShowcaseItem.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    const nextActive = req.body.active !== undefined ? req.body.active : !item.isActive;
    item.isActive = nextActive;
    item.updatedBy = req.user?.id;
    await item.save();

    await logAdminActivity(req.user?.id, "CHANGE_STATUS", id, { isActive: nextActive });

    return res.status(200).json({
      success: true,
      message: `Video ${nextActive ? "activated" : "deactivated"} successfully`,
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleAdminFeatured(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const item = await VideoShowcaseItem.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    const nextFeatured = req.body.isFeatured !== undefined ? req.body.isFeatured : !item.isFeatured;
    item.isFeatured = nextFeatured;
    item.updatedBy = req.user?.id;
    await item.save();

    await logAdminActivity(req.user?.id, "CHANGE_FEATURED", id, { isFeatured: nextFeatured });

    return res.status(200).json({
      success: true,
      message: `Video ${nextFeatured ? "featured" : "unfeatured"} successfully`,
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminVideos(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Items array is required for reordering", data: null });
    }

    const bulkOps = items
      .filter((i) => mongoose.isValidObjectId(i.id))
      .map((i) => ({
        updateOne: {
          filter: { _id: i.id },
          update: { $set: { order: Number(i.order) } }
        }
      }));

    if (bulkOps.length > 0) {
      await VideoShowcaseItem.bulkWrite(bulkOps);
      await logAdminActivity(req.user?.id, "REORDER_VIDEOS", null, { count: bulkOps.length });
    }

    const updated = await VideoShowcaseItem.find({ deletedAt: null }).sort({ order: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Videos reordered successfully",
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function duplicateAdminVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const original = await VideoShowcaseItem.findById(id);
    if (!original) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    const plain = original.toObject();
    delete plain._id;
    delete plain.createdAt;
    delete plain.updatedAt;
    delete plain.__v;

    plain.title = `${plain.title} (Copy)`;
    plain.slug = `${plain.slug}-copy-${Date.now()}`;
    plain.views = 0;
    plain.playClicks = 0;
    plain.completedViews = 0;
    plain.ctaClicks = 0;
    plain.createdBy = req.user?.id;
    plain.updatedBy = req.user?.id;

    const copy = await VideoShowcaseItem.create(plain);
    await logAdminActivity(req.user?.id, "CREATE_VIDEO", copy._id, { title: copy.title, duplicatedFrom: id });

    return res.status(201).json({
      success: true,
      message: "Video duplicated successfully",
      data: copy
    });
  } catch (err) {
    next(err);
  }
}

export async function restoreAdminVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const restored = await VideoShowcaseItem.findByIdAndUpdate(
      id,
      { deletedAt: null, isActive: true, updatedBy: req.user?.id },
      { new: true }
    );

    if (!restored) {
      return res.status(404).json({ success: false, message: "Video not found", data: null });
    }

    await logAdminActivity(req.user?.id, "RESTORE_VIDEO", id, { title: restored.title });

    return res.status(200).json({
      success: true,
      message: "Video restored from trash",
      data: restored
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkAdminAction(req, res, next) {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No video IDs provided", data: null });
    }

    const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: "No valid ObjectIds provided", data: null });
    }

    let update = {};
    if (action === "activate") update = { isActive: true };
    else if (action === "deactivate") update = { isActive: false };
    else if (action === "feature") update = { isFeatured: true };
    else if (action === "unfeature") update = { isFeatured: false };
    else if (action === "delete") update = { deletedAt: new Date(), isActive: false };
    else if (action === "restore") update = { deletedAt: null, isActive: true };
    else {
      return res.status(400).json({ success: false, message: "Invalid bulk action", data: null });
    }

    update.updatedBy = req.user?.id;

    const result = await VideoShowcaseItem.updateMany({ _id: { $in: validIds } }, { $set: update });
    await logAdminActivity(req.user?.id, "BULK_ACTION", null, { action, count: validIds.length });

    return res.status(200).json({
      success: true,
      message: `Bulk ${action} executed for ${result.modifiedCount} items`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminSettings(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        data: {
          heading: VIDEO_SHOWCASE_HEADING,
          subheading: VIDEO_SHOWCASE_SUBHEADING,
          showSection: true,
          showSubheading: true,
          alignment: "center",
          headingColor: "#2F3A2F",
          textColor: "#687567",
          backgroundColor: "#F8FBF7",
          sectionPaddingTop: 80,
          sectionPaddingBottom: 80,
          maxWidth: 1440,
          autoplay: true,
          autoplayDelay: 5000,
          infiniteLoop: true,
          pauseOnHover: true,
          hoverPlayback: true,
          centerAutoplay: true,
          enableParallax: true,
          animationDuration: 0.8,
          cardRadius: 24,
          cardGap: 20,
          shadowIntensity: 1,
          showArrows: true,
          showPagination: true,
          desktopSlides: 5,
          tabletSlides: 3,
          mobileSlides: 1,
          ctaText: "Explore Our Portfolio",
          ctaUrl: "/portfolio",
          ctaVisible: true,
          ctaNewTab: false,
          anchorId: "video-showcase"
        }
      });
    }

    let settings = await VideoShowcaseSettings.findOne({ settingsKey: "video-showcase" });
    if (!settings) {
      settings = await VideoShowcaseSettings.create({ settingsKey: "video-showcase" });
    }

    return res.status(200).json({
      success: true,
      data: normalizeVideoShowcaseCopy(settings)
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminSettings(req, res, next) {
  try {
    const payload = req.body;
    payload.updatedBy = req.user?.id;

    const settings = await VideoShowcaseSettings.findOneAndUpdate(
      { settingsKey: "video-showcase" },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    await logAdminActivity(req.user?.id, "UPDATE_SETTINGS", settings._id, payload);

    return res.status(200).json({
      success: true,
      message: "Video showcase settings updated successfully",
      data: settings
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminAnalytics(req, res, next) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const totalVideos = await VideoShowcaseItem.countDocuments({ deletedAt: null });
    const activeVideos = await VideoShowcaseItem.countDocuments({ deletedAt: null, isActive: true });
    const inactiveVideos = await VideoShowcaseItem.countDocuments({ deletedAt: null, isActive: false });
    const featuredVideos = await VideoShowcaseItem.countDocuments({ deletedAt: null, isFeatured: true });

    // Aggregate stats from VideoShowcaseItem
    const aggregateTotals = await VideoShowcaseItem.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalPlayClicks: { $sum: "$playClicks" },
          totalCompletedViews: { $sum: "$completedViews" },
          totalCtaClicks: { $sum: "$ctaClicks" }
        }
      }
    ]);

    const totals = aggregateTotals[0] || {
      totalViews: 0,
      totalPlayClicks: 0,
      totalCompletedViews: 0,
      totalCtaClicks: 0
    };

    // Device breakdown from VideoAnalytics
    const deviceBreakdown = await VideoAnalytics.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      { $group: { _id: "$deviceType", count: { $sum: 1 } } }
    ]);

    // Event type breakdown
    const eventBreakdown = await VideoAnalytics.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } }
    ]);

    // Top videos by views
    const topVideos = await VideoShowcaseItem.find({ deletedAt: null })
      .sort({ views: -1, playClicks: -1 })
      .limit(5)
      .select("title propertyName views playClicks completedViews ctaClicks thumbnail");

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalVideos,
          activeVideos,
          inactiveVideos,
          featuredVideos,
          ...totals,
          playRate: totals.totalViews ? ((totals.totalPlayClicks / totals.totalViews) * 100).toFixed(1) : "0",
          completionRate: totals.totalPlayClicks
            ? ((totals.totalCompletedViews / totals.totalPlayClicks) * 100).toFixed(1)
            : "0",
          ctr: totals.totalViews ? ((totals.totalCtaClicks / totals.totalViews) * 100).toFixed(1) : "0"
        },
        deviceBreakdown,
        eventBreakdown,
        topVideos
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminActivityLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const total = await AdminActivityLog.countDocuments({ entityType: "VideoShowcase" });
    const logs = await AdminActivityLog.find({ entityType: "VideoShowcase" })
      .populate("adminId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}

import mongoose from "mongoose";
import Service from "../models/Service.model.js";
import PortfolioItem from "../models/PortfolioItem.model.js";
import WeddingGalleryItem from "../models/WeddingGalleryItem.model.js";
import BrandCollaboration from "../models/BrandCollaboration.model.js";
import BlogPost from "../models/BlogPost.model.js";
import TeamMember from "../models/TeamMember.model.js";
import Partner from "../models/Partner.model.js";
import Enquiry from "../models/Enquiry.model.js";
import SiteSetting from "../models/SiteSetting.model.js";
import AuditLog from "../models/AuditLog.model.js";
import User from "../models/User.model.js";
import { deleteUnreferencedMedia, extractMediaPaths } from "../utils/mediaCleanup.js";

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

const ENTITY_CONFIG = {
  Service: {
    publicFilter: { isPublished: true },
    orderField: "order",
    publishField: "isPublished",
    normalizePayload(payload = {}) {
      const next = { ...payload };
      if (next.active !== undefined && next.isPublished === undefined) next.isPublished = Boolean(next.active);
      if (!next.slug && next.title) next.slug = slugify(next.title);
      delete next.active;
      return next;
    }
  },
  PortfolioItem: {
    publicFilter: { isPublished: true },
    orderField: "order",
    publishField: "isPublished",
    normalizePayload(payload = {}) {
      const next = { ...payload };
      if (next.active !== undefined && next.isPublished === undefined) next.isPublished = Boolean(next.active);
      if (!next.image && next.coverImage) next.image = next.coverImage;
      if (!next.coverImage && next.image) next.coverImage = next.image;
      if (!next.slug && next.title) next.slug = slugify(next.title);
      delete next.active;
      return next;
    }
  },
  WeddingGalleryItem: {
    publicFilter: { isPublished: true },
    orderField: "order",
    publishField: "isPublished",
    normalizePayload(payload = {}) {
      const next = { ...payload };
      if (next.active !== undefined && next.isPublished === undefined) next.isPublished = Boolean(next.active);
      if (!next.image && next.imageUrl) next.image = next.imageUrl;
      if (!next.image && next.src) next.image = next.src;
      if (!next.image && next.coverImage) next.image = next.coverImage;
      if (!next.coverImage && next.image) next.coverImage = next.image;
      if (next.coupleName !== undefined && next.coupleNames === undefined) next.coupleNames = next.coupleName;
      delete next.active;
      delete next.imageUrl;
      delete next.src;
      delete next.coupleName;
      return next;
    }
  },
  BrandCollaboration: {
    publicFilter: { published: true },
    orderField: "displayOrder",
    publishField: "published",
    normalizePayload(payload = {}) {
      const next = { ...payload };
      if (next.active !== undefined && next.published === undefined) next.published = Boolean(next.active);
      if (next.order !== undefined && next.displayOrder === undefined) next.displayOrder = Number(next.order);
      if (!next.coverImage && next.heroImage) next.coverImage = next.heroImage;
      if (!next.brandLogo && next.logo) next.brandLogo = next.logo;
      if (!next.shortDescription && next.description) next.shortDescription = next.description;
      if (!next.fullDescription && (next.description || next.shortDescription)) {
        next.fullDescription = next.description || next.shortDescription;
      }
      if (!next.slug && next.title) next.slug = slugify(next.title);
      delete next.active;
      delete next.order;
      delete next.heroImage;
      delete next.logo;
      delete next.description;
      return next;
    }
  },
  BlogPost: {
    publicFilter: { status: "published" },
    orderField: "order",
    publishField: "status",
    normalizePayload(payload = {}) {
      const next = { ...payload };
      if (next.active !== undefined && next.status === undefined) next.status = next.active ? "published" : "draft";
      if (next.isPublished !== undefined && next.status === undefined) next.status = next.isPublished ? "published" : "draft";
      if (typeof next.author === "string") next.author = { name: next.author };
      if (next.authorName || next.authorAvatar) {
        next.author = {
          ...(typeof next.author === "object" ? next.author : {}),
          ...(next.authorName ? { name: next.authorName } : {}),
          ...(next.authorAvatar ? { avatar: next.authorAvatar } : {})
        };
      }
      if (!next.author?.name) next.author = { ...(next.author || {}), name: "The Editing Table" };
      if (!next.slug && next.title) next.slug = slugify(next.title);
      delete next.active;
      delete next.isPublished;
      delete next.authorName;
      delete next.authorAvatar;
      return next;
    }
  },
  TeamMember: {
    publicFilter: { active: true },
    orderField: "displayOrder",
    publishField: "active",
    normalizePayload(payload = {}) {
      const next = { ...payload };
      if (next.order !== undefined && next.displayOrder === undefined) next.displayOrder = Number(next.order);
      if (!next.fullName && next.name) next.fullName = next.name;
      if (!next.designation && next.role) next.designation = next.role;
      if (!next.shortBio && next.bio) next.shortBio = next.bio;
      if (!next.fullBio && (next.bio || next.shortBio)) next.fullBio = next.bio || next.shortBio;
      if (!next.profileImage && next.avatar) next.profileImage = next.avatar;
      if (!next.slug && (next.fullName || next.name)) next.slug = slugify(next.fullName || next.name);
      delete next.order;
      delete next.name;
      delete next.role;
      delete next.bio;
      delete next.avatar;
      return next;
    }
  },
  Partner: {
    publicFilter: { active: true },
    orderField: "order",
    publishField: "active",
    normalizePayload(payload = {}) {
      const next = { ...payload };
      const img = next.image || next.logo || next.logoUrl || next.imageUrl || next.thumbnail || "";
      const normalizedImg = img ? String(img).replace(/\\/g, "/") : "";
      next.image = normalizedImg;
      next.logo = normalizedImg;
      return next;
    }
  }
};

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `item-${Date.now()}`;
}

function sanitizeMutablePayload(payload = {}) {
  const next = { ...payload };
  delete next._id;
  delete next.id;
  delete next.__v;
  delete next.createdAt;
  delete next.updatedAt;
  return next;
}

function getEntityConfig(entityName) {
  return ENTITY_CONFIG[entityName] || {
    publicFilter: { active: true },
    orderField: "order",
    publishField: "active",
    normalizePayload(payload = {}) {
      return { ...payload };
    }
  };
}

function requireDb(res) {
  if (isDbConnected()) return true;
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. CMS data cannot be retrieved or changed.",
    data: null
  });
  return false;
}

function buildSearchQuery(search) {
  if (!search) return null;
  return {
    $or: [
      { title: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { brandName: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { shortDescription: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } }
    ]
  };
}

function sortFor(config, admin = false) {
  return { [config.orderField]: 1, createdAt: admin ? -1 : 1 };
}

function toPlain(doc) {
  if (!doc) return doc;
  if (typeof doc.toObject === "function") return doc.toObject();
  return { ...doc };
}

function normalizeDocForClient(doc, entityName) {
  const item = toPlain(doc);
  if (!item) return item;

  if (entityName === "Service") {
    item.active = item.isPublished !== false;
  }
  if (entityName === "PortfolioItem") {
    item.active = item.isPublished !== false;
    item.coverImage = item.coverImage || item.image || "";
  }
  if (entityName === "WeddingGalleryItem") {
    item.active = item.isPublished !== false;
    item.imageUrl = item.imageUrl || item.image || "";
    item.src = item.src || item.image || "";
    item.coverImage = item.coverImage || item.image || "";
    item.coupleName = item.coupleName || item.coupleNames || "";
  }
  if (entityName === "BrandCollaboration") {
    item.active = item.published !== false;
    item.order = item.displayOrder ?? 0;
    item.heroImage = item.heroImage || item.coverImage || "";
    item.logo = item.logo || item.brandLogo || "";
    item.description = item.description || item.shortDescription || item.fullDescription || "";
  }
  if (entityName === "BlogPost") {
    item.active = item.status === "published";
    item.isPublished = item.status === "published";
    item.order = item.order ?? 0;
  }
  if (entityName === "TeamMember") {
    item.order = item.displayOrder ?? 0;
    item.name = item.name || item.fullName || "";
    item.role = item.role || item.designation || "";
    item.bio = item.bio || item.shortBio || item.fullBio || "";
    item.avatar = item.avatar || item.profileImage || "";
    item.image = item.image || item.profileImage || "";
  }
  if (entityName === "Partner") {
    const img = item.image || item.logo || item.logoUrl || item.imageUrl || item.thumbnail || "";
    const normalizedImg = img ? String(img).replace(/\\/g, "/") : "";
    item.image = normalizedImg;
    item.logo = normalizedImg;
  }

  return item;
}

// Helper for generic audit logging
async function logAudit(user, action, entity, entityId, details) {
  if (!isDbConnected()) return;
  try {
    await AuditLog.create({
      user: user?.id,
      userEmail: user?.email || "system",
      action,
      entity,
      entityId,
      details
    });
  } catch {
    // Fail silently for audit logs
  }
}

// --- CMS OVERVIEW STATS ---
export async function getDashboardStats(req, res) {
  try {
    if (!requireDb(res)) return;

    const [enquiriesCount, newEnquiries, blogCount, portfolioCount, galleryCount, teamCount, partnerCount] =
      await Promise.all([
        Enquiry.countDocuments().catch(() => 0),
        Enquiry.countDocuments({ status: "new" }).catch(() => 0),
        BlogPost.countDocuments().catch(() => 0),
        PortfolioItem.countDocuments().catch(() => 0),
        WeddingGalleryItem.countDocuments().catch(() => 0),
        TeamMember.countDocuments().catch(() => 0),
        Partner.countDocuments().catch(() => 0)
      ]);

    const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(10).catch(() => []);
    const recentEnquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(5).catch(() => []);

    const payload = {
      stats: {
        totalEnquiries: enquiriesCount,
        newEnquiries,
        totalBlogPosts: blogCount,
        totalPortfolioItems: portfolioCount,
        totalGalleryItems: galleryCount,
        totalTeamMembers: teamCount,
        totalPartners: partnerCount
      },
      recentLogs,
      recentEnquiries
    };

    return res.json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: payload
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Dashboard stats fetch failed", data: null });
  }
}

const DEFAULT_AUTHENTIC_SERVICES = [
  {
    title: "Photo Editing",
    slug: "photo-editing",
    category: "Photo Editing",
    tagline: "Professional image refinement designed to enhance photographs",
    description: "Professional image refinement designed to enhance photographs while maintaining their natural character and artistic integrity.",
    turnaround: "24-48 Hours",
    icon: "Sparkles",
    features: ["Color Correction", "Tone Balancing", "Noise Reduction", "Natural Enhancement"],
    deliverables: ["High-Res JPEG / TIFF Master Files", "Lightroom Presets / XMP Sidecars"],
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 1
  },
  {
    title: "Luxury Retouching",
    slug: "retouching",
    category: "Retouching",
    tagline: "Detailed retouching focused on skin, textures and tones",
    description: "Detailed retouching focused on skin, textures, tones and visual consistency for fashion, portraiture and high-end editorial imagery.",
    turnaround: "48-72 Hours",
    icon: "Award",
    features: ["Frequency Separation", "Micro Dodge & Burn", "Skin Tone Matching", "High-Fashion Finishing"],
    deliverables: ["Master 16-bit PSD / TIFF", "Web & Print Optimized Exports"],
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 2
  },
  {
    title: "High-End Color Grading",
    slug: "color-grading",
    category: "Color Grading",
    tagline: "Creative color treatment designed to establish cinematic identity",
    description: "Creative color treatment designed to establish mood, consistency and cinematic visual identity across stills and motion pictures.",
    turnaround: "48-72 Hours",
    icon: "Palette",
    features: ["35mm Film Emulation", "Custom Look Development", "HDR & SDR Color Passes", "Skin Tone Preservation"],
    deliverables: ["LUT Packages (.cube)", "ProRes 4444 XQ Graded Masters"],
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 3
  },
  {
    title: "Crop & Refine",
    slug: "crop-and-refine",
    category: "Photo Editing",
    tagline: "Thoughtful framing and image refinement",
    description: "Thoughtful framing and image refinement to create stronger visual composition and publication-ready alignment.",
    turnaround: "24 Hours",
    icon: "Sparkles",
    features: ["Aspect Ratio Optimization", "Horizon & Geometry Correction", "Subject Centering"],
    deliverables: ["Multi-Format Aspect Ratio Exports (1:1, 4:5, 16:9)"],
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 4
  },
  {
    title: "Detail Enhancement",
    slug: "detail-enhancement",
    category: "Retouching",
    tagline: "Improving clarity and visual details naturally",
    description: "Improving clarity, sharpness and important visual details without creating an artificial or over-processed appearance.",
    turnaround: "24-48 Hours",
    icon: "Sparkles",
    features: ["Texture Recovery", "Micro-Contrast Tuning", "Selective Sharpening", "Artifact Removal"],
    deliverables: ["Crisp High-Resolution Deliverables"],
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 5
  },
  {
    title: "Video Editing",
    slug: "video-editing",
    category: "Video Editing",
    tagline: "Professional storytelling through selected footage and pacing",
    description: "Professional storytelling through carefully selected footage, pacing, sound and visual treatments for films, commercials and reels.",
    turnaround: "3-5 Days",
    icon: "Film",
    features: ["RAW Footage Assembly", "Dialogue & Sound Design", "Dynamic Pacing", "Titling & Motion Graphics"],
    deliverables: ["Master 4K Video Files (MP4/ProRes)", "Social Media Cuts (9:16 & 1:1)"],
    image: "https://images.unsplash.com/photo-1574717024453-354056aef981?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 6
  },
  {
    title: "Wedding Post-Production",
    slug: "wedding-post-production",
    category: "Wedding Post-Production",
    tagline: "Creative editing of wedding photos and films",
    description: "Creative editing of wedding photographs and films to preserve emotions and tell the complete story beautifully.",
    turnaround: "5-7 Days",
    icon: "Film",
    features: ["Full Story Culling", "Consistent Studio Color Grade", "Highlight Film & Teaser Edit", "Audio Synchronization"],
    deliverables: ["Full Gallery Lightroom Catalog", "Master Cinematic Wedding Film & Teaser"],
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 7
  },
  {
    title: "Film Post-Production",
    slug: "film-post-production",
    category: "Film Post-Production",
    tagline: "Transforming raw footage into refined visual stories",
    description: "Transforming raw footage into refined visual stories using professional editing, color grading, sound finishing and visual polishing.",
    turnaround: "7-10 Days",
    icon: "Film",
    features: ["Full Offline & Online Edit", "Dolby Vision / HDR Grading", "Master Audio Mixing", "Final DCP Creation"],
    deliverables: ["ProRes Master", "DCP Package", "Web Master"],
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=85",
    isPublished: true,
    order: 8
  }
];

function createCRUDActions(Model, entityName) {
  const config = getEntityConfig(entityName);

  return {
    // Public listing (active/published items)
    getAll: async (req, res) => {
      try {
        if (!requireDb(res)) return;

        if (entityName === "Service") {
          const count = await Model.countDocuments().catch(() => 0);
          if (count === 0) {
            await Model.insertMany(DEFAULT_AUTHENTIC_SERVICES).catch(() => null);
          }
        }

        const { search, category } = req.query;
        const query = { ...config.publicFilter };

        const searchQuery = buildSearchQuery(search);
        if (searchQuery) query.$and = [searchQuery];
        if (category && category !== "All") query.category = category;

        const docs = await Model.find(query).sort(sortFor(config)).lean();
        const items = docs.map((doc) => normalizeDocForClient(doc, entityName));
        return res.json({
          success: true,
          message: `${entityName} records retrieved successfully`,
          data: items
        });
      } catch (error) {
        return res.status(500).json({ success: false, message: error.message || `${entityName} fetch failed`, data: null });
      }
    },

    // Admin listing (all items including drafts/inactive)
    getAdmin: async (req, res) => {
      try {
        if (!requireDb(res)) return;

        const { search, category } = req.query;
        const query = {};

        const searchQuery = buildSearchQuery(search);
        if (searchQuery) Object.assign(query, searchQuery);
        if (category && category !== "All") query.category = category;

        const docs = await Model.find(query).sort(sortFor(config, true)).lean();
        const items = docs.map((doc) => normalizeDocForClient(doc, entityName));
        return res.json({
          success: true,
          message: `${entityName} admin records retrieved successfully`,
          data: items
        });
      } catch (error) {
        return res.status(500).json({ success: false, message: error.message || `${entityName} admin fetch failed`, data: null });
      }
    },

    getOne: async (req, res) => {
      try {
        if (!requireDb(res)) return;
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
        }
        const item = await Model.findOne({ _id: req.params.id, ...config.publicFilter }).lean();
        if (!item) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
        return res.json({ success: true, message: `${entityName} retrieved successfully`, data: normalizeDocForClient(item, entityName) });
      } catch (error) {
        return res.status(500).json({ success: false, message: error.message || `${entityName} lookup failed`, data: null });
      }
    },

    create: async (req, res) => {
      try {
        if (!requireDb(res)) return;
        const payload = sanitizeMutablePayload(config.normalizePayload(req.body));

        if (payload[config.orderField] === undefined && config.orderField !== "publishedAt") {
          const highest = await Model.findOne().sort({ [config.orderField]: -1 }).select(config.orderField).lean();
          payload[config.orderField] = Number(highest?.[config.orderField] || 0) + 1;
        }

        const item = await Model.create(payload);
        await logAudit(req.user, `CREATE_${entityName.toUpperCase()}`, entityName, item._id.toString(), payload);
        return res.status(201).json({ success: true, message: `${entityName} created successfully`, data: normalizeDocForClient(item, entityName) });
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message || `${entityName} create failed`, data: null });
      }
    },

    update: async (req, res) => {
      try {
        if (!requireDb(res)) return;
        const payload = sanitizeMutablePayload(config.normalizePayload(req.body));
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
        }

        const existing = await Model.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });

        const item = await Model.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true });
        if (!item) {
          return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
        }

        const oldFiles = extractMediaPaths(existing);
        const newFiles = extractMediaPaths(item);
        const removedFiles = oldFiles.filter((file) => !newFiles.includes(file));
        await deleteUnreferencedMedia(removedFiles);

        await logAudit(req.user, `UPDATE_${entityName.toUpperCase()}`, entityName, item._id.toString(), payload);
        return res.json({ success: true, message: `${entityName} updated successfully`, data: normalizeDocForClient(item, entityName) });
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message || `${entityName} update failed`, data: null });
      }
    },

    updateStatus: async (req, res) => {
      try {
        if (!requireDb(res)) return;
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
        }
        const { active, isPublished, published, status } = req.body;
        const updateData = {};
        const desired = active ?? isPublished ?? published;
        if (config.publishField === "status") {
          if (status !== undefined && !["draft", "published"].includes(status)) {
            return res.status(400).json({ success: false, message: "Status must be draft or published.", data: null });
          }
          if (status !== undefined) updateData.status = status;
          else if (desired !== undefined) updateData.status = desired ? "published" : "draft";
        } else if (desired !== undefined) {
          updateData[config.publishField] = Boolean(desired);
        } else if (status !== undefined && ["published", "active", "inactive", "draft"].includes(status)) {
          updateData[config.publishField] = status === "published" || status === "active";
        }

        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ success: false, message: "A valid status value is required.", data: null });
        }

        const item = await Model.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });

        await logAudit(req.user, `UPDATE_STATUS_${entityName.toUpperCase()}`, entityName, id, updateData);
        return res.json({ success: true, message: `${entityName} status updated successfully`, data: normalizeDocForClient(item, entityName) });
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message || `${entityName} status update failed`, data: null });
      }
    },

    reorder: async (req, res) => {
      try {
        if (!requireDb(res)) return;
        const items = req.body.items || req.body.slides || [];
        if (!Array.isArray(items)) {
          return res.status(400).json({ success: false, message: "Please provide an items array.", data: null });
        }

        const validItems = items
          .map((it, index) => ({ id: it.id || it._id, order: Number(it.order ?? index + 1) }))
          .filter((it) => mongoose.Types.ObjectId.isValid(it.id));

        const uniqueIds = new Set(validItems.map((item) => String(item.id)));
        if (validItems.length !== items.length || uniqueIds.size !== validItems.length) {
          return res.status(400).json({ success: false, message: "One or more record IDs are invalid.", data: null });
        }

        const existingCount = await Model.countDocuments({ _id: { $in: validItems.map((item) => item.id) } });
        if (existingCount !== validItems.length) {
          return res.status(404).json({ success: false, message: "One or more records no longer exist.", data: null });
        }

        const bulkOps = validItems.map((it) => ({
          updateOne: {
            filter: { _id: it.id },
            update: { $set: { [config.orderField]: it.order } }
          }
        }));
        if (bulkOps.length) await Model.bulkWrite(bulkOps);
        await logAudit(req.user, `REORDER_${entityName.toUpperCase()}`, entityName, "bulk", { count: validItems.length });

        const docs = await Model.find().sort(sortFor(config, true)).lean();
        return res.json({
          success: true,
          message: `${entityName} reordered successfully`,
          data: docs.map((doc) => normalizeDocForClient(doc, entityName))
        });
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message || `${entityName} reorder failed`, data: null });
      }
    },

    delete: async (req, res) => {
      try {
        if (!requireDb(res)) return;
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
        }
        const deleted = await Model.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
        const files = extractMediaPaths(deleted);
        await deleteUnreferencedMedia(files);
        await logAudit(req.user, `DELETE_${entityName.toUpperCase()}`, entityName, id);
        return res.json({ success: true, message: `${entityName} deleted successfully`, data: { id } });
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message || `${entityName} delete failed`, data: null });
      }
    },

    bulkDelete: async (req, res) => {
      try {
        if (!requireDb(res)) return;
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
          return res.status(400).json({ success: false, message: "Please provide an ids array.", data: null });
        }
        const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length !== ids.length) {
          return res.status(400).json({ success: false, message: "One or more record IDs are invalid.", data: null });
        }

        const items = await Model.find({ _id: { $in: validIds } });
        const result = await Model.deleteMany({ _id: { $in: validIds } });

        const files = items.flatMap(extractMediaPaths);
        await deleteUnreferencedMedia(files);

        await logAudit(req.user, `BULK_DELETE_${entityName.toUpperCase()}`, entityName, "bulk", { count: validIds.length });
        return res.json({
          success: true,
          message: `Selected ${entityName} items deleted successfully`,
          data: { deletedCount: result.deletedCount }
        });
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message || "Bulk deletion failed", data: null });
      }
    }
  };
}

export const servicesCMS = createCRUDActions(Service, "Service");
export const portfolioCMS = createCRUDActions(PortfolioItem, "PortfolioItem");
export const weddingGalleryCMS = createCRUDActions(WeddingGalleryItem, "WeddingGalleryItem");
export const collaborationsCMS = createCRUDActions(BrandCollaboration, "BrandCollaboration");
export const blogCMS = createCRUDActions(BlogPost, "BlogPost");
export const teamCMS = createCRUDActions(TeamMember, "TeamMember");
export const partnersCMS = createCRUDActions(Partner, "Partner");

// --- ENQUIRIES MANAGEMENT ---
export async function getEnquiries(req, res) {
  try {
    if (!requireDb(res)) return;

    const { status, search } = req.query;
    const query = {};
    if (status && status !== "All") query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const enquiries = await Enquiry.find(query).sort({ createdAt: -1 }).catch(() => []);
    return res.json({ success: true, message: "Enquiries retrieved successfully", data: enquiries });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Enquiries fetch failed", data: null });
  }
}

export async function updateEnquiryStatus(req, res) {
  try {
    if (!requireDb(res)) return;
    const { id } = req.params;
    const { status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry ID", data: null });
    }
    const item = await Enquiry.findByIdAndUpdate(id, { $set: { status } }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Enquiry not found", data: null });
    await logAudit(req.user, "UPDATE_ENQUIRY_STATUS", "Enquiry", id, { status });
    return res.json({ success: true, message: "Enquiry status updated successfully", data: item });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Enquiry status update failed", data: null });
  }
}

export async function deleteEnquiry(req, res) {
  try {
    if (!requireDb(res)) return;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry ID", data: null });
    }
    const deleted = await Enquiry.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Enquiry not found", data: null });
    return res.json({ success: true, message: "Enquiry deleted successfully", data: { id } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Enquiry delete failed", data: null });
  }
}

// --- SITE SETTINGS ---
export async function getSiteSettings(req, res) {
  try {
    if (!requireDb(res)) return;
    const publicKeys = ["siteName", "metaTitle", "metaDescription", "maintenanceMode", "publicContent"];
    const settings = await SiteSetting.find({ key: { $in: publicKeys } });
    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    return res.json({ success: true, message: "Site settings retrieved successfully", data: settingsMap });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Site settings fetch failed", data: null });
  }
}

export async function getAdminSiteSettings(req, res) {
  try {
    if (!requireDb(res)) return;
    const settings = await SiteSetting.find();
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value;
    });
    return res.json({
      success: true,
      message: "Admin site settings retrieved successfully",
      data: settingsMap
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Admin site settings fetch failed",
      data: null
    });
  }
}

export async function updateSiteSetting(req, res) {
  try {
    if (!requireDb(res)) return;
    const { key, value, group = "general", description = "" } = req.body;
    if (!key || !/^[a-zA-Z][a-zA-Z0-9_-]{1,79}$/.test(key)) {
      return res.status(400).json({ success: false, message: "Setting key is required", data: null });
    }
    const setting = await SiteSetting.findOneAndUpdate(
      { key },
      {
        $set: {
          value,
          group,
          description,
          updatedBy: req.user?.id
        },
        $setOnInsert: { key }
      },
      { upsert: true, new: true, runValidators: true }
    );
    await logAudit(req.user, "UPDATE_SITE_SETTING", "SiteSetting", key, { value });
    return res.json({ success: true, message: `Setting "${key}" updated successfully`, data: setting });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Setting update failed", data: null });
  }
}

// --- AUDIT LOGS & USERS ---
export async function getAuditLogs(req, res) {
  try {
    if (!requireDb(res)) return;
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, message: "Audit logs retrieved successfully", data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Audit logs fetch failed", data: null });
  }
}

export async function getUsers(req, res) {
  try {
    if (!requireDb(res)) return;
    const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
    return res.json({ success: true, message: "Users retrieved successfully", data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Users fetch failed", data: null });
  }
}

export async function createUser(req, res) {
  try {
    if (!requireDb(res)) return;
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
        data: null
      });
    }
    if (String(password).length < 12) {
      return res.status(400).json({
        success: false,
        message: "Administrator passwords must be at least 12 characters.",
        data: null
      });
    }
    if (role && !["superadmin", "admin", "editor"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid administrator role.", data: null });
    }
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
      role: role || "admin"
    });
    const safeUser = await User.findById(user._id, "-passwordHash");
    await logAudit(req.user, "CREATE_USER", "User", user._id.toString(), { email, role });
    return res.status(201).json({ success: true, message: "User created successfully", data: safeUser });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to create user", data: null });
  }
}

export async function deleteUser(req, res) {
  try {
    if (!requireDb(res)) return;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID", data: null });
    }
    if (String(req.user?.id) === String(id)) {
      return res.status(409).json({ success: false, message: "You cannot delete your own account.", data: null });
    }
    const target = await User.findById(id);
    if (!target) return res.status(404).json({ success: false, message: "User not found", data: null });
    if (target.role === "superadmin" && await User.countDocuments({ role: "superadmin", isActive: true }) <= 1) {
      return res.status(409).json({
        success: false,
        message: "The final active super administrator cannot be deleted.",
        data: null
      });
    }
    await User.findByIdAndDelete(id);
    await logAudit(req.user, "DELETE_USER", "User", id);
    return res.json({ success: true, message: "User deleted successfully", data: { id } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "User delete failed", data: null });
  }
}

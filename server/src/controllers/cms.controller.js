import { isValidId } from "../utils/ids.js";
import Service from "../models/Service.model.js";
import PortfolioItem from "../models/PortfolioItem.model.js";
import BrandCollaboration from "../models/BrandCollaboration.model.js";
import BlogPost from "../models/BlogPost.model.js";
import TeamMember from "../models/TeamMember.model.js";
import Enquiry from "../models/Enquiry.model.js";
import SiteSetting from "../models/SiteSetting.model.js";
import AuditLog from "../models/AuditLog.model.js";
import User from "../models/User.model.js";
import { deleteUnreferencedMedia, extractMediaPaths } from "../utils/mediaCleanup.js";
import { env } from "../config/env.js";
import { isPostgresSelected } from "../config/databaseMode.js";
import {
  listAllPostgresSiteSettings,
  listPostgresCmsAuditLogs,
  listPostgresSiteSettings,
  savePostgresSiteSetting,
  writePostgresCmsAudit
} from "../db/siteSettingsRepository.js";
import {
  bulkDeletePostgresCmsRecords,
  createPostgresCmsRecord,
  deletePostgresCmsRecord,
  getPostgresCmsRecord,
  listPostgresCmsRecords,
  reorderPostgresCmsRecords,
  updatePostgresCmsRecord
} from "../db/cmsRepository.js";
import { getPostgresDashboardData } from "../db/dashboardRepository.js";
import { createPostgresAuthUser, deletePostgresCmsUser, listPostgresCmsUsers } from "../db/authRepository.js";
import { getCache, setCache, invalidateCmsCache } from "../config/redis.js";

function usesPostgres() {
  return true;
}

function isDbConnected() {
  return true;
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
      if (next.active !== undefined) next.isPublished = Boolean(next.active);
      if (next.featured !== undefined && next.isFeatured === undefined) next.isFeatured = Boolean(next.featured);
      if (next.isFeatured !== undefined && next.featured === undefined) next.featured = Boolean(next.isFeatured);
      if (!next.image && next.coverImage) next.image = next.coverImage;
      if (!next.coverImage && next.image) next.coverImage = next.image;
      if (!next.slug && next.title) next.slug = slugify(next.title);
      delete next.active;
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
      if (next.authorName || next.authorAvatar || next.authorRole) {
        next.author = {
          ...(typeof next.author === "object" ? next.author : {}),
          ...(next.authorName ? { name: next.authorName } : {}),
          ...(next.authorRole ? { role: next.authorRole } : {}),
          ...(next.authorAvatar ? { avatar: next.authorAvatar } : {})
        };
      }
      if (!next.author?.name) next.author = { ...(next.author || {}), name: "The Editing Table" };
      if (!next.slug && next.title) next.slug = slugify(next.title);
      delete next.active;
      delete next.isPublished;
      delete next.authorName;
      delete next.authorRole;
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
      if (!next.profileImage && (next.avatar || next.image)) next.profileImage = next.avatar || next.image;
      if (!next.slug && (next.fullName || next.name)) next.slug = slugify(next.fullName || next.name);
      delete next.order;
      delete next.name;
      delete next.role;
      delete next.bio;
      delete next.avatar;
      delete next.image;
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

async function requireDb() {
  return true;
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

async function validatePostgresCreate(Model, payload) {
  const document = new Model(payload);
  await document.validate();
  return { id: document._id.toString(), data: document.toObject() };
}

async function validatePostgresUpdate(Model, existing, payload) {
  const document = Model.hydrate(existing);
  document.set(payload);
  await document.validate({ validateModifiedOnly: true });
  const updates = {};
  const requestedPaths = Object.keys(payload);
  for (const [schemaPath] of Object.entries(Model.schema.paths)) {
    if (["_id", "__v", "createdAt", "updatedAt"].includes(schemaPath)) continue;
    const included = requestedPaths.some((requested) => requested === schemaPath ||
      schemaPath.startsWith(`${requested}.`) || requested.startsWith(`${schemaPath}.`));
    if (!included) continue;
    let target = updates;
    const parts = schemaPath.split(".");
    for (const part of parts.slice(0, -1)) target = target[part] ||= {};
    target[parts.at(-1)] = document.get(schemaPath);
  }
  return updates;
}

function normalizeDocForClient(doc, entityName) {
  const item = toPlain(doc);
  if (!item) return item;
  if (!item.id && item._id) item.id = item._id;
  if (!item._id && item.id) item._id = item.id;

  if (entityName === "Service") {
    item.active = item.isPublished !== false;
  }
  if (entityName === "PortfolioItem") {
    item.active = item.isPublished !== false && item.active !== false;
    item.isPublished = item.active;
    item.coverImage = item.coverImage || item.image || "";
    item.image = item.coverImage || item.image || "";
    item.videoUrl = item.videoUrl || "";
    item.isFeatured = Boolean(item.isFeatured || item.featured);
    item.featured = item.isFeatured;
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

  return item;
}

// Helper for generic audit logging
async function logAudit(user, action, entity, entityId, details) {
  try {
    await writePostgresCmsAudit(user, action, entity, entityId, details);
  } catch {
    // Fail silently for audit logs
  }
}

// --- CMS OVERVIEW STATS ---
export async function getDashboardStats(req, res) {
  try {
    const payload = await getPostgresDashboardData();
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
    icon: "Film",
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
    icon: "Camera",
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
    icon: "Award",
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
    features: ["Full Story Culling", "Consistent Color Grade", "Highlight Film & Teaser Edit", "Audio Synchronization"],
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

const DEFAULT_AUTHENTIC_TEAM = [
  {
    fullName: "Akshay Chhabra",
    slug: "akshay-chhabra",
    designation: "Founder & Creative Director",
    category: "Creative Direction",
    shortBio: "Leading post-production direction, creative color science, and strategic creative vision.",
    fullBio: "Leading post-production direction, creative color science, and strategic creative vision across premier wedding cinema, commercial films, and high-fashion editorial campaigns.",
    profileImage: "/assets/akshay-chhabra-founder.jpg",
    skills: ["DaVinci Resolve", "ACES Color Science", "Creative Direction", "Analog Film Emulation"],
    experience: "10+ Years",
    featured: true,
    active: true,
    displayOrder: 1
  },
  {
    fullName: "Elena Rostova",
    slug: "elena-rostova",
    designation: "Lead DaVinci Colorist",
    category: "Color Science",
    shortBio: "Specializing in 35mm Kodak stock emulation, skin tone preservation, and Dolby Vision HDR mastering.",
    fullBio: "Specializing in 35mm Kodak stock emulation, skin tone preservation, and Dolby Vision HDR mastering for international films and luxury brands.",
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
    skills: ["DaVinci Resolve", "Dolby Vision HDR", "35mm Print Emulation", "Skin Tone Matching"],
    experience: "8+ Years",
    featured: true,
    active: true,
    displayOrder: 2
  },
  {
    fullName: "Marcus Vance",
    slug: "marcus-vance",
    designation: "Head of Photo Retouching",
    category: "Editorial Retouching",
    shortBio: "Overseeing high-fashion editorial retouching, frequency separation, and micro dodge & burn.",
    fullBio: "Overseeing high-fashion editorial retouching, frequency separation, and micro dodge & burn for global fashion labels and magazine spreads.",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85",
    skills: ["Micro Dodge & Burn", "Frequency Separation", "Capture One", "High-End Editorial Retouching"],
    experience: "7+ Years",
    featured: true,
    active: true,
    displayOrder: 3
  },
  {
    fullName: "Claire Beaumont",
    slug: "claire-beaumont",
    designation: "Supervising Sound Editor",
    category: "Sound Design",
    shortBio: "Crafting immersive spatial soundscapes, dialogue clarity, and theatrical dynamic range audio finishing.",
    fullBio: "Crafting immersive spatial soundscapes, dialogue clarity, and theatrical dynamic range audio finishing for cinematic narrative releases.",
    profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=85",
    skills: ["Fairlight Audio", "Dolby Atmos", "Audio Restoration", "Theatrical Sound Design"],
    experience: "6+ Years",
    featured: true,
    active: true,
    displayOrder: 4
  }
];

const DEFAULT_AUTHENTIC_PORTFOLIO = [
  {
    title: "Cinematic Film Production",
    slug: "cinematic-film-production",
    category: "Commercial Film",
    client: "Arri & Red RAW Cinema",
    coverImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    description: "4K RAW cinema camera post-production, multi-camera sync, pacing and DaVinci color grading.",
    isPublished: true,
    active: true,
    order: 1
  },
  {
    title: "Royal Heritage Wedding",
    slug: "royal-heritage-wedding",
    category: "Weddings",
    client: "Luxury Bridal Cinema",
    coverImage: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85",
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    description: "Heritage wedding editorial retouching, fine jewelry skin tone preservation, and cinematic color grade.",
    isPublished: true,
    active: true,
    order: 2
  },
  {
    title: "Alpine River Expeditions",
    slug: "alpine-river-expeditions",
    category: "Brand Campaign",
    client: "Outdoor Narrative Films",
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    description: "Aerial mountain cinematography, natural light color timing, dynamic HDR mastering and sound design.",
    isPublished: true,
    active: true,
    order: 3
  },
  {
    title: "Artisanal Botanical Still",
    slug: "artisanal-botanical-still",
    category: "Commercial",
    client: "Culinary & Beverage Brand",
    coverImage: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=85",
    image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    description: "High-end product color refinement, glass reflection cleanup, and micro contrast calibration.",
    isPublished: true,
    active: true,
    order: 4
  },
  {
    title: "The Glass House Estate",
    slug: "glass-house-estate",
    category: "Photography",
    client: "Editorial Retouching Suite",
    coverImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "",
    description: "High-end photo editing and micro dodge-and-burn retouching for luxury architectural & editorial imagery.",
    isPublished: true,
    active: true,
    order: 5
  },
  {
    title: "Amalfi Coast Editorial",
    slug: "amalfi-coast-editorial",
    category: "Films",
    client: "Creative Post-Production",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    description: "Professional film post-production with Dolby Vision HDR grading, sound design, and master finishing.",
    isPublished: true,
    active: true,
    order: 6
  }
];

const DEFAULT_AUTHENTIC_COLLABORATIONS = [
  {
    brandName: "Atelier Vance Cinema",
    title: "Atelier Vance Cinema Partnership",
    slug: "atelier-vance",
    category: "Luxury Cinema",
    heroImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85",
    coverImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85",
    logo: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85",
    description: "Exclusive post-production grading and master finishing partner for global luxury wedding cinema.",
    published: true,
    active: true,
    order: 1
  }
];

const DEFAULT_AUTHENTIC_BLOGS = [
  {
    title: "Mastering Kodak 2383 Print Emulation in DaVinci Resolve",
    slug: "mastering-kodak-2383-print-emulation",
    author: "Akshay Chhabra",
    category: "Color Grading",
    readTime: "6 min read",
    coverImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=85",
    excerpt: "An in-depth exploration of color space transforms, density subtractions, and split-toning techniques for cinematic analog warmth.",
    content: "The signature look of Hollywood cinema from the 1990s and 2000s owes much of its aesthetic to Kodak 2383 film stock. In this article, we break down how to implement a node tree that honors Kodak chemistry without crushing shadow details.",
    status: "published",
    isPublished: true,
    active: true,
    order: 1
  },
  {
    title: "Non-Destructive Skin Retouching: Frequency Separation vs. Micro Dodge & Burn",
    slug: "non-destructive-skin-retouching",
    author: "Marcus Vance",
    category: "Retouching",
    readTime: "5 min read",
    coverImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    excerpt: "Why top editorial beauty retouchers rely on micro dodge and burn to preserve natural pores and luminance transitions.",
    content: "While frequency separation remains a quick industry standard, high-fashion campaigns demand uncompromised skin texture. Learn the brush workflows that preserve natural pore integrity.",
    status: "published",
    isPublished: true,
    active: true,
    order: 2
  }
];

const DEFAULT_AUTHENTIC_SETTINGS = {
  siteName: "THE EDITING TABLE",
  metaTitle: "The Editing Table | High-End Film & Video Post-Production",
  metaDescription: "Bespoke color grading, video editing, and visual post-production for commercials, weddings, and cinema.",
  maintenanceMode: false,
  publicContent: {
    hero: {
      tagline: "WE CRAFT VISUAL STORIES",
      subtitle: "Bespoke color grading, video editing, and visual post-production for luxury weddings, brands, and cinema."
    },
    footer: {
      instagram: "https://www.instagram.com/the.editingtable?stkn=MWdrdHZlY21tMmYzcw==",
      linkedin: "https://www.linkedin.com/company/the-editing-table/",
      email: "hello@theeditingtable.com",
      address: "Mumbai & New Delhi, India"
    }
  },
  globalReach: {
    enabled: true,
    heading: "TRUSTED BY PREMIERE PRODUCTION HOUSES & CREATIVE AGENCIES",
    description: "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
    speed: 35,
    direction: "left",
    pauseOnHover: true,
    locations: [
      { id: "uae-dubai", country: "UAE", city: "Dubai", label: "Dubai, UAE", countryCode: "AE", flag: "🇦🇪", lat: 25.2048, lon: 55.2708, active: true, featured: true, order: 1 },
      { id: "ch-zurich", country: "Switzerland", city: "Zurich", label: "Zurich, Switzerland", countryCode: "CH", flag: "🇨🇭", lat: 47.3769, lon: 8.5417, active: true, featured: true, order: 2 },
      { id: "gb-london", country: "United Kingdom", city: "London", label: "London, UK", countryCode: "GB", flag: "🇬🇧", lat: 51.5074, lon: -0.1278, active: true, featured: true, order: 3 },
      { id: "in-chandigarh", country: "India", city: "Chandigarh", label: "Chandigarh, India", countryCode: "IN", flag: "🇮🇳", lat: 30.7333, lon: 76.7794, active: true, featured: true, order: 4 }
    ],
    countries: [
      { id: "US", code: "US", name: "United States", flag: "🇺🇸", active: true, order: 1 },
      { id: "GB", code: "GB", name: "United Kingdom", flag: "🇬🇧", active: true, order: 2 },
      { id: "FR", code: "FR", name: "France", flag: "🇫🇷", active: true, order: 3 },
      { id: "IT", code: "IT", name: "Italy", flag: "🇮🇹", active: true, order: 4 },
      { id: "AE", code: "AE", name: "UAE", flag: "🇦🇪", active: true, order: 5 },
      { id: "CH", code: "CH", name: "Switzerland", flag: "🇨🇭", active: true, order: 6 },
      { id: "JP", code: "JP", name: "Japan", flag: "🇯🇵", active: true, order: 7 },
      { id: "AU", code: "AU", name: "Australia", flag: "🇦🇺", active: true, order: 8 },
      { id: "IN", code: "IN", name: "India", flag: "🇮🇳", active: true, order: 9 },
      { id: "MC", code: "MC", name: "Monaco", flag: "🇲🇨", active: true, order: 10 }
    ]
  }
};

function createCRUDActions(Model, entityName) {
  const config = getEntityConfig(entityName);

  return {
    // Public listing (active/published items)
    getAll: async (req, res) => {
      try {
        const isDefaultList = !req.query.search && (!req.query.category || req.query.category === "All");
        const cacheKey = `cms:${entityName.toLowerCase()}:public`;

        if (isDefaultList) {
          const cached = await getCache(cacheKey);
          if (cached) {
            res.setHeader("X-Cache", "HIT");
            res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
            return res.json(cached);
          }
        }

        if (usesPostgres()) {
          const docs = await listPostgresCmsRecords(Model, {
            publicFilter: config.publicFilter,
            search: req.query.search,
            category: req.query.category,
            orderField: config.orderField
          });
          if (docs && docs.length > 0) {
            const payload = {
              success: true,
              message: `${entityName} records retrieved successfully`,
              data: docs.map((doc) => normalizeDocForClient(doc, entityName))
            };
            if (isDefaultList) {
              await setCache(cacheKey, payload, 300);
            }
            res.setHeader("X-Cache", "MISS");
            res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
            return res.json(payload);
          }
          const defaults = entityName === "Service" ? DEFAULT_AUTHENTIC_SERVICES :
            entityName === "TeamMember" ? DEFAULT_AUTHENTIC_TEAM :
            entityName === "PortfolioItem" ? DEFAULT_AUTHENTIC_PORTFOLIO :
            entityName === "BrandCollaboration" ? DEFAULT_AUTHENTIC_COLLABORATIONS :
            entityName === "BlogPost" ? DEFAULT_AUTHENTIC_BLOGS : [];
          const payload = {
            success: true,
            message: `${entityName} records retrieved (default fallback)`,
            data: defaults.map((d) => normalizeDocForClient(d, entityName))
          };
          if (isDefaultList) {
            await setCache(cacheKey, payload, 300);
          }
          res.setHeader("X-Cache", "MISS");
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
          return res.json(payload);
        }


        if (!isDbConnected()) {
          const defaults = entityName === "Service" ? DEFAULT_AUTHENTIC_SERVICES :
            entityName === "TeamMember" ? DEFAULT_AUTHENTIC_TEAM :
            entityName === "PortfolioItem" ? DEFAULT_AUTHENTIC_PORTFOLIO :
            entityName === "BrandCollaboration" ? DEFAULT_AUTHENTIC_COLLABORATIONS :
            entityName === "BlogPost" ? DEFAULT_AUTHENTIC_BLOGS : [];
          return res.json({
            success: true,
            message: `${entityName} records retrieved (offline fallback)`,
            data: defaults.map((d) => normalizeDocForClient(d, entityName))
          });
        }

        if (entityName === "Service") {
          const count = await Model.countDocuments().catch(() => 0);
          if (count === 0) {
            await Model.insertMany(DEFAULT_AUTHENTIC_SERVICES).catch(() => null);
          }
        }

        if (entityName === "TeamMember") {
          const count = await Model.countDocuments().catch(() => 0);
          if (count === 0) {
            await Model.insertMany(DEFAULT_AUTHENTIC_TEAM).catch(() => null);
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
        if (usesPostgres()) {
          const docs = await listPostgresCmsRecords(Model, {
            search: req.query.search,
            category: req.query.category,
            orderField: config.orderField,
            admin: true
          });
          if (docs && docs.length > 0) {
            return res.json({ success: true, message: `${entityName} admin records retrieved successfully`, data: docs.map((doc) => normalizeDocForClient(doc, entityName)) });
          }
          const defaults = entityName === "Service" ? DEFAULT_AUTHENTIC_SERVICES :
            entityName === "TeamMember" ? DEFAULT_AUTHENTIC_TEAM :
            entityName === "PortfolioItem" ? DEFAULT_AUTHENTIC_PORTFOLIO :
            entityName === "BrandCollaboration" ? DEFAULT_AUTHENTIC_COLLABORATIONS :
            entityName === "BlogPost" ? DEFAULT_AUTHENTIC_BLOGS : [];
          return res.json({
            success: true,
            message: `${entityName} admin records retrieved (default fallback)`,
            data: defaults.map((d) => normalizeDocForClient(d, entityName))
          });
        }


        if (!isDbConnected()) {
          const defaults = entityName === "Service" ? DEFAULT_AUTHENTIC_SERVICES :
            entityName === "TeamMember" ? DEFAULT_AUTHENTIC_TEAM :
            entityName === "PortfolioItem" ? DEFAULT_AUTHENTIC_PORTFOLIO :
            entityName === "BrandCollaboration" ? DEFAULT_AUTHENTIC_COLLABORATIONS :
            entityName === "BlogPost" ? DEFAULT_AUTHENTIC_BLOGS : [];
          return res.json({
            success: true,
            message: `${entityName} records retrieved (offline fallback)`,
            data: defaults.map((d) => normalizeDocForClient(d, entityName))
          });
        }

        if (entityName === "TeamMember") {
          const count = await Model.countDocuments().catch(() => 0);
          if (count === 0) {
            await Model.insertMany(DEFAULT_AUTHENTIC_TEAM).catch(() => null);
          }
        }

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
        if (usesPostgres()) {
          const idOrSlug = req.params.id;
          if (!idOrSlug || idOrSlug === "undefined" || idOrSlug === "null") {
            return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
          }

          const item = await getPostgresCmsRecord(Model, idOrSlug, config.publicFilter);
          if (!item) {
            if (!isValidId(idOrSlug) && !Model.schema.paths.slug) {
              return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
            }
            return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
          }
          return res.json({ success: true, message: `${entityName} retrieved successfully`, data: normalizeDocForClient(item, entityName) });
        }

        if (!isDbConnected()) {
          const defaults = entityName === "Service" ? DEFAULT_AUTHENTIC_SERVICES :
            entityName === "TeamMember" ? DEFAULT_AUTHENTIC_TEAM :
            entityName === "PortfolioItem" ? DEFAULT_AUTHENTIC_PORTFOLIO :
            entityName === "BrandCollaboration" ? DEFAULT_AUTHENTIC_COLLABORATIONS :
            entityName === "BlogPost" ? DEFAULT_AUTHENTIC_BLOGS : [];
          const match = defaults.find((d) => String(d._id) === String(req.params.id) || d.slug === req.params.id);
          if (match) {
            return res.json({ success: true, message: `${entityName} retrieved (offline fallback)`, data: normalizeDocForClient(match, entityName) });
          }
        }
        if (!await requireDb(res)) return;
        if (!isValidId(req.params.id)) {
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
        const payload = sanitizeMutablePayload(config.normalizePayload(req.body));

        if (usesPostgres()) {
          if (payload[config.orderField] === undefined && config.orderField !== "publishedAt") {
            const docs = await listPostgresCmsRecords(Model, { orderField: config.orderField, admin: true });
            payload[config.orderField] = Math.max(0, ...docs.map((doc) => Number(doc[config.orderField]) || 0)) + 1;
          }
          const validated = await validatePostgresCreate(Model, payload);
          const item = await createPostgresCmsRecord(Model, validated.id, validated.data);
          await invalidateCmsCache(entityName);
          await logAudit(req.user, `CREATE_${entityName.toUpperCase()}`, entityName, item._id, payload);
          return res.status(201).json({ success: true, message: `${entityName} created successfully`, data: normalizeDocForClient(item, entityName) });
        }
        if (!await requireDb(res)) return;

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
        const payload = sanitizeMutablePayload(config.normalizePayload(req.body));
        const id = req.params.id;
        if (!isValidId(id)) {
          return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
        }

        if (usesPostgres()) {
          const existing = await getPostgresCmsRecord(Model, id);
          if (!existing) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
          const validated = await validatePostgresUpdate(Model, existing, payload);
          const item = await updatePostgresCmsRecord(Model, id, validated);
          await invalidateCmsCache(entityName);
          await logAudit(req.user, `UPDATE_${entityName.toUpperCase()}`, entityName, item._id, payload);
          return res.json({ success: true, message: `${entityName} updated successfully`, data: normalizeDocForClient(item, entityName) });
        }
        if (!await requireDb(res)) return;

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
        const id = req.params.id;
        if (!isValidId(id)) {
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

        if (usesPostgres()) {
          const existing = await getPostgresCmsRecord(Model, id);
          if (!existing) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
          const validated = await validatePostgresUpdate(Model, existing, updateData);
          const item = await updatePostgresCmsRecord(Model, id, validated);
          if (!item) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
          await invalidateCmsCache(entityName);
          await logAudit(req.user, `UPDATE_STATUS_${entityName.toUpperCase()}`, entityName, id, updateData);
          return res.json({ success: true, message: `${entityName} status updated successfully`, data: normalizeDocForClient(item, entityName) });
        }
        if (!await requireDb(res)) return;

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
        const items = req.body.items || req.body.slides || [];
        if (!Array.isArray(items)) {
          return res.status(400).json({ success: false, message: "Please provide an items array.", data: null });
        }

        const validItems = items
          .map((it, index) => ({ id: it.id || it._id, order: Number(it.order ?? index + 1) }))
          .filter((it) => isValidId(it.id));

        const uniqueIds = new Set(validItems.map((item) => String(item.id)));
        if (validItems.length !== items.length || uniqueIds.size !== validItems.length) {
          return res.status(400).json({ success: false, message: "One or more record IDs are invalid.", data: null });
        }

        if (usesPostgres()) {
          const docs = await reorderPostgresCmsRecords(Model, config.orderField, validItems);
          if (!docs) return res.status(404).json({ success: false, message: "One or more records no longer exist.", data: null });
          await invalidateCmsCache(entityName);
          await logAudit(req.user, `REORDER_${entityName.toUpperCase()}`, entityName, "bulk", { count: validItems.length });
          return res.json({ success: true, message: `${entityName} reordered successfully`, data: docs.map((doc) => normalizeDocForClient(doc, entityName)) });
        }
        if (!await requireDb(res)) return;

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
        const id = req.params.id;
        if (!isValidId(id)) {
          return res.status(400).json({ success: false, message: "Invalid record ID", data: null });
        }
        if (usesPostgres()) {
          const deleted = await deletePostgresCmsRecord(Model, id);
          if (!deleted) return res.status(404).json({ success: false, message: `${entityName} not found`, data: null });
          await invalidateCmsCache(entityName);
          await logAudit(req.user, `DELETE_${entityName.toUpperCase()}`, entityName, id);
          return res.json({ success: true, message: `${entityName} deleted successfully`, data: { id } });
        }
        if (!await requireDb(res)) return;
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
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
          return res.status(400).json({ success: false, message: "Please provide an ids array.", data: null });
        }
        const validIds = ids.filter((id) => isValidId(id));
        if (validIds.length !== ids.length) {
          return res.status(400).json({ success: false, message: "One or more record IDs are invalid.", data: null });
        }

        if (usesPostgres()) {
          const result = await bulkDeletePostgresCmsRecords(Model, validIds.map(String));
          if (!result) return res.status(404).json({ success: false, message: "One or more records no longer exist.", data: null });
          await invalidateCmsCache(entityName);
          await logAudit(req.user, `BULK_DELETE_${entityName.toUpperCase()}`, entityName, "bulk", { count: result.deletedCount });
          return res.json({ success: true, message: `Selected ${entityName} items deleted successfully`, data: { deletedCount: result.deletedCount } });
        }
        if (!await requireDb(res)) return;

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
export const collaborationsCMS = createCRUDActions(BrandCollaboration, "BrandCollaboration");
export const blogCMS = createCRUDActions(BlogPost, "BlogPost");
export const teamCMS = createCRUDActions(TeamMember, "TeamMember");

// --- ENQUIRIES MANAGEMENT ---
export async function getEnquiries(req, res) {
  try {
    if (usesPostgres()) {
      if (!env.DATABASE_URL) {
        return res.status(503).json({ success: false, message: "Enquiry database is not configured.", data: null });
      }
      const { status, search } = req.query;
      const enquiries = await listPostgresCmsRecords(Enquiry, {
        publicFilter: status && status !== "All" ? { status } : {},
        search,
        orderField: "createdAt",
        admin: true,
        direction: "DESC"
      });
      return res.json({ success: true, message: "Enquiries retrieved successfully", data: enquiries });
    }


    if (!isDbConnected()) {
      return res.json({ success: true, message: "Enquiries retrieved (offline mode)", data: [] });
    }

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
    const postgres = usesPostgres();
    if (!postgres && !await requireDb(res)) return;
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry ID", data: null });
    }
    const statusField = Enquiry.schema.path("status");
    const allowedStatuses = statusField?.enumValues || statusField?.enum || statusField?.options?.enum || [];
    if (allowedStatuses.length && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry status", data: null });
    }
    const item = postgres
      ? await updatePostgresCmsRecord(Enquiry, id, { status })
      : await Enquiry.findByIdAndUpdate(id, { $set: { status } }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Enquiry not found", data: null });
    await logAudit(req.user, "UPDATE_ENQUIRY_STATUS", "Enquiry", id, { status });
    return res.json({ success: true, message: "Enquiry status updated successfully", data: item });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Enquiry status update failed", data: null });
  }
}

export async function deleteEnquiry(req, res) {
  try {
    const postgres = usesPostgres();
    if (!postgres && !await requireDb(res)) return;
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid enquiry ID", data: null });
    }
    const deleted = postgres
      ? await deletePostgresCmsRecord(Enquiry, id)
      : await Enquiry.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Enquiry not found", data: null });
    return res.json({ success: true, message: "Enquiry deleted successfully", data: { id } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Enquiry delete failed", data: null });
  }
}

// --- SITE SETTINGS ---
export async function getSiteSettings(req, res) {
  try {
    const cacheKey = "cms:sitesettings:public";
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const postgres = usesPostgres();


    if (!postgres && !isDbConnected()) {
      return res.json({
        success: true,
        message: "Site settings retrieved (offline fallback)",
        data: DEFAULT_AUTHENTIC_SETTINGS
      });
    }

    const publicKeys = ["siteName", "metaTitle", "metaDescription", "maintenanceMode", "publicContent", "globalReach"];
    const settings = postgres
      ? await listPostgresSiteSettings(publicKeys)
      : await SiteSetting.find({ key: { $in: publicKeys } });
    const settingsMap = { ...DEFAULT_AUTHENTIC_SETTINGS };
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    if (!settingsMap.publicContent || typeof settingsMap.publicContent !== "object") {
      settingsMap.publicContent = {};
    }
    if (!settingsMap.publicContent.footer || typeof settingsMap.publicContent.footer !== "object") {
      settingsMap.publicContent.footer = {};
    }
    if (!settingsMap.publicContent.footer.instagram || settingsMap.publicContent.footer.instagram === "#") {
      settingsMap.publicContent.footer.instagram = "https://www.instagram.com/the.editingtable?stkn=MWdrdHZlY21tMmYzcw==";
    }
    if (!settingsMap.publicContent.footer.linkedin || settingsMap.publicContent.footer.linkedin === "#") {
      settingsMap.publicContent.footer.linkedin = "https://www.linkedin.com/company/the-editing-table/";
    }
    if (settingsMap.globalReach && typeof settingsMap.globalReach === "object") {
      const activeCountries = Array.isArray(settingsMap.globalReach.countries)
        ? settingsMap.globalReach.countries.filter((c) => c.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : DEFAULT_AUTHENTIC_SETTINGS.globalReach.countries;
      settingsMap.globalReach = {
        ...DEFAULT_AUTHENTIC_SETTINGS.globalReach,
        ...settingsMap.globalReach,
        countries: activeCountries
      };
    } else {
      settingsMap.globalReach = DEFAULT_AUTHENTIC_SETTINGS.globalReach;
    }
    const payload = { success: true, message: "Site settings retrieved successfully", data: settingsMap };
    await setCache(cacheKey, payload, 600);
    res.setHeader("X-Cache", "MISS");
    return res.json(payload);
  } catch {
    if (usesPostgres()) {
      return res.status(503).json({ success: false, message: "PostgreSQL is unavailable. Site settings could not be retrieved.", data: null });
    }
    return res.json({
      success: true,
      message: "Site settings retrieved (offline fallback)",
      data: DEFAULT_AUTHENTIC_SETTINGS
    });
  }
}

export async function getAdminSiteSettings(req, res) {
  try {
    const postgres = usesPostgres();


    if (!postgres && !isDbConnected()) {
      return res.json({
        success: true,
        message: "Admin site settings retrieved (offline fallback)",
        data: DEFAULT_AUTHENTIC_SETTINGS
      });
    }

    const settings = postgres
      ? await listAllPostgresSiteSettings()
      : await SiteSetting.find();
    const settingsMap = { ...DEFAULT_AUTHENTIC_SETTINGS };
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value;
    });
    if (!settingsMap.publicContent || typeof settingsMap.publicContent !== "object") {
      settingsMap.publicContent = {};
    }
    if (!settingsMap.publicContent.footer || typeof settingsMap.publicContent.footer !== "object") {
      settingsMap.publicContent.footer = {};
    }
    if (!settingsMap.publicContent.footer.instagram || settingsMap.publicContent.footer.instagram === "#") {
      settingsMap.publicContent.footer.instagram = "https://www.instagram.com/the.editingtable?stkn=MWdrdHZlY21tMmYzcw==";
    }
    if (!settingsMap.publicContent.footer.linkedin || settingsMap.publicContent.footer.linkedin === "#") {
      settingsMap.publicContent.footer.linkedin = "https://www.linkedin.com/company/the-editing-table/";
    }
    return res.json({
      success: true,
      message: "Admin site settings retrieved successfully",
      data: settingsMap
    });
  } catch {
    if (usesPostgres()) {
      return res.status(503).json({ success: false, message: "PostgreSQL is unavailable. Site settings could not be retrieved.", data: null });
    }
    return res.json({
      success: true,
      message: "Admin site settings retrieved (offline fallback)",
      data: DEFAULT_AUTHENTIC_SETTINGS
    });
  }
}

export async function updateSiteSetting(req, res) {
  try {
    const postgres = usesPostgres();
    if (!postgres && !await requireDb(res)) return;
    const { key, value, group = "general", description = "" } = req.body;
    if (!key || !/^[a-zA-Z][a-zA-Z0-9_-]{1,79}$/.test(key)) {
      return res.status(400).json({ success: false, message: "Setting key is required", data: null });
    }
    if (value === undefined) {
      return res.status(400).json({ success: false, message: "Setting value is required", data: null });
    }
    const groupField = SiteSetting.schema.path("group");
    const allowedGroups = groupField?.enumValues || groupField?.enum || groupField?.options?.enum || [];
    if (allowedGroups.length && !allowedGroups.includes(group)) {
      return res.status(400).json({ success: false, message: "Invalid setting group", data: null });
    }
    const setting = postgres
      ? await savePostgresSiteSetting({ key, value, group, description: String(description ?? ""), updatedBy: req.user?.id })
      : await SiteSetting.findOneAndUpdate(
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
    await invalidateCmsCache("sitesettings");
    return res.json({ success: true, message: `Setting "${key}" updated successfully`, data: setting });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Setting update failed", data: null });
  }
}

// --- AUDIT LOGS & USERS ---
export async function getAuditLogs(req, res) {
  try {
    if (usesPostgres()) {
      const logs = await listPostgresCmsAuditLogs(100);
      return res.json({ success: true, message: "Audit logs retrieved successfully", data: logs });
    }

    if (!isDbConnected()) {
      return res.json({ success: true, message: "Audit logs retrieved (offline mode)", data: [] });
    }
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).catch(() => []);
    return res.json({ success: true, message: "Audit logs retrieved successfully", data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Audit logs fetch failed", data: null });
  }
}

export async function getUsers(req, res) {
  try {
    if (usesPostgres()) {
      const users = await listPostgresCmsUsers();
      return res.json({ success: true, message: "Users retrieved successfully", data: users });
    }
    if (!await requireDb(res)) return;
    const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
    return res.json({ success: true, message: "Users retrieved successfully", data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Users fetch failed", data: null });
  }
}

export async function createUser(req, res) {
  try {
    if (!usesPostgres() && !await requireDb(res)) return;
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
    if (usesPostgres()) {
      const user = await createPostgresAuthUser({
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash,
        role: role || "admin"
      });
      const safeUser = {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      };
      await logAudit(req.user, "CREATE_USER", "User", user._id.toString(), { email: safeUser.email, role: safeUser.role });
      return res.status(201).json({ success: true, message: "User created successfully", data: safeUser });
    }
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
    if (!usesPostgres() && !await requireDb(res)) return;
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID", data: null });
    }
    if (String(req.user?.id) === String(id)) {
      return res.status(409).json({ success: false, message: "You cannot delete your own account.", data: null });
    }
    if (usesPostgres()) {
      const result = await deletePostgresCmsUser(id);
      if (result.reason === "not_found") return res.status(404).json({ success: false, message: "User not found", data: null });
      if (result.reason === "last_superadmin") {
        return res.status(409).json({ success: false, message: "The final active super administrator cannot be deleted.", data: null });
      }
      await logAudit(req.user, "DELETE_USER", "User", id);
      return res.json({ success: true, message: "User deleted successfully", data: { id } });
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

// --- GLOBAL REACH SETTINGS & MARQUEE ---
export async function getGlobalReachSettings(req, res) {
  try {
    const postgres = usesPostgres();


    let globalReach = null;
    if (postgres) {
      const settings = await listPostgresSiteSettings(["globalReach"]);
      if (settings?.[0]?.value) globalReach = settings[0].value;
    } else if (isDbConnected()) {
      const setting = await SiteSetting.findOne({ key: "globalReach" });
      if (setting?.value) globalReach = setting.value;
    }

    if (!globalReach || typeof globalReach !== "object") {
      globalReach = { ...DEFAULT_AUTHENTIC_SETTINGS.globalReach };
    }

    globalReach = {
      ...DEFAULT_AUTHENTIC_SETTINGS.globalReach,
      ...globalReach,
      locations: Array.isArray(globalReach.locations) && globalReach.locations.length > 0
        ? globalReach.locations
        : DEFAULT_AUTHENTIC_SETTINGS.globalReach.locations,
      countries: Array.isArray(globalReach.countries) && globalReach.countries.length > 0
        ? globalReach.countries
        : DEFAULT_AUTHENTIC_SETTINGS.globalReach.countries
    };

    const isAdmin = Boolean(req.user && ["admin", "superadmin"].includes(req.user.role));
    if (!isAdmin) {
      const activeCountries = (globalReach.countries || [])
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const activeLocations = (globalReach.locations || [])
        .filter((loc) => loc.active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      return res.json({
        success: true,
        message: "Global reach settings retrieved successfully",
        data: {
          ...globalReach,
          locations: activeLocations,
          countries: activeCountries
        }
      });
    }

    const sortedCountries = (globalReach.countries || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const sortedLocations = (globalReach.locations || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return res.json({
      success: true,
      message: "Global reach admin settings retrieved successfully",
      data: {
        ...globalReach,
        locations: sortedLocations,
        countries: sortedCountries
      }
    });
  } catch {
    return res.json({
      success: true,
      message: "Global reach settings retrieved (fallback)",
      data: DEFAULT_AUTHENTIC_SETTINGS.globalReach
    });
  }
}

export async function updateGlobalReachSettings(req, res) {
  try {
    const postgres = usesPostgres();
    if (!postgres && !await requireDb(res)) return;

    const body = req.body || {};
    const existing = DEFAULT_AUTHENTIC_SETTINGS.globalReach;

    const updated = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : existing.enabled,
      heading: typeof body.heading === "string" && body.heading.trim() ? body.heading.trim() : existing.heading,
      description: typeof body.description === "string" ? body.description.trim() : existing.description,
      speed: Number(body.speed) > 0 ? Number(body.speed) : existing.speed,
      direction: ["left", "right"].includes(body.direction) ? body.direction : existing.direction,
      pauseOnHover: typeof body.pauseOnHover === "boolean" ? body.pauseOnHover : existing.pauseOnHover,
      locations: Array.isArray(body.locations)
        ? body.locations.map((loc, idx) => ({
            id: String(loc.id || `loc-${idx + 1}`),
            country: String(loc.country || "").trim(),
            city: String(loc.city || "").trim(),
            label: String(loc.label || `${loc.city || ""}, ${loc.country || ""}`).trim(),
            countryCode: String(loc.countryCode || "").toUpperCase(),
            flag: String(loc.flag || "").trim(),
            flagUrl: String(loc.flagUrl || "").trim(),
            lat: typeof loc.lat === "number" ? loc.lat : Number(loc.lat) || 0,
            lon: typeof loc.lon === "number" ? loc.lon : Number(loc.lon) || 0,
            active: loc.active !== false,
            featured: loc.featured === true,
            order: Number(loc.order ?? idx + 1)
          }))
        : existing.locations || DEFAULT_AUTHENTIC_SETTINGS.globalReach.locations,
      countries: Array.isArray(body.countries)
        ? body.countries.map((c, idx) => ({
            id: String(c.id || c.code || `country-${idx + 1}`),
            code: String(c.code || "").toUpperCase(),
            name: String(c.name || "").trim(),
            flag: String(c.flag || "").trim(),
            active: c.active !== false,
            order: Number(c.order ?? idx + 1)
          }))
        : existing.countries
    };

    if (postgres) {
      await savePostgresSiteSetting({
        key: "globalReach",
        value: updated,
        group: "general",
        description: "Global Reach Country Marquee configuration and international presence settings",
        updatedBy: req.user?.id
      });
    } else {
      await SiteSetting.findOneAndUpdate(
        { key: "globalReach" },
        {
          $set: {
            value: updated,
            group: "general",
            description: "Global Reach Country Marquee configuration and international presence settings",
            updatedBy: req.user?.id
          }
        },
        { upsert: true, new: true }
      );
    }

    return res.json({
      success: true,
      message: "Global reach settings updated successfully",
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to update global reach settings: ${error.message}`,
      data: null
    });
  }
}

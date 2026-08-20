import mongoose from "mongoose";
import AdminActivityLog from "../models/AdminActivityLog.model.js";
import PhotoShowcaseItem from "../models/PhotoShowcaseItem.model.js";
import PhotoShowcaseSettings from "../models/PhotoShowcaseSettings.model.js";

const DEFAULT_PHOTO_SHOWCASE_ITEMS = [
  {
    _id: "demo-p1",
    title: "Château de Provence Twilight Vows",
    slug: "chateau-de-provence-twilight-vows",
    description: "High-end wedding color grading, RAW frame restoration, and skin tone balancing for luxury editorial wedding photography.",
    propertyName: "Château de Provence",
    location: "Provence • France",
    category: "Wedding Post-Production",
    tags: ["Wedding", "Provence", "Color Grade"],
    image: { url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Wedding Post-Production",
    ctaText: "View Retouching Details",
    ctaUrl: "/portfolio",
    order: 1,
    isFeatured: true,
    isActive: true,
    views: 1890,
    clicks: 420
  },
  {
    _id: "demo-p2",
    title: "Tuscan Estate Fine-Art Portraiture",
    slug: "tuscan-estate-fine-art-portraiture",
    description: "Haute-couture portrait retouching, micro dodge & burn, and 35mm film color science.",
    propertyName: "Tuscan Estate Atelier",
    location: "Florence • Italy",
    category: "Luxury Retouching",
    tags: ["Portraiture", "Fashion", "Retouching"],
    image: { url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Luxury Retouching",
    ctaText: "Request Retouching",
    ctaUrl: "/contactus",
    order: 2,
    isFeatured: false,
    isActive: true,
    views: 1540,
    clicks: 310
  },
  {
    _id: "demo-p3",
    title: "The Glass House Architectural Masterpiece",
    slug: "the-glass-house-architectural-masterpiece",
    description: "Bespoke architectural photo editing, window blend retouching, and HDR geometry correction.",
    propertyName: "The Glass House",
    location: "Malibu • California",
    category: "Photo Editing & Crop",
    tags: ["Architecture", "Malibu", "HDR Blend"],
    image: { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Masterpiece Heritage",
    ctaText: "Explore Portfolio",
    ctaUrl: "/portfolio",
    order: 3,
    isFeatured: true,
    isActive: true,
    views: 2980,
    clicks: 650
  },
  {
    _id: "demo-p4",
    title: "Amalfi Coast Editorial Reception",
    slug: "amalfi-coast-editorial-reception",
    description: "Filmic color grading, shadow detail recovery, and highlight softness enhancement.",
    propertyName: "Villa Solaria",
    location: "Amalfi Coast • Italy",
    category: "High-End Color Grading",
    tags: ["Amalfi", "Color Science", "Villa"],
    image: { url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Color Science",
    ctaText: "Book Color Suite",
    ctaUrl: "/services",
    order: 4,
    isFeatured: false,
    isActive: true,
    views: 1210,
    clicks: 280
  },
  {
    _id: "demo-p5",
    title: "Lake Como Villa Twilight Vows",
    slug: "lake-como-villa-twilight-vows",
    description: "Sunset ambient color correction, noise reduction, and fine-art detail enhancement.",
    propertyName: "Villa d'Este",
    location: "Lake Como • Italy",
    category: "Detail Enhancement",
    tags: ["Lake Como", "Sunset", "Details"],
    image: { url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=85" },
    badgeText: "Detail Enhancement",
    ctaText: "Inquire Photo Suite",
    ctaUrl: "/contactus",
    order: 5,
    isFeatured: false,
    isActive: true,
    views: 1100,
    clicks: 240
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
    .replace(/^-+|-+$/g, "") || `photo-${Date.now()}`;
}

async function logAdminActivity(adminId, action, entityId, changes = {}) {
  try {
    if (!adminId || !isDbConnected()) return;
    await AdminActivityLog.create({
      adminId,
      action,
      entityType: "PhotoShowcase",
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

export async function getPublicPhotos(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({ success: true, data: DEFAULT_PHOTO_SHOWCASE_ITEMS });
    }

    const items = await PhotoShowcaseItem.find({ isActive: true, deletedAt: null })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    if (items.length === 0) {
      return res.status(200).json({ success: true, data: DEFAULT_PHOTO_SHOWCASE_ITEMS });
    }

    return res.status(200).json({ success: true, data: items });
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
          heading: "Masterpiece High-End Photo Retouching & Color Suite",
          subheading:
            "Bespoke architectural imagery, high-end editorial photo retouching, and luxury property portfolios crafted with precision.",
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
          cardRadius: 24,
          showArrows: true,
          showPagination: true,
          ctaText: "Explore Full Gallery",
          ctaUrl: "/portfolio",
          ctaVisible: true,
          ctaNewTab: false,
          anchorId: "photo-showcase"
        }
      });
    }

    let settings = await PhotoShowcaseSettings.findOne({ settingsKey: "photo-showcase" }).lean();
    if (!settings) {
      settings = await PhotoShowcaseSettings.create({ settingsKey: "photo-showcase" });
    }

    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function getPublicPhotoBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    if (!isDbConnected()) {
      const found = DEFAULT_PHOTO_SHOWCASE_ITEMS.find((p) => p.slug === slug);
      if (!found) return res.status(404).json({ success: false, message: "Photo not found", data: null });
      return res.status(200).json({ success: true, data: found });
    }

    const item = await PhotoShowcaseItem.findOne({ slug, isActive: true, deletedAt: null }).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: "Photo not found", data: null });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------
// ADMIN CONTROLLERS
// ----------------------------------------------------

export async function getAdminPhotos(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const { search, status, category, isTrash } = req.query;

    const query = {};
    if (isTrash === "true") query.deletedAt = { $ne: null };
    else query.deletedAt = null;

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (category) query.category = category;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { propertyName: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    const total = await PhotoShowcaseItem.countDocuments(query);
    const items = await PhotoShowcaseItem.find(query).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean();

    return res.status(200).json({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
}

export async function createAdminPhoto(req, res, next) {
  try {
    const payload = req.body;
    if (!payload.title) {
      return res.status(400).json({ success: false, message: "Photo title is required", data: null });
    }

    let baseSlug = slugify(payload.slug || payload.title);
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await PhotoShowcaseItem.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${count++}`;
    }

    const nextOrder = payload.order ?? ((await PhotoShowcaseItem.countDocuments({ deletedAt: null })) + 1);

    const item = await PhotoShowcaseItem.create({
      ...payload,
      slug: uniqueSlug,
      order: nextOrder,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    await logAdminActivity(req.user?.id, "CREATE_PHOTO", item._id, { title: item.title });

    return res.status(201).json({
      success: true,
      message: "Photo showcase item created successfully",
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function duplicateAdminPhoto(req, res, next) {
  try {
    const { id } = req.params;
    const source = await PhotoShowcaseItem.findById(id);
    if (!source) return res.status(404).json({ success: false, message: "Source photo not found" });

    const obj = source.toObject();
    delete obj._id;
    delete obj.createdAt;
    delete obj.updatedAt;

    obj.title = `${obj.title} (Copy)`;
    obj.slug = slugify(obj.title);
    obj.order = (await PhotoShowcaseItem.countDocuments({ deletedAt: null })) + 1;
    obj.createdBy = req.user?.id;
    obj.updatedBy = req.user?.id;

    const duplicate = await PhotoShowcaseItem.create(obj);
    await logAdminActivity(req.user?.id, "DUPLICATE_PHOTO", duplicate._id, { sourceId: id });

    return res.status(201).json({ success: true, message: "Photo duplicated successfully", data: duplicate });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminPhoto(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const payload = req.body;
    payload.updatedBy = req.user?.id;

    const updated = await PhotoShowcaseItem.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Photo not found", data: null });
    }

    await logAdminActivity(req.user?.id, "UPDATE_PHOTO", id, { title: updated.title });

    return res.status(200).json({
      success: true,
      message: "Photo updated successfully",
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function softDeleteAdminPhoto(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ObjectId", data: null });
    }

    const item = await PhotoShowcaseItem.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), isActive: false, updatedBy: req.user?.id },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Photo not found", data: null });
    }

    await logAdminActivity(req.user?.id, "DELETE_PHOTO", id, { title: item.title });

    return res.status(200).json({
      success: true,
      message: "Photo moved to trash",
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function restoreAdminPhoto(req, res, next) {
  try {
    const { id } = req.params;
    const item = await PhotoShowcaseItem.findByIdAndUpdate(
      id,
      { deletedAt: null, isActive: true, updatedBy: req.user?.id },
      { new: true }
    );

    if (!item) return res.status(404).json({ success: false, message: "Photo not found" });

    await logAdminActivity(req.user?.id, "RESTORE_PHOTO", id, { title: item.title });

    return res.status(200).json({ success: true, message: "Photo restored from trash", data: item });
  } catch (err) {
    next(err);
  }
}

export async function permanentDeleteAdminPhoto(req, res, next) {
  try {
    const { id } = req.params;
    const item = await PhotoShowcaseItem.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: "Photo not found" });

    await logAdminActivity(req.user?.id, "PERMANENT_DELETE_PHOTO", id, { title: item.title });

    return res.status(200).json({ success: true, message: "Photo permanently deleted", data: null });
  } catch (err) {
    next(err);
  }
}

export async function toggleAdminStatus(req, res, next) {
  try {
    const { id } = req.params;
    const item = await PhotoShowcaseItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "Photo not found" });

    item.isActive = !item.isActive;
    await item.save();

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function toggleAdminFeatured(req, res, next) {
  try {
    const { id } = req.params;
    const item = await PhotoShowcaseItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "Photo not found" });

    item.isFeatured = !item.isFeatured;
    await item.save();

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function reorderAdminPhotos(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "Items array required" });

    const bulkOps = items
      .filter((i) => mongoose.isValidObjectId(i.id))
      .map((i) => ({
        updateOne: {
          filter: { _id: i.id },
          update: { $set: { order: Number(i.order) } }
        }
      }));

    if (bulkOps.length > 0) {
      await PhotoShowcaseItem.bulkWrite(bulkOps);
    }

    const updated = await PhotoShowcaseItem.find({ deletedAt: null }).sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function getAdminSettings(req, res, next) {
  try {
    let settings = await PhotoShowcaseSettings.findOne({ settingsKey: "photo-showcase" });
    if (!settings) {
      settings = await PhotoShowcaseSettings.create({ settingsKey: "photo-showcase" });
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminSettings(req, res, next) {
  try {
    const payload = req.body;
    payload.updatedBy = req.user?.id;

    const settings = await PhotoShowcaseSettings.findOneAndUpdate(
      { settingsKey: "photo-showcase" },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ success: true, message: "Photo settings updated", data: settings });
  } catch (err) {
    next(err);
  }
}

export async function getAdminAnalytics(req, res, next) {
  try {
    const items = await PhotoShowcaseItem.find({ deletedAt: null });
    const totalPhotos = items.length;
    const totalViews = items.reduce((acc, i) => acc + (i.views || 0), 0);
    const totalClicks = items.reduce((acc, i) => acc + (i.clicks || 0), 0);
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

    const topPhotos = [...items].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        totalPhotos,
        totalViews,
        totalClicks,
        ctr: `${ctr}%`,
        topPhotos
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminLogs(req, res, next) {
  try {
    const logs = await AdminActivityLog.find({ entityType: "PhotoShowcase" })
      .populate("adminId", "name email role")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

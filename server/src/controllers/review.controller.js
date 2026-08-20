import mongoose from "mongoose";
import Review from "../models/Review.model.js";
import { deleteUnreferencedMedia, extractMediaPaths } from "../utils/mediaCleanup.js";

// Helper to strip script tags and basic HTML
function sanitizeText(str = "") {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper to sanitize CSV fields against formula injection (=, +, -, @)
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/^[=+@-]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDb(res) {
  if (isDbConnected()) return true;
  res.status(503).json({
    success: false,
    message: "MongoDB is unavailable. Review data cannot be retrieved or changed.",
    data: null
  });
  return false;
}

function validObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getReviewOrFail(id, res) {
  if (!validObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid review ID", data: null });
    return null;
  }
  const review = await Review.findById(id);
  if (!review) {
    res.status(404).json({ success: false, message: "Review not found", data: null });
    return null;
  }
  return review;
}

function reviewStats(reviews = []) {
  const totalApproved = reviews.length;
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((review) => {
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  });
  const averageRating = totalApproved
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalApproved
    : 0;
  return { averageRating, totalApproved, distribution };
}

// ---------------------------------------------------
// PUBLIC CONTROLLERS
// ---------------------------------------------------

export async function submitReview(req, res) {
  try {
    const {
      name,
      email,
      phone,
      company,
      projectType,
      rating,
      title,
      message,
      country,
      city,
      profileImage,
      projectImage,
      honeypot
    } = req.body;

    if (honeypot && String(honeypot).trim().length > 0) {
      return res.status(200).json({
        success: true,
        message: "Thank you! Your review has been submitted and is awaiting admin approval.",
        data: null
      });
    }

    if (!name || !email || !projectType || !rating || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields (Name, Email, Project Type, Rating, Title, Message).",
        data: null
      });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer from 1 to 5.",
        data: null
      });
    }

    const cleanName = sanitizeText(name);
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanProjectType = sanitizeText(projectType);
    const cleanTitle = sanitizeText(title);
    const cleanMessage = sanitizeText(message);

    if (!cleanName || !cleanProjectType || !cleanTitle || !cleanMessage) {
      return res.status(400).json({
        success: false,
        message: "Required review fields cannot be empty.",
        data: null
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address.", data: null });
    }

    if (!requireDb(res)) return;

    const review = await Review.create({
      name: cleanName,
      email: cleanEmail,
      phone: sanitizeText(phone),
      company: sanitizeText(company),
      projectType: cleanProjectType,
      rating: numericRating,
      title: cleanTitle,
      message: cleanMessage,
      country: sanitizeText(country),
      city: sanitizeText(city),
      profileImage: sanitizeText(profileImage),
      projectImage: sanitizeText(projectImage),
      status: "pending",
      verified: false,
      featured: false,
      ipAddress: req.ip || ""
    });

    return res.status(201).json({
      success: true,
      message: "Thank you! Your review has been submitted and is awaiting admin approval.",
      data: { id: review._id }
    });
  } catch (error) {
    console.error("[REVIEWS] Submission error:", error.name, error.message);
    if (error.name === "ValidationError") {
      const validationMessage = Object.values(error.errors || {})[0]?.message || "Please review the submitted information.";
      return res.status(400).json({ success: false, message: validationMessage, data: null });
    }
    return res.status(500).json({ success: false, message: "Review submission is temporarily unavailable. Please try again.", data: null });
  }
}

export async function getPublicReviews(req, res) {
  try {
    if (!requireDb(res)) return;

    const { rating, projectType, search, page = 1, limit = 12, sort = "newest" } = req.query;
    const query = { status: "approved" };

    if (rating && !isNaN(Number(rating))) query.rating = Number(rating);
    if (projectType && projectType !== "All") query.projectType = projectType;
    if (search) {
      const cleanSearch = escapeRegex(sanitizeText(search));
      query.$or = [
        { title: { $regex: cleanSearch, $options: "i" } },
        { message: { $regex: cleanSearch, $options: "i" } },
        { name: { $regex: cleanSearch, $options: "i" } },
        { company: { $regex: cleanSearch, $options: "i" } }
      ];
    }

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, totalCount] = await Promise.all([
      Review.find(query).select("-email -phone -ipAddress -__v").sort(sortOption).skip(skip).limit(limitNum).lean(),
      Review.countDocuments(query)
    ]);

    const allApproved = await Review.find(query).select("rating").lean();
    const stats = reviewStats(allApproved);

    return res.status(200).json({
      success: true,
      message: "Public reviews retrieved",
      data: {
        items: reviews,
        pagination: { page: pageNum, limit: limitNum, totalCount, totalPages: Math.ceil(totalCount / limitNum) || 1 },
        stats
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Public reviews fetch failed", data: null });
  }
}

export async function getFeaturedReviews(req, res) {
  try {
    if (!requireDb(res)) return;

    const reviews = await Review.find({ status: "approved", featured: true })
      .select("-email -phone -ipAddress -__v")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Featured reviews retrieved",
      data: reviews
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Featured reviews fetch failed", data: null });
  }
}

export async function getAdminReviewStats(req, res) {
  try {
    if (!requireDb(res)) return;
    const [total, pending, approved, rejected, hidden, approvedReviews] = await Promise.all([
      Review.countDocuments(),
      Review.countDocuments({ status: "pending" }),
      Review.countDocuments({ status: "approved" }),
      Review.countDocuments({ status: "rejected" }),
      Review.countDocuments({ status: "hidden" }),
      Review.find({ status: "approved" }).select("rating").lean()
    ]);
    const stats = reviewStats(approvedReviews);
    return res.status(200).json({
      success: true,
      message: "Review stats retrieved successfully",
      data: { total, pending, approved, rejected, hidden, averageRating: stats.averageRating }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Review stats fetch failed", data: null });
  }
}

export async function getAdminReviews(req, res) {
  try {
    if (!requireDb(res)) return;

    const reviews = await Review.find().sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      message: "Admin reviews retrieved",
      data: {
        items: reviews,
        pagination: { page: 1, limit: reviews.length, totalCount: reviews.length, totalPages: 1 }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Admin reviews fetch failed", data: null });
  }
}

export async function getAdminReviewById(req, res) {
  try {
    if (!requireDb(res)) return;
    const review = await getReviewOrFail(req.params.id, res);
    if (!review) return;
    return res.status(200).json({ success: true, message: "Review details retrieved", data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Review lookup failed", data: null });
  }
}

export async function approveReview(req, res) {
  if (!requireDb(res)) return;
  const review = await getReviewOrFail(req.params.id, res);
  if (!review) return;
  review.status = "approved";
  await review.save();
  return res.status(200).json({ success: true, message: "Review approved successfully", data: review });
}

export async function rejectReview(req, res) {
  if (!requireDb(res)) return;
  const review = await getReviewOrFail(req.params.id, res);
  if (!review) return;
  review.status = "rejected";
  await review.save();
  return res.status(200).json({ success: true, message: "Review rejected", data: review });
}

export async function toggleFeatureReview(req, res) {
  if (!requireDb(res)) return;
  const review = await getReviewOrFail(req.params.id, res);
  if (!review) return;
  review.featured = req.body.featured !== undefined ? Boolean(req.body.featured) : !review.featured;
  await review.save();
  return res.status(200).json({ success: true, message: "Review feature status updated", data: review });
}

export async function toggleVerifyReview(req, res) {
  if (!requireDb(res)) return;
  const review = await getReviewOrFail(req.params.id, res);
  if (!review) return;
  review.verified = req.body.verified !== undefined ? Boolean(req.body.verified) : !review.verified;
  await review.save();
  return res.status(200).json({ success: true, message: "Verified Client status updated", data: review });
}

export async function replyToReview(req, res) {
  if (!requireDb(res)) return;
  const review = await getReviewOrFail(req.params.id, res);
  if (!review) return;
  review.adminReply = {
    message: sanitizeText(req.body.message || req.body.reply || req.body.replyMessage || ""),
    repliedAt: new Date(),
    repliedBy: req.user?.email || req.user?.name || "admin"
  };
  await review.save();
  return res.status(200).json({ success: true, message: "Admin reply saved", data: review });
}

export async function updateAdminReview(req, res) {
  if (!requireDb(res)) return;
  if (!validObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid review ID", data: null });
  }
  const existing = await Review.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Review not found", data: null });
  const allowed = ["name", "company", "projectType", "rating", "title", "message", "country", "city", "profileImage", "projectImage", "verified", "featured", "status"];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = typeof req.body[key] === "string" ? sanitizeText(req.body[key]) : req.body[key];
  });
  const review = await Review.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  const currentMedia = new Set(extractMediaPaths(review));
  await deleteUnreferencedMedia(extractMediaPaths(existing).filter((url) => !currentMedia.has(url)));
  return res.status(200).json({ success: true, message: "Review updated", data: review });
}

export async function deleteReview(req, res) {
  if (!requireDb(res)) return;
  if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid review ID", data: null });
  const deleted = await Review.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: "Review not found", data: null });
  await deleteUnreferencedMedia(extractMediaPaths(deleted));
  return res.status(200).json({ success: true, message: "Review deleted successfully", data: { id: req.params.id } });
}

export async function bulkReviewAction(req, res) {
  if (!requireDb(res)) return;
  const { ids = [], action } = req.body;
  const validIds = Array.isArray(ids) ? ids.filter(validObjectId) : [];
  if (!Array.isArray(ids) || validIds.length !== ids.length) {
    return res.status(400).json({ success: false, message: "One or more review IDs are invalid.", data: null });
  }
  if (action === "delete") {
    const reviews = await Review.find({ _id: { $in: validIds } });
    const result = await Review.deleteMany({ _id: { $in: validIds } });
    await deleteUnreferencedMedia(reviews.flatMap(extractMediaPaths));
    return res.status(200).json({ success: true, message: "Bulk action completed successfully", data: { affectedCount: result.deletedCount } });
  }
  const actionUpdates = {
    approve: { status: "approved" },
    reject: { status: "rejected" },
    hide: { status: "hidden" },
    feature: { featured: true },
    unfeature: { featured: false },
    verify: { verified: true },
    unverify: { verified: false }
  };
  const update = actionUpdates[action];
  if (!update) return res.status(400).json({ success: false, message: "Unsupported bulk action.", data: null });
  const result = await Review.updateMany({ _id: { $in: validIds } }, { $set: update });
  return res.status(200).json({ success: true, message: "Bulk action completed successfully", data: { affectedCount: result.modifiedCount } });
}

export async function exportReviewsCsv(req, res) {
  if (!requireDb(res)) return;
  const reviews = await Review.find().sort({ createdAt: -1 }).lean();
  const rows = reviews.map((r) =>
    `"${sanitizeCsvCell(r._id)}","${sanitizeCsvCell(r.name)}","${sanitizeCsvCell(r.rating)}","${sanitizeCsvCell(r.title)}","${sanitizeCsvCell(r.message)}"`
  );
  const csvContent = `ID,Name,Rating,Title,Message\n${rows.join("\n")}`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="client-endorsements.csv"');
  return res.status(200).send(csvContent);
}

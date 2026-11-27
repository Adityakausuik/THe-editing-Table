import { createId, isValidId } from "../utils/ids.js";
import {
  bulkPostgresReviewAction,
  createPostgresReview,
  deletePostgresReview,
  getPostgresAdminReviewStats,
  getPostgresReviewById,
  listAllPostgresReviews,
  listPostgresAdminReviews,
  listPostgresFeaturedReviews,
  listPostgresPublicReviews,
  updatePostgresReview
} from "../db/reviewRepository.js";
import { deleteUnreferencedMedia, extractMediaPaths } from "../utils/mediaCleanup.js";

// Helper to strip script tags and basic HTML
function sanitizeText(str = "") {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
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

function validObjectId(id) {
  return isValidId(id);
}

async function updatePostgresReviewOrFail(id, updates, res) {
  if (!validObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid review ID", data: null });
    return null;
  }
  const review = await updatePostgresReview(id, updates);
  if (!review) {
    res.status(404).json({ success: false, message: "Review not found", data: null });
    return null;
  }
  return review;
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

    const reviewPayload = {
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
    };

    const review = await createPostgresReview(createId(), reviewPayload);
    return res.status(201).json({
      success: true,
      message: "Thank you! Your review has been submitted and is awaiting admin approval.",
      data: { _id: review._id, id: review._id }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit review. Please try again.",
      data: null
    });
  }
}

export async function getPublicReviews(req, res) {
  try {
    const { page = 1, limit = 9, rating, sort = "newest", projectType } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));

    const result = await listPostgresPublicReviews({ page: pageNum, limit: limitNum, rating, sort, projectType });
    const reviews = result.reviews || result.items || [];
    const total = result.total ?? result.pagination?.totalCount ?? reviews.length;
    return res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully",
      data: reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1
      },
      stats: result.stats
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch reviews", data: null });
  }
}

export async function getFeaturedReviews(req, res) {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const reviews = await listPostgresFeaturedReviews(limit);
    return res.status(200).json({ success: true, message: "Featured reviews retrieved", data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch featured reviews", data: null });
  }
}

// ---------------------------------------------------
// ADMIN CONTROLLERS
// ---------------------------------------------------

export async function getAdminReviewStats(req, res) {
  try {
    const stats = await getPostgresAdminReviewStats();
    return res.status(200).json({ success: true, message: "Review stats retrieved", data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch review statistics", data: null });
  }
}

export async function getAdminReviews(req, res) {
  try {
    const { page = 1, limit = 15, status, rating, sort = "newest", search, featured } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));

    const result = await listPostgresAdminReviews({ page: pageNum, limit: limitNum, status, rating, sort, search, featured });
    const reviews = Array.isArray(result) ? result : (result?.reviews || []);
    const total = Array.isArray(result) ? result.length : (result?.total || 0);
    return res.status(200).json({
      success: true,
      message: "Admin reviews retrieved",
      data: reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch admin reviews", data: null });
  }
}

export async function getReviewById(req, res) {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID", data: null });
    }
    const review = await getPostgresReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found", data: null });
    }
    return res.status(200).json({ success: true, message: "Review details retrieved", data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Review lookup failed", data: null });
  }
}

export const getAdminReviewById = getReviewById;

export async function approveReview(req, res) {
  const review = await updatePostgresReviewOrFail(req.params.id, { status: "approved" }, res);
  if (!review) return;
  return res.status(200).json({ success: true, message: "Review approved successfully", data: review });
}

export async function rejectReview(req, res) {
  const review = await updatePostgresReviewOrFail(req.params.id, { status: "rejected" }, res);
  if (!review) return;
  return res.status(200).json({ success: true, message: "Review rejected", data: review });
}

export async function toggleFeatureReview(req, res) {
  if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid review ID", data: null });
  const existing = await getPostgresReviewById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Review not found", data: null });
  const review = await updatePostgresReview(req.params.id, { featured: req.body.featured !== undefined ? Boolean(req.body.featured) : !existing.featured });
  return res.status(200).json({ success: true, message: "Review feature status updated", data: review });
}

export async function toggleVerifyReview(req, res) {
  if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid review ID", data: null });
  const existing = await getPostgresReviewById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Review not found", data: null });
  const review = await updatePostgresReview(req.params.id, { verified: req.body.verified !== undefined ? Boolean(req.body.verified) : !existing.verified });
  return res.status(200).json({ success: true, message: "Verified Client status updated", data: review });
}

export async function replyToReview(req, res) {
  const review = await updatePostgresReviewOrFail(req.params.id, {
    adminReply: {
      message: sanitizeText(req.body.message || req.body.reply || req.body.replyMessage || ""),
      repliedAt: new Date(),
      repliedBy: req.user?.email || req.user?.name || "admin"
    }
  }, res);
  if (!review) return;
  return res.status(200).json({ success: true, message: "Admin reply saved", data: review });
}

export async function updateAdminReview(req, res) {
  const allowed = ["name", "company", "projectType", "rating", "title", "message", "country", "city", "profileImage", "projectImage", "verified", "featured", "status"];
  const update = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) update[key] = typeof req.body[key] === "string" ? sanitizeText(req.body[key]) : req.body[key];
  });
  const review = await updatePostgresReviewOrFail(req.params.id, update, res);
  if (!review) return;
  return res.status(200).json({ success: true, message: "Review updated", data: review });
}

export async function deleteReview(req, res) {
  if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid review ID", data: null });
  const deleted = await deletePostgresReview(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: "Review not found", data: null });
  await deleteUnreferencedMedia(extractMediaPaths(deleted));
  return res.status(200).json({ success: true, message: "Review deleted successfully", data: { id: req.params.id } });
}

export async function bulkReviewAction(req, res) {
  const { ids = [], action } = req.body;
  const validIds = Array.isArray(ids) ? ids.filter(validObjectId) : [];
  if (!Array.isArray(ids) || validIds.length !== ids.length) {
    return res.status(400).json({ success: false, message: "One or more review IDs are invalid.", data: null });
  }
  const result = await bulkPostgresReviewAction(validIds.map(String), action);
  if (!result) return res.status(400).json({ success: false, message: "Unsupported bulk action.", data: null });
  if (action === "delete") await deleteUnreferencedMedia(result.deletedReviews.flatMap(extractMediaPaths));
  return res.status(200).json({ success: true, message: "Bulk action completed successfully", data: { affectedCount: result.affectedCount } });
}

export async function exportReviewsCsv(req, res) {
  const reviews = await listAllPostgresReviews();
  const rows = reviews.map((r) =>
    `"${sanitizeCsvCell(r._id)}","${sanitizeCsvCell(r.name)}","${sanitizeCsvCell(r.rating)}","${sanitizeCsvCell(r.title)}","${sanitizeCsvCell(r.message)}"`
  );
  const csvContent = `ID,Name,Rating,Title,Message\n${rows.join("\n")}`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="client-endorsements.csv"');
  return res.status(200).send(csvContent);
}

import { getPostgresPool } from "./postgres.js";

const publicColumns = `
  "_id", "name", "company", "project_type" AS "projectType", "rating", "title", "message",
  "profile_image" AS "profileImage", "project_image" AS "projectImage",
  "country", "city", "verified", "featured", "status",
  "admin_reply__message" AS "adminReplyMessage",
  "admin_reply__replied_at" AS "adminReplyRepliedAt",
  "admin_reply__replied_by" AS "adminReplyRepliedBy",
  "created_at" AS "createdAt", "updated_at" AS "updatedAt"`;

function reviewFromRow(row) {
  const review = {
    _id: row._id,
    name: row.name,
    company: row.company,
    projectType: row.projectType,
    rating: row.rating,
    title: row.title,
    message: row.message,
    profileImage: row.profileImage,
    projectImage: row.projectImage,
    country: row.country,
    city: row.city,
    verified: row.verified,
    featured: row.featured,
    status: row.status,
    adminReply: {
      message: row.adminReplyMessage || "",
      repliedAt: row.adminReplyRepliedAt,
      repliedBy: row.adminReplyRepliedBy || ""
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
  if (row.email !== undefined) review.email = row.email;
  if (row.phone !== undefined) review.phone = row.phone;
  if (row.ipAddress !== undefined) review.ipAddress = row.ipAddress;
  return review;
}

const adminColumns = `${publicColumns}, "email", "phone", "ip_address" AS "ipAddress"`;

const mutableColumns = {
  name: "name",
  company: "company",
  projectType: "project_type",
  rating: "rating",
  title: "title",
  message: "message",
  country: "country",
  city: "city",
  profileImage: "profile_image",
  projectImage: "project_image",
  verified: "verified",
  featured: "featured",
  status: "status"
};

function flattenedRowValues(updates) {
  const result = [];
  for (const [key, value] of Object.entries(updates)) {
    const column = mutableColumns[key];
    if (column) result.push([column, value]);
  }
  if (updates.adminReply) {
    result.push(["admin_reply__message", updates.adminReply.message || ""]);
    result.push(["admin_reply__replied_at", updates.adminReply.repliedAt || null]);
    result.push(["admin_reply__replied_by", updates.adminReply.repliedBy || ""]);
  }
  return result;
}

export function buildPublicReviewFilter({ rating, projectType, search }) {
  const clauses = ['"status" = \'approved\''];
  const values = [];
  if (rating && Number.isFinite(Number(rating))) {
    values.push(Number(rating));
    clauses.push(`"rating" = $${values.length}`);
  }
  if (projectType && projectType !== "All") {
    values.push(projectType);
    clauses.push(`"project_type" = $${values.length}`);
  }
  if (search) {
    const escapedSearch = String(search).replace(/[\\%_]/g, "\\$&");
    values.push(`%${escapedSearch}%`);
    const parameter = `$${values.length}`;
    clauses.push(`("title" ILIKE ${parameter} ESCAPE E'\\\\' OR "message" ILIKE ${parameter} ESCAPE E'\\\\' OR "name" ILIKE ${parameter} ESCAPE E'\\\\' OR "company" ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  return { where: clauses.join(" AND "), values };
}

export async function createPostgresReview(review) {
  const values = [
    review._id, review.name, review.email, review.phone, review.company, review.projectType,
    review.rating, review.title, review.message, review.profileImage, review.projectImage,
    review.country, review.city, review.verified, review.featured, review.status,
    review.ipAddress, new Date(), new Date()
  ];
  await getPostgresPool().query(
    `INSERT INTO "reviews" ("_id", "name", "email", "phone", "company", "project_type", "rating", "title", "message", "profile_image", "project_image", "country", "city", "verified", "featured", "status", "ip_address", "created_at", "updated_at") VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})`,
    values
  );
  return { _id: review._id };
}

export async function listPostgresPublicReviews({ rating, projectType, search, page, limit, sort }) {
  const { where, values } = buildPublicReviewFilter({ rating, projectType, search });
  const pool = getPostgresPool();
  const [{ rows: rows }, { rows: countRows }, { rows: statRows }] = await Promise.all([
    pool.query(
      `SELECT ${publicColumns} FROM "reviews" WHERE ${where} ORDER BY "created_at" ${sort === "oldest" ? "ASC" : "DESC"} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit]
    ),
    pool.query(`SELECT count(*)::int AS total FROM "reviews" WHERE ${where}`, values),
    pool.query(`SELECT "rating", count(*)::int AS count FROM "reviews" WHERE ${where} GROUP BY "rating"`, values)
  ]);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalApproved = 0;
  let ratingTotal = 0;
  for (const row of statRows) {
    const count = Number(row.count);
    distribution[row.rating] = count;
    totalApproved += count;
    ratingTotal += Number(row.rating) * count;
  }
  const totalCount = Number(countRows[0]?.total || 0);
  return {
    items: rows.map(reviewFromRow),
    pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) || 1 },
    stats: {
      averageRating: totalApproved ? ratingTotal / totalApproved : 0,
      totalApproved,
      distribution
    }
  };
}

export async function listPostgresFeaturedReviews() {
  const result = await getPostgresPool().query(
    `SELECT ${publicColumns} FROM "reviews" WHERE "status" = 'approved' AND "featured" = TRUE ORDER BY "created_at" DESC LIMIT 10`
  );
  return result.rows.map(reviewFromRow);
}

export async function getPostgresAdminReviewStats() {
  const { rows } = await getPostgresPool().query(
    `SELECT count(*)::int AS total,
      count(*) FILTER (WHERE "status" = 'pending')::int AS pending,
      count(*) FILTER (WHERE "status" = 'approved')::int AS approved,
      count(*) FILTER (WHERE "status" = 'rejected')::int AS rejected,
      count(*) FILTER (WHERE "status" = 'hidden')::int AS hidden,
      avg("rating") FILTER (WHERE "status" = 'approved') AS "averageRating"
    FROM "reviews"`
  );
  const row = rows[0] || {};
  return {
    total: Number(row.total || 0),
    pending: Number(row.pending || 0),
    approved: Number(row.approved || 0),
    rejected: Number(row.rejected || 0),
    hidden: Number(row.hidden || 0),
    averageRating: Number(row.averageRating || 0)
  };
}

export async function listPostgresAdminReviews() {
  const result = await getPostgresPool().query(`SELECT ${adminColumns} FROM "reviews" ORDER BY "created_at" DESC`);
  return result.rows.map(reviewFromRow);
}

export async function getPostgresReviewById(id) {
  const result = await getPostgresPool().query(`SELECT ${adminColumns} FROM "reviews" WHERE "_id" = $1 LIMIT 1`, [id]);
  return result.rows[0] ? reviewFromRow(result.rows[0]) : null;
}

export async function updatePostgresReview(id, updates) {
  const entries = flattenedRowValues(updates);
  if (!entries.length) return getPostgresReviewById(id);
  const values = entries.map(([, value]) => value);
  const assignments = entries.map(([column], index) => `"${column}" = $${index + 1}`);
  values.push(id);
  const result = await getPostgresPool().query(
    `UPDATE "reviews" SET ${assignments.join(", ")}, "updated_at" = now() WHERE "_id" = $${values.length} RETURNING "_id"`,
    values
  );
  return result.rowCount ? getPostgresReviewById(id) : null;
}

export async function deletePostgresReview(id) {
  const existing = await getPostgresReviewById(id);
  if (!existing) return null;
  await getPostgresPool().query(`DELETE FROM "reviews" WHERE "_id" = $1`, [id]);
  return existing;
}

export async function bulkPostgresReviewAction(ids, action) {
  const pool = getPostgresPool();
  if (action === "delete") {
    const { rows } = await pool.query(`SELECT ${adminColumns} FROM "reviews" WHERE "_id" = ANY($1::text[])`, [ids]);
    const result = await pool.query(`DELETE FROM "reviews" WHERE "_id" = ANY($1::text[])`, [ids]);
    return { affectedCount: result.rowCount, deletedReviews: rows.map(reviewFromRow) };
  }
  const updates = {
    approve: { status: "approved" },
    reject: { status: "rejected" },
    hide: { status: "hidden" },
    feature: { featured: true },
    unfeature: { featured: false },
    verify: { verified: true },
    unverify: { verified: false }
  }[action];
  if (!updates) return null;
  const [[column, value]] = flattenedRowValues(updates);
  const result = await pool.query(
    `UPDATE "reviews" SET "${column}" = $1, "updated_at" = now() WHERE "_id" = ANY($2::text[])`,
    [value, ids]
  );
  return { affectedCount: result.rowCount, deletedReviews: [] };
}

export async function listAllPostgresReviews() {
  const result = await getPostgresPool().query(`SELECT ${adminColumns} FROM "reviews" ORDER BY "created_at" DESC`);
  return result.rows.map(reviewFromRow);
}

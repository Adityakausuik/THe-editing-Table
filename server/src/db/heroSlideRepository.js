import { getPostgresPool } from "./postgres.js";
import HeroSlide from "../models/HeroSlide.model.js";
import {
  createPostgresCmsRecord,
  deletePostgresCmsRecord,
  getPostgresCmsRecord,
  listPostgresCmsRecords,
  updatePostgresCmsRecord
} from "./cmsRepository.js";

export function fromPostgresHeroSlide(row) {
  if (!row) return null;
  return {
    _id: row._id,
    slideNumber: row.slide_number,
    slideKey: row.slide_key,
    slideType: row.slide_type,
    layoutType: row.layout_type,
    label: row.label,
    eyebrow: row.eyebrow,
    headingLines: row.heading_lines,
    title: row.title,
    subtitle: row.subtitle,
    tag: row.tag,
    caption: row.caption,
    description: row.description,
    featureItems: row.feature_items,
    quote: row.quote,
    ctaText: row.cta_text,
    ctaLink: row.cta_link,
    trustLabel: row.trust_label,
    mainImage: row.main_image,
    images: row.images,
    imageGrid: row.image_grid,
    featuredImageIndex: row.featured_image_index,
    order: row.order,
    active: row.active,
    status: row.status,
    transitionDuration: row.transition_duration,
    __v: row.__v,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listPublishedHeroSlides() {
  const result = await getPostgresPool().query(
    'SELECT * FROM "heroslides" WHERE "active" = TRUE AND "status" = $1 ORDER BY "order" ASC, "created_at" ASC',
    ["published"]
  );
  return result.rows.map(fromPostgresHeroSlide);
}

export async function listPostgresHeroSlides() {
  return listPostgresCmsRecords(HeroSlide, { orderField: "order", admin: true });
}

export async function getPostgresHeroSlide(id) {
  return getPostgresCmsRecord(HeroSlide, id);
}

export async function createPostgresHeroSlide(id, payload) {
  return createPostgresCmsRecord(HeroSlide, id, payload);
}

export async function updatePostgresHeroSlide(id, payload) {
  return updatePostgresCmsRecord(HeroSlide, id, payload);
}

export async function deletePostgresHeroSlide(id) {
  return deletePostgresCmsRecord(HeroSlide, id);
}

export async function reorderPostgresHeroSlides(ids, pool = getPostgresPool()) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const normalizedIds = ids.map(String);
    const existing = await client.query('SELECT "_id" FROM "heroslides" WHERE "_id" = ANY($1::text[])', [normalizedIds]);
    if (existing.rowCount !== normalizedIds.length) {
      await client.query("ROLLBACK");
      return null;
    }
    for (const [index, id] of normalizedIds.entries()) {
      await client.query(
        'UPDATE "heroslides" SET "order" = $1, "slide_number" = $1, "__v" = "__v" + 1, "updated_at" = now() WHERE "_id" = $2',
        [index + 1, id]
      );
    }
    const result = await client.query('SELECT * FROM "heroslides" ORDER BY "order" ASC, "created_at" ASC');
    await client.query("COMMIT");
    return result.rows.map(fromPostgresHeroSlide);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

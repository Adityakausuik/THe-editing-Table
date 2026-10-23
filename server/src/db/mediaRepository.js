import { getPostgresPool } from "./postgres.js";
import { createPostgresCmsRecord, deletePostgresCmsRecord, mapPostgresCmsRow } from "./cmsRepository.js";

const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;

export async function createPostgresMediaRecord(Model, payload) {
  const document = new Model(payload);
  await document.validate();
  return createPostgresCmsRecord(Model, document._id.toString(), document.toObject());
}

export async function createPostgresMediaRecords(Model, payloads) {
  const documents = payloads.map((payload) => new Model(payload));
  await Promise.all(documents.map((document) => document.validate()));
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const records = [];
    for (const document of documents) {
      records.push(await createPostgresCmsRecord(Model, document._id.toString(), document.toObject(), client));
    }
    await client.query("COMMIT");
    return records;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function listPostgresMediaRecords(Model, { category, search } = {}) {
  const table = quote(Model.collection.collectionName);
  const values = [];
  const clauses = [];
  if (category && category !== "All") {
    values.push(category);
    clauses.push(`"category" = $${values.length}`);
  }
  if (search) {
    const escaped = String(search).replace(/[\\%_]/g, "\\$&");
    values.push(`%${escaped}%`);
    clauses.push(`("original_name" ILIKE $${values.length} ESCAPE E'\\\\' OR "alt_text" ILIKE $${values.length} ESCAPE E'\\\\')`);
  }
  const result = await getPostgresPool().query(
    `SELECT * FROM ${table}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY "created_at" DESC NULLS LAST, "_id" DESC`,
    values
  );
  return result.rows.map((row) => mapPostgresCmsRow(Model, row));
}

export async function deletePostgresMediaRecord(Model, id) {
  return deletePostgresCmsRecord(Model, id);
}

/** Conservative reference guard across content tables; identifiers are a fixed allowlist. */
export async function isPostgresMediaReferenced(url) {
  if (!url || typeof url !== "string") return false;
  const tables = [
    "aboutmes", "adminactivitylogs", "blogposts", "brandcollaborations", "careerscontents",
    "contactemails", "contactoffices", "contactphones", "contactsettings", "enquiries",
    "heroslides", "jobs", "jobapplications", "partners", "photoshowcaseitems",
    "portfolioitems", "reviews", "services", "teammembers", "videoanalytics",
    "videoshowcaseitems", "videoshowcasesettings", "weddinggalleryitems", "workinghours"
  ];
  const pool = getPostgresPool();
  for (const table of tables) {
    const result = await pool.query(
      `SELECT 1 FROM ${quote(table)} WHERE strpos(to_jsonb(${quote(table)})::text, $1) > 0 LIMIT 1`,
      [url]
    ).catch((error) => {
      if (error.code === "42P01") return null;
      throw error;
    });
    if (result?.rowCount) return true;
  }
  return false;
}

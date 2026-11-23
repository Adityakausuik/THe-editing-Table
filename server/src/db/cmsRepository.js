import { getPostgresPool } from "./postgres.js";

const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;

function columnName(schemaPath) {
  return schemaPath.split(".").map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()).join("__");
}

function getPathValue(value, schemaPath) {
  return schemaPath.split(".").reduce((current, part) => current == null ? undefined : current[part], value);
}

function setPathValue(value, schemaPath, next) {
  const parts = schemaPath.split(".");
  let target = value;
  for (const part of parts.slice(0, -1)) target = target[part] ||= {};
  target[parts.at(-1)] = next;
}

function schemaFields(Model) {
  return Object.entries(Model.schema.paths)
    .filter(([name]) => !["_id", "__v", "createdAt", "updatedAt"].includes(name));
}

function fromRow(Model, row) {
  if (!row) return null;
  const doc = { _id: row._id, __v: row.__v ?? 0 };
  for (const [name] of schemaFields(Model)) {
    const value = row[columnName(name)];
    if (value !== undefined) setPathValue(doc, name, value);
  }
  if (Model.schema.options.timestamps) {
    doc.createdAt = row.created_at;
    doc.updatedAt = row.updated_at;
  }
  return doc;
}

export function mapPostgresCmsRow(Model, row) {
  return fromRow(Model, row);
}

function jsonValue(field, value) {
  if (value === undefined) return undefined;
  if (field.instance === "ObjectId" && value != null) {
    return typeof value.toHexString === "function" ? value.toHexString() : String(value);
  }
  return ["Array", "Map", "Mixed", "Embedded", "Decimal128"].includes(field.instance)
    ? JSON.stringify(value)
    : value;
}

function addWhereValue(values, clauses, column, value) {
  values.push(value);
  clauses.push(`${quote(column)} = $${values.length}`);
}

function buildFilter(Model, { publicFilter = {}, search = "", category = "All", id } = {}) {
  const clauses = [];
  const values = [];
  const validPaths = new Set(Object.keys(Model.schema.paths));
  for (const [field, value] of Object.entries(publicFilter)) {
    if (!validPaths.has(field)) continue;
    const column = quote(columnName(field));
    if (value === null) clauses.push(`${column} IS NULL`);
    else addWhereValue(values, clauses, columnName(field), value);
  }
  if (category && category !== "All" && validPaths.has("category")) {
    addWhereValue(values, clauses, "category", category);
  }
  if (id !== undefined) addWhereValue(values, clauses, "_id", id);
  if (search) {
    const candidates = ["title", "name", "email", "department", "location", "phone", "applicantName", "positionTitle", "companyName", "brandName", "description", "shortDescription", "fullName"]
      .filter((field) => validPaths.has(field));
    if (candidates.length) {
      const escaped = String(search).replace(/[\\%_]/g, "\\$&");
      values.push(`%${escaped}%`);
      const parameter = `$${values.length}`;
      clauses.push(`(${candidates.map((field) => `${quote(columnName(field))} ILIKE ${parameter} ESCAPE E'\\\\'`).join(" OR ")})`);
    }
  }
  return { clauses: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", values };
}

export function buildPostgresCmsFilter(Model, options) {
  return buildFilter(Model, options);
}

function orderBy(Model, orderField, admin, direction = "ASC") {
  const orderColumn = Model.schema.path(orderField) ? columnName(orderField) : "_id";
  const orderDirection = direction === "DESC" ? "DESC" : "ASC";
  return ` ORDER BY ${quote(orderColumn)} ${orderDirection}, ${Model.schema.options.timestamps ? `"created_at" ${admin ? "DESC" : "ASC"}` : `"_id" ASC`} NULLS LAST`;
}

export async function listPostgresCmsRecords(Model, options = {}) {
  const { clauses, values } = buildFilter(Model, options);
  const result = await getPostgresPool().query(
    `SELECT * FROM ${quote(Model.collection.collectionName)}${clauses}${orderBy(Model, options.orderField || "order", options.admin, options.direction)}`,
    values
  );
  return result.rows.map((row) => fromRow(Model, row));
}

export async function getPostgresCmsRecord(Model, id, publicFilter = {}) {
  const { clauses, values } = buildFilter(Model, { id, publicFilter });
  const result = await getPostgresPool().query(`SELECT * FROM ${quote(Model.collection.collectionName)}${clauses} LIMIT 1`, values);
  return fromRow(Model, result.rows[0]);
}

function payloadColumns(Model, payload) {
  const columns = [];
  for (const [name, field] of schemaFields(Model)) {
    const value = getPathValue(payload, name);
    if (value === undefined) continue;
    columns.push([columnName(name), jsonValue(field, value)]);
  }
  return columns;
}

export async function createPostgresCmsRecord(Model, id, payload, executor = getPostgresPool()) {
  const now = new Date();
  const columns = [["_id", id], ...payloadColumns(Model, payload), ["__v", 0]];
  if (Model.schema.options.timestamps) columns.push(["created_at", now], ["updated_at", now]);
  const result = await executor.query(
    `INSERT INTO ${quote(Model.collection.collectionName)} (${columns.map(([name]) => quote(name)).join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")}) RETURNING *`,
    columns.map(([, value]) => value)
  );
  return fromRow(Model, result.rows[0]);
}

export function buildPostgresCmsUpdateQuery(Model, id, payload, { expectedVersion } = {}) {
  const columns = payloadColumns(Model, payload);
  if (!columns.length) return null;
  const values = columns.map(([, value]) => value);
  const assignments = columns.map(([column], index) => `${quote(column)} = $${index + 1}`);
  assignments.push('"__v" = "__v" + 1');
  if (Model.schema.options.timestamps) assignments.push(`"updated_at" = now()`);
  values.push(id);
  const idParameter = values.length;
  const versionClause = expectedVersion === undefined ? "" : ` AND "__v" = $${values.push(expectedVersion)}`;
  return {
    text: `UPDATE ${quote(Model.collection.collectionName)} SET ${assignments.join(", ")} WHERE "_id" = $${idParameter}${versionClause} RETURNING *`,
    values
  };
}

export async function updatePostgresCmsRecord(Model, id, payload, options = {}) {
  const query = buildPostgresCmsUpdateQuery(Model, id, payload, options);
  if (!query) return getPostgresCmsRecord(Model, id);
  const result = await getPostgresPool().query(query.text, query.values);
  return fromRow(Model, result.rows[0]);
}

export async function reorderPostgresCmsRecords(Model, orderField, items) {
  const pool = getPostgresPool();
  const table = quote(Model.collection.collectionName);
  const orderColumn = quote(columnName(orderField));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ids = items.map((item) => String(item.id));
    const existing = await client.query(`SELECT "_id" FROM ${table} WHERE "_id" = ANY($1::text[])`, [ids]);
    if (existing.rowCount !== ids.length) {
      await client.query("ROLLBACK");
      return null;
    }
    for (const item of items) {
      await client.query(
        `UPDATE ${table} SET ${orderColumn} = $1${Model.schema.options.timestamps ? ', "updated_at" = now()' : ""} WHERE "_id" = $2`,
        [item.order, String(item.id)]
      );
    }
    const result = await client.query(`SELECT * FROM ${table}${orderBy(Model, orderField, true)}`);
    await client.query("COMMIT");
    return result.rows.map((row) => fromRow(Model, row));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePostgresCmsRecord(Model, id) {
  const existing = await getPostgresCmsRecord(Model, id);
  if (!existing) return null;
  await getPostgresPool().query(`DELETE FROM ${quote(Model.collection.collectionName)} WHERE "_id" = $1`, [id]);
  return existing;
}

export async function bulkDeletePostgresCmsRecords(Model, ids) {
  const table = quote(Model.collection.collectionName);
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const selected = await client.query(`SELECT * FROM ${table} WHERE "_id" = ANY($1::text[])`, [ids]);
    if (selected.rowCount !== ids.length) {
      await client.query("ROLLBACK");
      return null;
    }
    const deleted = await client.query(`DELETE FROM ${table} WHERE "_id" = ANY($1::text[])`, [ids]);
    await client.query("COMMIT");
    return { items: selected.rows.map((row) => fromRow(Model, row)), deletedCount: deleted.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

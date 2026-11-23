import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { Pool } from "@neondatabase/serverless";
import { env, isRemoteMongoUri } from "../src/config/env.js";
import { dependencyOrder, loadModels, toJsonValue } from "./migrate-mongo-to-postgres.mjs";

const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = Math.max(25, Math.min(500, Number.parseInt(process.env.ROLLBACK_BATCH_SIZE || "", 10) || 200));
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;

function columnName(schemaPath) {
  return schemaPath.split(".").map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()).join("__");
}

function setPathValue(target, schemaPath, value) {
  const parts = schemaPath.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ||= {};
  cursor[parts.at(-1)] = value;
}

function castRollbackValue(field, value) {
  if (value == null) return value;
  if (field.instance === "ObjectId") {
    if (typeof value?.toHexString === "function") return value;
    if (/^[a-f\d]{24}$/i.test(String(value))) return new mongoose.Types.ObjectId(String(value));
    return value;
  }
  if (field.instance === "Date") return value instanceof Date ? value : new Date(value);
  if (field.instance === "Number" && typeof value === "string") return Number(value);
  if (field.instance === "Decimal128" || field.instance === "Array" || field.instance === "Map" || field.instance === "Mixed" || field.instance === "Embedded") {
    return decodeExtendedJson(value);
  }
  if (field.instance === "Buffer" && !Buffer.isBuffer(value)) return Buffer.from(value);
  return value;
}

function decodeExtendedJson(value) {
  if (Array.isArray(value)) return value.map(decodeExtendedJson);
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Object.keys(value).length === 1 && typeof value.$binary === "string") {
    return Buffer.from(value.$binary, "base64");
  }
  const decoded = mongoose.mongo.BSON.EJSON.deserialize(value, { relaxed: false });
  return decoded;
}

export function mapPostgresRowToMongoDocument(Model, row, extras = {}, mixedBsonValues = {}) {
  const raw = {
    _id: /^[a-f\d]{24}$/i.test(String(row._id)) ? new mongoose.Types.ObjectId(String(row._id)) : String(row._id),
    __v: Number.isInteger(Number(row.__v)) ? Number(row.__v) : 0
  };
  for (const [schemaPath, field] of Object.entries(Model.schema.paths)) {
    if (["_id", "__v", "createdAt", "updatedAt"].includes(schemaPath)) continue;
    const value = row[columnName(schemaPath)];
    if (value === undefined) continue;
    setPathValue(raw, schemaPath, castRollbackValue(field, value));
  }
  if (Model.schema.options.timestamps) {
    raw.createdAt = row.created_at ?? null;
    raw.updatedAt = row.updated_at ?? null;
  }
  for (const [schemaPath, field] of Object.entries(Model.schema.paths)) {
    if (field.instance !== "Mixed" || mixedBsonValues[schemaPath] === undefined) continue;
    const restored = decodeExtendedJson(mixedBsonValues[schemaPath]);
    const currentPostgresValue = row[columnName(schemaPath)];
    const normalizedImportedValue = toJsonValue(restored);
    if (JSON.stringify(stableValue(currentPostgresValue)) === JSON.stringify(stableValue(normalizedImportedValue))) {
      setPathValue(raw, schemaPath, restored);
    }
  }
  const unknownFields = decodeExtendedJson(extras || {});
  for (const [key, value] of Object.entries(unknownFields)) {
    if (key.includes(".")) setPathValue(raw, key, value);
    else raw[key] = value;
  }
  return raw;
}

function stableValue(value) {
  if (value === undefined) return { $undefined: true };
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Buffer.isBuffer(value)) return { $binary: value.toString("base64") };
  if (value?._bsontype === "ObjectId" || typeof value?.toHexString === "function") return { $oid: value.toHexString() };
  if (value?._bsontype === "Decimal128" || value?._bsontype === "Long") return { [value._bsontype]: value.toString() };
  if (value?._bsontype === "Binary") return { $binary: Buffer.from(value.value(true)).toString("base64"), subtype: value.sub_type };
  if (value?._bsontype === "Timestamp") return { $timestamp: { t: value.getHighBitsUnsigned(), i: value.getLowBitsUnsigned() } };
  if (value?._bsontype === "Int32" || value?._bsontype === "Double") return { [value._bsontype]: value.valueOf() };
  if (value?._bsontype === "BSONRegExp" || value?._bsontype === "RegExp") return { $regularExpression: { pattern: value.pattern ?? value.source, options: value.options ?? value.flags } };
  if (Array.isArray(value)) return value.map(stableValue);
  if (value instanceof Map) return stableValue(Object.fromEntries(value));
  if (typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return String(value);
}

export function validateRollbackTarget({
  config = env,
  apply = APPLY,
  target = process.env.MIGRATION_TARGET,
  deployedFreeze = process.env.CONFIRM_DEPLOYED_WRITE_FREEZE,
  postgresFreeze = process.env.CONFIRM_POSTGRES_WRITE_FREEZE,
  mongoFreeze = process.env.CONFIRM_MONGODB_WRITE_FREEZE,
  mongoBackup = process.env.CONFIRM_MONGODB_BACKUP
} = {}) {
  if (config.VERCEL_ENV !== "production" || config.DATABASE_BACKEND !== "postgres" ||
      target !== "production-rollback" || !config.DATABASE_URL || !isRemoteMongoUri(config.MONGODB_URI)) {
    throw new Error("Rollback sync requires VERCEL_ENV=production, DATABASE_BACKEND=postgres, MIGRATION_TARGET=production-rollback, and explicit remote Production/Mongo URLs.");
  }
  if (apply) {
    if (deployedFreeze !== "production") {
      throw new Error("Apply requires the deployed application-level read-only mode: CONFIRM_DEPLOYED_WRITE_FREEZE=production after verifying MIGRATION_WRITE_FREEZE=true on the active deployment.");
    }
    if (postgresFreeze !== "production") {
      throw new Error("Apply requires the Production PostgreSQL app write freeze: CONFIRM_POSTGRES_WRITE_FREEZE=production.");
    }
    if (mongoFreeze !== "production") {
      throw new Error("Apply requires the MongoDB destination write freeze: CONFIRM_MONGODB_WRITE_FREEZE=production.");
    }
    if (mongoBackup !== "production") {
      throw new Error("Apply requires a verified Atlas backup: CONFIRM_MONGODB_BACKUP=production.");
    }
  }
  return true;
}

function assertRollbackTarget() {
  validateRollbackTarget();
}

async function assertPostgresSourceReady(pool, models) {
  const schema = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1", ["0001_initial_postgres_schema"]);
  if (!schema.rowCount) throw new Error("PostgreSQL schema migration 0001 is missing; rollback sync refused.");
  const runs = await pool.query("SELECT source_collection, status FROM migration_runs");
  const states = new Map(runs.rows.map((row) => [row.source_collection, row.status]));
  const incomplete = models.map((model) => model.collection.collectionName).filter((name) => states.get(name) !== "completed");
  if (incomplete.length) throw new Error(`PostgreSQL migration is incomplete for: ${incomplete.join(", ")}.`);
}

async function getExtras(pool, collection, ids) {
  if (!ids.length) return new Map();
  const result = await pool.query(
    "SELECT source_id, document FROM mongo_migration_extras WHERE source_collection = $1 AND source_id = ANY($2::text[])",
    [collection, ids]
  );
  return new Map(result.rows.map((row) => [row.source_id, row.document]));
}

async function getMixedBsonValues(pool, collection, ids) {
  if (!ids.length) return new Map();
  const result = await pool.query(
    "SELECT source_id, document FROM mongo_migration_mixed_bson WHERE source_collection = $1 AND source_id = ANY($2::text[])",
    [collection, ids]
  );
  return new Map(result.rows.map((row) => [row.source_id, row.document]));
}

async function readMongoBatch(collection, ids) {
  return collection.find({ _id: { $in: ids } }).toArray();
}

function assertDocumentsEqual(expected, actual, collectionName) {
  const expectedJson = JSON.stringify(stableValue(expected));
  const actualJson = JSON.stringify(stableValue(actual));
  if (expectedJson !== actualJson) {
    throw new Error(`PostgreSQL-to-Mongo verification mismatch in ${collectionName} at _id ${String(expected._id)}.`);
  }
}

async function syncCollectionRows(pool, mongoDb, Model) {
  const name = Model.collection.collectionName;
  const table = quote(name);
  const mongoCollection = mongoDb.collection(name);
  let lastId = null;
  let total = 0;
  while (true) {
    const result = lastId === null
      ? await pool.query(`SELECT * FROM ${table} ORDER BY "_id" LIMIT $1`, [BATCH_SIZE])
      : await pool.query(`SELECT * FROM ${table} WHERE "_id" > $1 ORDER BY "_id" LIMIT $2`, [lastId, BATCH_SIZE]);
    if (!result.rows.length) break;
    const ids = result.rows.map((row) => String(row._id));
    const extras = await getExtras(pool, name, ids);
    const mixedBsonValues = await getMixedBsonValues(pool, name, ids);
    const documents = result.rows.map((row) => mapPostgresRowToMongoDocument(
      Model,
      row,
      extras.get(String(row._id)),
      mixedBsonValues.get(String(row._id))
    ));
    const operations = documents.map((document) => ({
      replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true }
    }));
    await mongoCollection.bulkWrite(operations, { ordered: true });
    const written = await readMongoBatch(mongoCollection, documents.map((document) => document._id));
    const byId = new Map(written.map((document) => [String(document._id), document]));
    for (const document of documents) {
      const actual = byId.get(String(document._id));
      if (!actual) throw new Error(`Rollback verification could not find ${name}.${String(document._id)} in MongoDB.`);
      assertDocumentsEqual(document, actual, name);
    }
    total += result.rows.length;
    lastId = String(result.rows.at(-1)._id);
    console.info(`[rollback] copied and verified ${name}: ${total} rows`);
  }
  return total;
}

async function pruneMongoRowsMissingFromPostgres(pool, mongoDb, Model) {
  const name = Model.collection.collectionName;
  const table = quote(name);
  const collection = mongoDb.collection(name);
  let batch = [];
  let deleted = 0;
  async function flush() {
    if (!batch.length) return;
    const docs = batch;
    batch = [];
    const ids = docs.map((doc) => String(doc._id));
    const existing = await pool.query(`SELECT "_id" FROM ${table} WHERE "_id" = ANY($1::text[])`, [ids]);
    const present = new Set(existing.rows.map((row) => String(row._id)));
    const staleIds = docs.filter((doc) => !present.has(String(doc._id))).map((doc) => doc._id);
    if (staleIds.length) {
      const result = await collection.deleteMany({ _id: { $in: staleIds } });
      deleted += result.deletedCount;
      await pool.query(
        "DELETE FROM mongo_migration_mixed_bson WHERE source_collection = $1 AND source_id = ANY($2::text[])",
        [name, staleIds.map((id) => String(id))]
      );
    }
  }
  for await (const doc of collection.find({}, { projection: { _id: 1 } }).batchSize(BATCH_SIZE)) {
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return deleted;
}

export async function rollbackPostgresToMongo() {
  assertRollbackTarget();
  const models = dependencyOrder(await loadModels());
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10_000 });
  const mongo = await mongoose.createConnection(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    bufferCommands: false,
    readPreference: "primary"
  }).asPromise();
  try {
    await assertPostgresSourceReady(pool, models);
    const before = [];
    for (const Model of models) {
      const name = Model.collection.collectionName;
      const pgCount = await pool.query(`SELECT count(*)::bigint AS count FROM ${quote(name)}`);
      const mongoCount = await mongo.db.collection(name).countDocuments();
      before.push({ collection: name, postgresCount: Number(pgCount.rows[0].count), mongoCount });
    }
    if (!APPLY) {
      console.info(`[rollback] Dry run checked ${before.length} collections; no MongoDB documents were changed.`);
      for (const result of before) console.info(`[rollback] ${result.collection}: PostgreSQL=${result.postgresCount}, MongoDB=${result.mongoCount}`);
      console.info("For an apply run, first freeze application writes and verify an Atlas backup, then set both freeze confirmations and CONFIRM_MONGODB_BACKUP=production.");
      return before;
    }

    for (const Model of models) await syncCollectionRows(pool, mongo.db, Model);
    const pruneResults = [];
    for (const Model of [...models].reverse()) {
      const deleted = await pruneMongoRowsMissingFromPostgres(pool, mongo.db, Model);
      const name = Model.collection.collectionName;
      const pgCount = await pool.query(`SELECT count(*)::bigint AS count FROM ${quote(name)}`);
      const mongoCount = await mongo.db.collection(name).countDocuments();
      if (mongoCount !== Number(pgCount.rows[0].count)) {
        throw new Error(`Rollback count verification failed for ${name}: PostgreSQL=${pgCount.rows[0].count}, MongoDB=${mongoCount}.`);
      }
      pruneResults.push({ collection: name, postgresCount: Number(pgCount.rows[0].count), mongoCount, deleted });
    }
    console.info(`[rollback] Reconciled and verified ${pruneResults.length} collections. Atlas source files and databases remain intact.`);
    return pruneResults;
  } finally {
    await Promise.allSettled([mongo.close(), pool.end()]);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  rollbackPostgresToMongo().catch((error) => {
    console.error(`[rollback] Failed: ${error.message}`);
    process.exitCode = 1;
  });
}

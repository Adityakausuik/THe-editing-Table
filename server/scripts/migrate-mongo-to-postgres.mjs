import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { Pool } from "@neondatabase/serverless";
import { env, isRemoteMongoUri } from "../src/config/env.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(scriptDir, "..");
const modelDir = path.join(serverDir, "src", "models");
const schemaFile = path.join(serverDir, "migrations", "0001_initial_postgres_schema.sql");
const APPLY = process.argv.includes("--apply");
const defaultBatchSize = 250;
const batchSize = Math.max(1, Math.min(1000, Number.parseInt(process.env.MIGRATION_BATCH_SIZE || "", 10) || defaultBatchSize));

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;

function columnName(schemaPath) {
  return schemaPath
    .split(".")
    .map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase())
    .join("__");
}

function getPathValue(document, schemaPath) {
  return schemaPath.split(".").reduce((value, part) => value == null ? undefined : value[part], document);
}

export function toJsonValue(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return { $binary: value.toString("base64") };
  if (value && typeof value.toHexString === "function") return value.toHexString();
  if (value?._bsontype === "Decimal128") return { $numberDecimal: value.toString() };
  if (value?._bsontype === "Long") {
    const number = value.toNumber();
    return Number.isSafeInteger(number) ? number : { $numberLong: value.toString() };
  }
  if (value?._bsontype === "Int32" || value?._bsontype === "Double") return value.valueOf();
  if (value?._bsontype === "Binary") {
    const bytes = typeof value.value === "function" ? value.value(true) : value.buffer;
    return { $binary: { base64: Buffer.from(bytes).toString("base64"), subType: value.sub_type?.toString(16).padStart(2, "0") || "00" } };
  }
  if (value?._bsontype === "Timestamp") {
    return { $timestamp: { t: value.getHighBitsUnsigned(), i: value.getLowBitsUnsigned() } };
  }
  if (value?._bsontype === "BSONRegExp" || value?._bsontype === "RegExp") {
    return { $regularExpression: { pattern: value.pattern ?? value.source, options: value.options ?? value.flags } };
  }
  if (value?._bsontype === "BSONSymbol") return value.value;
  if (value?._bsontype === "BSONUndefined") return null;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, item]) => [key, toJsonValue(item)]));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]));
  }
  return String(value);
}

function toMigrationExtraValue(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Buffer.isBuffer(value)) return { $binary: { base64: value.toString("base64"), subType: "00" } };
  if (value && typeof value.toHexString === "function") return { $oid: value.toHexString() };
  if (value?._bsontype === "Decimal128") return { $numberDecimal: value.toString() };
  if (value?._bsontype === "Long") return { $numberLong: value.toString() };
  if (value?._bsontype === "Int32") return { $numberInt: value.toString() };
  if (value?._bsontype === "Double") return { $numberDouble: value.toString() };
  if (value?._bsontype === "Binary") {
    const bytes = typeof value.value === "function" ? value.value(true) : value.buffer;
    return { $binary: { base64: Buffer.from(bytes).toString("base64"), subType: value.sub_type?.toString(16).padStart(2, "0") || "00" } };
  }
  if (value?._bsontype === "Timestamp") {
    return { $timestamp: { t: value.getHighBitsUnsigned(), i: value.getLowBitsUnsigned() } };
  }
  if (value?._bsontype === "BSONRegExp" || value?._bsontype === "RegExp") {
    return { $regularExpression: { pattern: value.pattern ?? value.source, options: value.options ?? value.flags } };
  }
  if (Array.isArray(value)) return value.map(toMigrationExtraValue);
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, item]) => [key, toMigrationExtraValue(item)]));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toMigrationExtraValue(item)]));
  }
  return String(value);
}

function hasExtendedBsonType(value) {
  if (value instanceof Date || Buffer.isBuffer(value) || typeof value?.toHexString === "function") return true;
  if (["Decimal128", "Long", "Int32", "Double", "Binary", "Timestamp", "BSONRegExp", "RegExp"].includes(value?._bsontype)) return true;
  if (Array.isArray(value)) return value.some(hasExtendedBsonType);
  if (value instanceof Map) return [...value.values()].some(hasExtendedBsonType);
  if (value && typeof value === "object") return Object.values(value).some(hasExtendedBsonType);
  return false;
}

export function mapMixedBsonValues(model, document) {
  const values = {};
  for (const [path, field] of Object.entries(model.schema.paths)) {
    if (field.instance !== "Mixed") continue;
    const value = getPathValue(document, path);
    if (value === undefined || !hasExtendedBsonType(value)) continue;
    values[path] = mongoose.mongo.BSON.EJSON.serialize(value, { relaxed: false });
  }
  return values;
}

export function pgValue(field, value) {
  if (value === undefined) return null;
  if (["Array", "Map", "Mixed", "Embedded", "Decimal128"].includes(field.instance)) {
    return JSON.stringify(toJsonValue(value));
  }
  if (field.instance === "Number" && value?._bsontype === "Long") {
    const number = value.toNumber();
    if (!Number.isSafeInteger(number)) {
      throw new Error("An unsafe BSON 64-bit integer cannot be represented in a PostgreSQL DOUBLE PRECISION column without data loss.");
    }
    return number;
  }
  if (field.instance === "Number" && (value?._bsontype === "Int32" || value?._bsontype === "Double")) return value.valueOf();
  if (field.instance === "ObjectId" && value && typeof value.toHexString === "function") return value.toHexString();
  if (field.instance === "Buffer" && Buffer.isBuffer(value)) return value;
  if (value && typeof value.toHexString === "function") return value.toHexString();
  if (value instanceof Date) return value;
  return value;
}

export async function loadModels() {
  const files = (await fs.readdir(modelDir)).filter((file) => file.endsWith(".model.js")).sort();
  for (const file of files) await import(pathToFileURL(path.join(modelDir, file)).href);
  return mongoose.modelNames().map((name) => mongoose.model(name));
}

export function dependencyOrder(models) {
  const byName = new Map(models.map((model) => [model.modelName, model]));
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(model) {
    if (visited.has(model.modelName)) return;
    if (visiting.has(model.modelName)) throw new Error(`Cyclic Mongo reference detected at ${model.modelName}.`);
    visiting.add(model.modelName);
    for (const field of Object.values(model.schema.paths)) {
      const referenced = field.options?.ref && byName.get(field.options.ref);
      if (referenced) visit(referenced);
    }
    visiting.delete(model.modelName);
    visited.add(model.modelName);
    ordered.push(model);
  }

  for (const model of models) visit(model);
  return ordered;
}

export function reconciliationPruneOrder(models) {
  return dependencyOrder(models).reverse();
}

export async function findOrphanedReferences(mongoDb, models) {
  const byName = new Map(models.map((model) => [model.modelName, model]));
  const orphans = [];

  for (const model of models) {
    const sourceCollection = model.collection.collectionName;
    for (const [fieldPath, field] of Object.entries(model.schema.paths)) {
      const referencedModel = field.options?.ref && byName.get(field.options.ref);
      if (!referencedModel) continue;

      const [result] = await mongoDb.collection(sourceCollection).aggregate([
        { $match: { [fieldPath]: { $ne: null } } },
        {
          $lookup: {
            from: referencedModel.collection.collectionName,
            localField: fieldPath,
            foreignField: "_id",
            as: "__postgres_migration_reference"
          }
        },
        { $match: { __postgres_migration_reference: { $eq: [] } } },
        { $count: "count" }
      ]).toArray();

      const count = Number(result?.count || 0);
      if (count > 0) {
        orphans.push({ collection: sourceCollection, field: fieldPath, referencedCollection: referencedModel.collection.collectionName, count });
      }
    }
  }

  return orphans;
}

export async function findRequiredFieldViolations(mongoDb, models) {
  const violations = [];
  for (const model of models) {
    for (const [fieldPath, field] of Object.entries(model.schema.paths)) {
      const preservesDeletedAdmin = model.modelName === "AdminActivityLog" && fieldPath === "adminId";
      if (!field.isRequired || field.options?.default !== undefined || preservesDeletedAdmin) continue;
      const invalidValues = [{ [fieldPath]: { $exists: false } }, { [fieldPath]: null }];
      if (field.instance === "String") invalidValues.push({ [fieldPath]: "" });
      const count = await mongoDb.collection(model.collection.collectionName).countDocuments({
        $or: invalidValues
      });
      if (count > 0) violations.push({ collection: model.collection.collectionName, field: fieldPath, count });
    }
  }
  return violations;
}

export async function findDuplicateUniqueValues(mongoDb, models) {
  const duplicates = [];
  for (const model of models) {
    for (const [keys, options] of model.schema.indexes()) {
      if (!options.unique) continue;
      const fields = Object.keys(keys);
      const match = { ...(options.partialFilterExpression || {}) };
      if (options.sparse) {
        match.$and = [
          ...(match.$and || []),
          ...fields.map((field) => ({ [field]: { $exists: true, $ne: null } }))
        ];
      }
      const pipeline = [
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        {
          $group: {
            _id: Object.fromEntries(fields.map((field) => [field, `$${field}`])),
            count: { $sum: 1 }
          }
        },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 }
      ];
      const [duplicate] = await mongoDb.collection(model.collection.collectionName).aggregate(pipeline).toArray();
      if (duplicate) {
        duplicates.push({
          collection: model.collection.collectionName,
          fields,
          index: options.name || null,
          count: duplicate.count
        });
      }
    }
  }
  return duplicates;
}

export function mapDocument(model, document) {
  const fields = Object.entries(model.schema.paths)
    .filter(([name]) => !["_id", "__v", "createdAt", "updatedAt"].includes(name));
  const columns = [["_id", String(document._id)]];
  for (const [name, field] of fields) {
    const sourceValue = getPathValue(document, name);
    const value = sourceValue === undefined ? field.getDefault() : sourceValue;
    columns.push([columnName(name), pgValue(field, value)]);
  }
  columns.push(["__v", Number.isInteger(document.__v) ? document.__v : 0]);
  if (model.schema.options.timestamps) {
    columns.push(["created_at", document.createdAt ?? null]);
    columns.push(["updated_at", document.updatedAt ?? null]);
  }

  const schemaPaths = new Set(fields.map(([name]) => name));
  const unknownFields = {};
  function collectUnknownFields(value, parentPath = "") {
    if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date || Buffer.isBuffer(value)) return;
    for (const [name, child] of Object.entries(value)) {
      const fieldPath = parentPath ? `${parentPath}.${name}` : name;
      if (["_id", "__v", "createdAt", "updatedAt"].includes(fieldPath)) continue;
      if (schemaPaths.has(fieldPath)) continue;
      const hasKnownChildren = [...schemaPaths].some((path) => path.startsWith(`${fieldPath}.`));
      if (hasKnownChildren && child && typeof child === "object" && !Array.isArray(child) && !(child instanceof Date) && !Buffer.isBuffer(child)) {
        collectUnknownFields(child, fieldPath);
      } else {
        unknownFields[fieldPath] = toMigrationExtraValue(child);
      }
    }
  }
  collectUnknownFields(document);

  if (new Set(columns.map(([name]) => name)).size !== columns.length) {
    throw new Error(`Column mapping collision in ${model.collection.collectionName}.`);
  }
  return { columns, unknownFields, mixedBsonValues: mapMixedBsonValues(model, document) };
}

export function upsertSql(collection, columns) {
  const names = columns.map(([name]) => name);
  const placeholders = names.map((_, index) => `$${index + 1}`);
  const updates = names.filter((name) => name !== "_id");
  const updateClause = updates.length
    ? `DO UPDATE SET ${updates.map((name) => `${quoteIdentifier(name)} = EXCLUDED.${quoteIdentifier(name)}`).join(", ")}`
    : "DO NOTHING";
  return {
    text: `INSERT INTO ${quoteIdentifier(collection)} (${names.map(quoteIdentifier).join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (${quoteIdentifier("_id")}) ${updateClause}`,
    values: columns.map(([, value]) => value)
  };
}

export function pruneMissingTargetRowsSql(collection) {
  const table = quoteIdentifier(collection);
  return {
    text: `DELETE FROM ${table} AS target WHERE NOT EXISTS (SELECT 1 FROM migration_source_ids AS source WHERE source.source_collection = $1 AND source.id = target."_id")`,
    values: [collection]
  };
}

export function assertSourceWriteFreeze(confirmation, target = "preview-staging") {
  if (confirmation !== target) {
    throw new Error(`Final PostgreSQL sync requires a confirmed MongoDB application write freeze; set CONFIRM_MONGODB_WRITE_FREEZE=${target} only during the maintenance window.`);
  }
}

export function assertPostgresWriteFreeze(confirmation, target = "preview-staging") {
  if (confirmation !== target) {
    throw new Error(`PostgreSQL import requires the ${target} application to be write-frozen; set CONFIRM_POSTGRES_WRITE_FREEZE=${target} during the maintenance window.`);
  }
}

export function assertMigrationWriteAuthorization({ apply, target = "preview-staging", sourceConfirmation, postgresConfirmation, deployedFreezeConfirmation, mongoBackupConfirmation }) {
  if (!apply) return;
  if (deployedFreezeConfirmation !== target) {
    throw new Error(`PostgreSQL import requires the application-level read-only deployment to be active; set CONFIRM_DEPLOYED_WRITE_FREEZE=${target} only after verifying MIGRATION_WRITE_FREEZE=true on the target deployment.`);
  }
  assertSourceWriteFreeze(sourceConfirmation, target);
  assertPostgresWriteFreeze(postgresConfirmation, target);
  if (target === "production" && mongoBackupConfirmation !== "production") {
    throw new Error("Production import requires a verified, current MongoDB Atlas backup; set CONFIRM_MONGODB_BACKUP=production only after verifying the backup restore point.");
  }
}

export function validateMigrationTarget({ vercelEnv, target, databaseUrl, previewDatabaseUrl, mongoUri }) {
  if (target === "preview-staging") {
    if (vercelEnv !== "preview" || !previewDatabaseUrl || databaseUrl !== previewDatabaseUrl) {
      throw new Error("Preview migration requires VERCEL_ENV=preview, MIGRATION_TARGET=preview-staging, and the dedicated PREVIEW_DATABASE_URL.");
    }
    return "preview-staging";
  }
  if (target === "production") {
    if (vercelEnv !== "production" || !databaseUrl || !previewDatabaseUrl || databaseUrl === previewDatabaseUrl || !isRemoteMongoUri(mongoUri)) {
      throw new Error("Production migration requires VERCEL_ENV=production, MIGRATION_TARGET=production, a Production DATABASE_URL distinct from PREVIEW_DATABASE_URL, and a remote MongoDB source.");
    }
    return "production";
  }
  throw new Error("Migration target must be exactly preview-staging or production.");
}

async function stageSourceIds(pgClient, source, collection, expectedCount) {
  let batch = [];
  let stagedCount = 0;
  async function flush() {
    if (!batch.length) return;
    const values = batch;
    batch = [];
    const flattened = values.flatMap((id) => [collection, id]);
    const sourcePlaceholders = values.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(", ");
    await pgClient.query(
      `INSERT INTO migration_source_ids (source_collection, id) VALUES ${sourcePlaceholders} ON CONFLICT (source_collection, id) DO NOTHING`,
      flattened
    );
  }
  const cursor = source.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).batchSize(1000);
  for await (const document of cursor) {
    batch.push(String(document._id));
    stagedCount += 1;
    if (batch.length >= 1000) await flush();
  }
  await flush();
  if (stagedCount !== expectedCount) {
    throw new Error(`Source collection ${collection} changed while IDs were being staged; no pruning was committed.`);
  }
  return stagedCount;
}

async function writeBatch(pgClient, model, documents, nextSourceId, totalMigrated) {
  const collection = model.collection.collectionName;
  await pgClient.query("BEGIN");
  try {
    for (const document of documents) {
      const mapped = mapDocument(model, document);
      const upsert = upsertSql(collection, mapped.columns);
      await pgClient.query(upsert.text, upsert.values);
      if (Object.keys(mapped.unknownFields).length) {
        await pgClient.query(
          `INSERT INTO mongo_migration_extras (source_collection, source_id, document) VALUES ($1, $2, $3::jsonb) ON CONFLICT (source_collection, source_id) DO UPDATE SET document = EXCLUDED.document`,
          [collection, String(document._id), JSON.stringify(mapped.unknownFields)]
        );
      } else {
        await pgClient.query(
          "DELETE FROM mongo_migration_extras WHERE source_collection = $1 AND source_id = $2",
          [collection, String(document._id)]
        );
      }
      if (Object.keys(mapped.mixedBsonValues).length) {
        await pgClient.query(
          `INSERT INTO mongo_migration_mixed_bson (source_collection, source_id, document) VALUES ($1, $2, $3::jsonb) ON CONFLICT (source_collection, source_id) DO UPDATE SET document = EXCLUDED.document`,
          [collection, String(document._id), JSON.stringify(mapped.mixedBsonValues)]
        );
      } else {
        await pgClient.query(
          "DELETE FROM mongo_migration_mixed_bson WHERE source_collection = $1 AND source_id = $2",
          [collection, String(document._id)]
        );
      }
    }
    await pgClient.query(
      "UPDATE migration_runs SET last_source_id = $1, migrated_count = $2, status = 'running', error_summary = NULL, updated_at = now() WHERE source_collection = $3",
      [nextSourceId, totalMigrated, collection]
    );
    await pgClient.query("COMMIT");
  } catch (error) {
    await pgClient.query("ROLLBACK");
    throw error;
  }
}

async function migrateCollection(pgClient, mongoDb, model) {
  const collection = model.collection.collectionName;
  const source = mongoDb.collection(collection);
  const sourceCount = await source.countDocuments();
  const prior = await pgClient.query("SELECT last_source_id, migrated_count, status FROM migration_runs WHERE source_collection = $1", [collection]);
  if (!prior.rows.length) {
    const existingTarget = await pgClient.query(`SELECT count(*)::bigint AS count FROM ${quoteIdentifier(collection)}`);
    if (Number(existingTarget.rows[0]?.count || 0) > 0) {
      throw new Error(`Refusing to overwrite pre-existing target rows in ${collection}; migration checkpoint is missing.`);
    }
  }
  let lastSourceId = prior.rows[0]?.status === "completed" ? null : prior.rows[0]?.last_source_id || null;
  let migratedCount = lastSourceId ? Number(prior.rows[0]?.migrated_count || 0) : 0;

  await pgClient.query(
    "INSERT INTO migration_runs (source_collection, last_source_id, migrated_count, status, error_summary, updated_at) VALUES ($1, $2, $3, 'running', NULL, now()) ON CONFLICT (source_collection) DO UPDATE SET last_source_id = EXCLUDED.last_source_id, migrated_count = EXCLUDED.migrated_count, status = 'running', error_summary = NULL, updated_at = now()",
    [collection, lastSourceId, migratedCount]
  );

  try {
    while (true) {
      const query = lastSourceId
        ? { _id: { $gt: /^[a-f\d]{24}$/i.test(lastSourceId) ? new mongoose.Types.ObjectId(lastSourceId) : lastSourceId } }
        : {};
      const documents = await source.find(query).sort({ _id: 1 }).limit(batchSize).toArray();
      if (!documents.length) break;
      lastSourceId = String(documents.at(-1)._id);
      migratedCount += documents.length;
      await writeBatch(pgClient, model, documents, lastSourceId, migratedCount);
      console.info(`[migration] ${collection}: ${migratedCount}/${sourceCount}`);
    }

    await pgClient.query("BEGIN");
    const stagedCount = await stageSourceIds(pgClient, source, collection, sourceCount);
    if (model.schema.options.timestamps) {
      const latestSource = await source.findOne({ updatedAt: { $ne: null } }, { projection: { updatedAt: 1 }, sort: { updatedAt: -1 } });
      if (latestSource?.updatedAt) {
        const latestTarget = await pgClient.query(`SELECT max("updated_at") AS latest FROM ${quoteIdentifier(collection)}`);
        if (!latestTarget.rows[0]?.latest || new Date(latestTarget.rows[0].latest) < new Date(latestSource.updatedAt)) {
          throw new Error(`Source collection ${collection} changed during import; latest source update is newer than PostgreSQL.`);
        }
      }
    }
    await pgClient.query(
      "UPDATE migration_runs SET status = 'staged', migrated_count = $1, error_summary = NULL, updated_at = now() WHERE source_collection = $2",
      [stagedCount, collection]
    );
    await pgClient.query("COMMIT");
    return { collection, sourceCount: stagedCount };
  } catch (error) {
    await pgClient.query("ROLLBACK").catch(() => {});
    await pgClient.query(
      "UPDATE migration_runs SET status = 'error', error_summary = $1, updated_at = now() WHERE source_collection = $2",
      [String(error.message).slice(0, 500), collection]
    ).catch(() => {});
    throw error;
  }
}

async function pruneAndValidateCollection(pgClient, model) {
  const collection = model.collection.collectionName;
  await pgClient.query("BEGIN");
  try {
    const staleRows = await pgClient.query(pruneMissingTargetRowsSql(collection).text, [collection]);
    await pgClient.query(
      "DELETE FROM mongo_migration_extras AS extras WHERE extras.source_collection = $1 AND NOT EXISTS (SELECT 1 FROM migration_source_ids AS source WHERE source.source_collection = $1 AND source.id = extras.source_id)",
      [collection]
    );
    await pgClient.query(
      "DELETE FROM mongo_migration_mixed_bson AS mixed WHERE mixed.source_collection = $1 AND NOT EXISTS (SELECT 1 FROM migration_source_ids AS source WHERE source.source_collection = $1 AND source.id = mixed.source_id)",
      [collection]
    );
    const target = await pgClient.query(`SELECT count(*)::bigint AS count FROM ${quoteIdentifier(collection)}`);
    const targetCount = Number(target.rows[0]?.count || 0);
    const staged = await pgClient.query(
      "SELECT count(*)::bigint AS count FROM migration_source_ids WHERE source_collection = $1",
      [collection]
    );
    const stagedCount = Number(staged.rows[0]?.count || 0);
    if (targetCount !== stagedCount) throw new Error(`Count validation failed for ${collection}: source=${stagedCount}, target=${targetCount}.`);
    await pgClient.query(
      "UPDATE migration_runs SET status = 'completed', migrated_count = $1, error_summary = NULL, updated_at = now() WHERE source_collection = $2",
      [stagedCount, collection]
    );
    await pgClient.query("COMMIT");
    return { collection, sourceCount: stagedCount, targetCount, prunedCount: staleRows.rowCount };
  } catch (error) {
    await pgClient.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

export async function migrateMongoToPostgres() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be explicitly configured for the read-only migration source.");
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be configured for the PostgreSQL migration target.");
  const migrationTarget = validateMigrationTarget({
    vercelEnv: env.VERCEL_ENV,
    target: process.env.MIGRATION_TARGET,
    databaseUrl: env.DATABASE_URL,
    previewDatabaseUrl: env.PREVIEW_DATABASE_URL,
    mongoUri: process.env.MONGODB_URI
  });
  assertMigrationWriteAuthorization({
    apply: APPLY,
    target: migrationTarget,
    sourceConfirmation: process.env.CONFIRM_MONGODB_WRITE_FREEZE,
    postgresConfirmation: process.env.CONFIRM_POSTGRES_WRITE_FREEZE,
    deployedFreezeConfirmation: process.env.CONFIRM_DEPLOYED_WRITE_FREEZE,
    mongoBackupConfirmation: process.env.CONFIRM_MONGODB_BACKUP
  });

  const models = dependencyOrder(await loadModels());
  const mongo = await mongoose.createConnection(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    bufferCommands: false,
    readPreference: "primary"
  }).asPromise();
  const pgPool = new Pool({ connectionString: env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10_000 });

  try {
    const orphanedReferences = await findOrphanedReferences(mongo.db, models);
    if (orphanedReferences.length) {
      const summary = orphanedReferences.map((item) => `${item.collection}.${item.field} -> ${item.referencedCollection}: ${item.count}`).join("; ");
      throw new Error(`Reference preflight found orphaned documents; no schema or data was written. ${summary}`);
    }

    const requiredFieldViolations = await findRequiredFieldViolations(mongo.db, models);
    if (requiredFieldViolations.length) {
      const summary = requiredFieldViolations.map((item) => `${item.collection}.${item.field}: ${item.count}`).join("; ");
      throw new Error(`Required-field preflight found missing or null values; no schema or data was written. ${summary}`);
    }

    const duplicateUniqueValues = await findDuplicateUniqueValues(mongo.db, models);
    if (duplicateUniqueValues.length) {
      const summary = duplicateUniqueValues.map((item) => `${item.collection}.${item.fields.join(",")}: duplicate groups found`).join("; ");
      throw new Error(`Unique-index preflight found duplicate values; no schema or data was written. ${summary}`);
    }

    if (!APPLY) {
      const sourceCounts = await Promise.all(models.map(async (model) => ({
        collection: model.collection.collectionName,
        count: await mongo.db.collection(model.collection.collectionName).countDocuments()
      })));
      console.info(`[migration] Dry run passed source validation for ${sourceCounts.length} collections; total source documents: ${sourceCounts.reduce((sum, item) => sum + item.count, 0)}.`);
      console.info(`No PostgreSQL schema or data was changed. Repeat with --apply and target-specific write-freeze confirmations only during the ${migrationTarget} maintenance window.`);
      return sourceCounts;
    }

    const ddl = await fs.readFile(schemaFile, "utf8");
    await pgPool.query(ddl);
    await pgPool.query("INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING", ["0001_initial_postgres_schema"]);
    const client = await pgPool.connect();
    try {
      await client.query("CREATE TEMP TABLE IF NOT EXISTS migration_source_ids (source_collection TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY (source_collection, id)) ON COMMIT PRESERVE ROWS");
      for (const model of models) await migrateCollection(client, mongo.db, model);
      const results = [];
      for (const model of reconciliationPruneOrder(models)) results.push(await pruneAndValidateCollection(client, model));
      console.info(`[migration] Completed ${results.length} collections. Source row total: ${results.reduce((sum, item) => sum + item.sourceCount, 0)}.`);
      return results;
    } finally {
      client.release();
    }
  } finally {
    await Promise.allSettled([mongo.close(), pgPool.end()]);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrateMongoToPostgres().catch((error) => {
    console.error(`[migration] Failed: ${error.message}`);
    process.exitCode = 1;
  });
}

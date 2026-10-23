import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(scriptDir, "..");
const modelDir = path.join(serverDir, "src", "models");
const migrationsDir = path.join(serverDir, "migrations");
const outputFile = path.join(migrationsDir, "0001_initial_postgres_schema.sql");
const inventoryFile = path.join(migrationsDir, "mongodb-schema-inventory.json");

const quote = (identifier) => `"${String(identifier).replaceAll('"', '""')}"`;

function columnName(schemaPath) {
  return schemaPath
    .split(".")
    .map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase())
    .join("__");
}

function sqlType(schemaPath) {
  switch (schemaPath.instance) {
    case "String": return "TEXT";
    case "Number": return "DOUBLE PRECISION";
    case "Boolean": return "BOOLEAN";
    case "Date": return "TIMESTAMPTZ";
    case "ObjectId": return "TEXT";
    case "Buffer": return "BYTEA";
    case "Array":
    case "Map":
    case "Mixed":
    case "Embedded":
    case "Decimal128":
    default: return "JSONB";
  }
}

function sqlLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value === null) return "NULL";
  return null;
}

function stableIndexName(collection, keys) {
  const base = `idx_${collection}_${keys.map(([field]) => columnName(field)).join("_")}`
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();
  if (base.length <= 55) return base;
  const suffix = crypto.createHash("sha1").update(base).digest("hex").slice(0, 7);
  return `${base.slice(0, 47)}_${suffix}`;
}

async function loadModels() {
  const files = (await fs.readdir(modelDir)).filter((file) => file.endsWith(".model.js")).sort();
  for (const file of files) {
    await import(pathToFileURL(path.join(modelDir, file)).href);
  }
  const mongoose = (await import("mongoose")).default;
  return mongoose.modelNames().sort().map((name) => mongoose.model(name));
}

function createTableSql(model) {
  const fields = Object.entries(model.schema.paths)
    .filter(([name]) => !["_id", "__v"].includes(name))
    .filter(([name]) => !model.schema.options.timestamps || !["createdAt", "updatedAt"].includes(name))
    .map(([name, field]) => {
      const parts = [quote(columnName(name)), sqlType(field)];
      const preserveOnDelete = model.modelName === "AdminActivityLog" && name === "adminId";
      if (field.isRequired && !preserveOnDelete) parts.push("NOT NULL");
      const defaultValue = field.options?.default;
      if (typeof defaultValue !== "function" && defaultValue !== undefined) {
        const literal = ["Array", "Map", "Mixed", "Embedded"].includes(field.instance)
          ? `'${JSON.stringify(defaultValue).replaceAll("'", "''")}'::jsonb`
          : sqlLiteral(defaultValue);
        if (literal !== null) parts.push(`DEFAULT ${literal}`);
      }
      return `  ${parts.join(" ")}`;
    });

  // Mongoose models use ObjectId IDs. Generate 24-hex strings for rows created
  // directly by SQL so those rows remain hydratable and rollback-compatible.
  fields.unshift(`  ${quote("_id")} TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)`);
  fields.push(`  ${quote("__v")} INTEGER NOT NULL DEFAULT 0`);
  if (model.schema.options.timestamps) {
    // Legacy Mongo documents can legitimately lack timestamps. Preserve that
    // absence as SQL NULL during import; new application writes set timestamps
    // explicitly through their repositories/Mongoose-compatible behavior.
    fields.push(`  ${quote("created_at")} TIMESTAMPTZ`);
    fields.push(`  ${quote("updated_at")} TIMESTAMPTZ`);
  }

  const columns = fields.map((definition) => definition.match(/^\s*"([^"]+)"/)?.[1]).filter(Boolean);
  if (new Set(columns).size !== columns.length) {
    throw new Error(`Column name collision in generated PostgreSQL schema for ${model.collection.collectionName}.`);
  }

  return `CREATE TABLE IF NOT EXISTS ${quote(model.collection.collectionName)} (\n${fields.join(",\n")}\n);`;
}

function createIndexSql(model) {
  return model.schema.indexes().map(([keys, options]) => {
    const entries = Object.entries(keys);
    const columns = entries.map(([field, direction]) => `${quote(columnName(field))} ${direction < 0 ? "DESC" : "ASC"}`);
    const unique = options.unique ? "UNIQUE " : "";
    const name = stableIndexName(model.collection.collectionName, entries);
    const ttl = options.expireAfterSeconds !== undefined
      ? `\n-- Mongo TTL index ${name}: Postgres requires scheduled cleanup using the expires_at column.`
      : "";
    return `${ttl}\nCREATE ${unique}INDEX IF NOT EXISTS ${quote(name)} ON ${quote(model.collection.collectionName)} (${columns.join(", ")});`;
  });
}

function createForeignKeySql(model, allModels) {
  const modelByName = new Map(allModels.map((item) => [item.modelName, item]));
  return Object.entries(model.schema.paths).flatMap(([fieldPath, field]) => {
    const refName = field.options?.ref;
    const referencedModel = refName && modelByName.get(refName);
    if (!referencedModel) return [];

    const column = columnName(fieldPath);
    const constraint = stableIndexName(`fk_${model.collection.collectionName}`, [[fieldPath, 1]]);
    // SET NULL is invalid for required reference columns; preserve those rows
    // by restricting parent deletion unless a short-lived relation is known to
    // be disposable. Optional history references may be nulled safely.
    const preserveOnDelete = model.modelName === "AdminActivityLog" && fieldPath === "adminId";
    let onDelete = preserveOnDelete ? "SET NULL" : field.isRequired ? "RESTRICT" : "SET NULL";
    if (["EmailOtp.user", "Session.user", "TrustedDevice.user", "VideoAnalytics.videoId"].includes(`${model.modelName}.${fieldPath}`)) {
      onDelete = "CASCADE";
    }
    const statement = `ALTER TABLE ${quote(model.collection.collectionName)} ADD CONSTRAINT ${quote(constraint)} FOREIGN KEY (${quote(column)}) REFERENCES ${quote(referencedModel.collection.collectionName)} (${quote("_id")}) ON DELETE ${onDelete};`;
    return [`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraint}') THEN ${statement} END IF; END $$;`];
  });
}

const models = await loadModels();
const schemaInventory = models.map((model) => ({
  model: model.modelName,
  collection: model.collection.collectionName,
  timestamps: Boolean(model.schema.options.timestamps),
  fields: Object.entries(model.schema.paths)
    .filter(([name]) => !["_id", "__v"].includes(name))
    .filter(([name]) => !model.schema.options.timestamps || !["createdAt", "updatedAt"].includes(name))
    .map(([name, field]) => ({
      path: name,
      sqlColumn: columnName(name),
      mongooseType: field.instance,
      postgresType: sqlType(field),
      required: Boolean(field.isRequired),
      ref: field.options?.ref || null,
      arrayElementType: field.caster?.instance || null,
      hasDefault: field.options?.default !== undefined
    })),
  indexes: model.schema.indexes().map(([keys, options]) => ({
    keys,
    unique: Boolean(options.unique),
    sparse: Boolean(options.sparse),
    expireAfterSeconds: options.expireAfterSeconds ?? null,
    name: options.name || null
  }))
}));
const lines = [
  "-- Generated from server/src/models/*.model.js by server/scripts/generate-postgres-schema.mjs.",
  "-- Review against the live MongoDB catalog before applying. This migration is never auto-applied by the app.",
  "-- MongoDB ObjectIds are preserved as TEXT in _id and reference columns.",
  "-- Nested paths are flattened with a double underscore (e.g. two_factor__enabled).",
  "-- Arrays and flexible values use JSONB. GridFS file bytes are not copied into PostgreSQL.",
  "-- Timestamp columns are nullable to preserve legacy Mongo documents without timestamps.",
  "-- Foreign keys use RESTRICT for required references, SET NULL for optional history references, and CASCADE for disposable sessions/OTP/devices/video analytics.",
  "-- The migration runner must validate live references before inserting the data copy.",
  "",
  "BEGIN;",
  "CREATE TABLE IF NOT EXISTS schema_migrations (",
  "  version TEXT PRIMARY KEY,",
  "  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ");",
  "CREATE TABLE IF NOT EXISTS migration_runs (",
  "  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
  "  source_collection TEXT NOT NULL,",
  "  last_source_id TEXT,",
  "  migrated_count BIGINT NOT NULL DEFAULT 0,",
  "  status TEXT NOT NULL DEFAULT 'pending',",
  "  error_summary TEXT,",
  "  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),",
  "  UNIQUE (source_collection)",
  ");",
  "CREATE TABLE IF NOT EXISTS mongo_migration_extras (",
  "  source_collection TEXT NOT NULL,",
  "  source_id TEXT NOT NULL,",
  "  document JSONB NOT NULL,",
  "  PRIMARY KEY (source_collection, source_id)",
  ");",
  "CREATE TABLE IF NOT EXISTS mongo_migration_mixed_bson (",
  "  source_collection TEXT NOT NULL,",
  "  source_id TEXT NOT NULL,",
  "  document JSONB NOT NULL,",
  "  PRIMARY KEY (source_collection, source_id)",
  ");",
  "CREATE TABLE IF NOT EXISTS media_upload_sessions (",
  "  upload_id TEXT PRIMARY KEY,",
  "  user_id TEXT NOT NULL,",
  "  folder TEXT NOT NULL,",
  "  mime_type TEXT NOT NULL,",
  "  total_size BIGINT NOT NULL CHECK (total_size > 0),",
  "  part_count INTEGER NOT NULL CHECK (part_count > 0),",
  "  expires_at TIMESTAMPTZ NOT NULL,",
  "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ");",
  "CREATE INDEX IF NOT EXISTS idx_media_upload_sessions_expires_at ON media_upload_sessions (expires_at);",
  "CREATE TABLE IF NOT EXISTS media_upload_parts (",
  "  upload_id TEXT NOT NULL REFERENCES media_upload_sessions(upload_id) ON DELETE CASCADE,",
  "  part_index INTEGER NOT NULL CHECK (part_index >= 0),",
  "  data BYTEA NOT NULL,",
  "  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),",
  "  PRIMARY KEY (upload_id, part_index)",
  ");",
  ""
];

for (const model of models) lines.push(createTableSql(model), "");
for (const model of models) lines.push(...createIndexSql(model), "");
for (const model of models) lines.push(...createForeignKeySql(model, models), "");

lines.push("COMMIT;", "");
await fs.mkdir(migrationsDir, { recursive: true });
await fs.writeFile(outputFile, lines.join("\n"), "utf8");
await fs.writeFile(inventoryFile, `${JSON.stringify(schemaInventory, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outputFile)} for ${models.length} MongoDB models.`);

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import mongoose from "mongoose";
import Service from "../src/models/Service.model.js";
import User from "../src/models/User.model.js";
import Media from "../src/models/Media.model.js";
import SiteSetting from "../src/models/SiteSetting.model.js";
import {
  dependencyOrder,
  reconciliationPruneOrder,
  findDuplicateUniqueValues,
  findOrphanedReferences,
  findRequiredFieldViolations,
  mapDocument,
  pgValue,
  pruneMissingTargetRowsSql,
  assertSourceWriteFreeze,
  assertPostgresWriteFreeze,
  assertMigrationWriteAuthorization,
  validateMigrationTarget,
  toJsonValue,
  upsertSql,
  loadModels
} from "./migrate-mongo-to-postgres.mjs";

test("mapDocument preserves Mongo IDs, arrays, timestamps, and unmapped fields", () => {
  const id = new mongoose.Types.ObjectId();
  const createdAt = new Date("2026-01-02T03:04:05.000Z");
  const { columns, unknownFields } = mapDocument(Service, {
    _id: id,
    __v: 4,
    title: "Color Grading",
    slug: "color-grading",
    description: "Cinematic color work",
    features: ["ACES", "HDR"],
    createdAt,
    updatedAt: createdAt,
    legacyCampaignCode: "retained-for-review"
  });
  const row = Object.fromEntries(columns);

  assert.equal(row._id, id.toHexString());
  assert.equal(row.__v, 4);
  assert.equal(row.title, "Color Grading");
  assert.equal(row.category, "Post-Production");
  assert.equal(row.features, '["ACES","HDR"]');
  assert.equal(row.created_at, createdAt);
  assert.deepEqual(unknownFields, { legacyCampaignCode: "retained-for-review" });
});

test("unknown BSON fields are stored as reversible Extended JSON for Atlas rollback", () => {
  const id = new mongoose.Types.ObjectId();
  const legacyId = new mongoose.Types.ObjectId();
  const legacyDate = new Date("2026-04-05T06:07:08.000Z");
  const { unknownFields } = mapDocument(Service, {
    _id: id,
    legacyId,
    legacyDate,
    legacyBytes: Buffer.from([0, 1, 255])
  });

  assert.deepEqual(unknownFields, {
    legacyId: { $oid: legacyId.toHexString() },
    legacyDate: { $date: legacyDate.toISOString() },
    legacyBytes: { $binary: { base64: "AAH/", subType: "00" } }
  });
});

test("unknown fields nested under modeled objects are preserved for Atlas rollback", () => {
  const id = new mongoose.Types.ObjectId();
  const legacyValue = new mongoose.Types.ObjectId();
  const mapped = mapDocument(User, {
    _id: id,
    name: "Legacy admin",
    email: "legacy@example.test",
    passwordHash: "hash",
    twoFactor: {
      enabled: true,
      recoveryCodeHashes: ["hash-1"],
      legacyProvider: "authenticator-v1",
      legacyCredentialId: legacyValue
    }
  });

  assert.deepEqual(mapped.unknownFields, {
    "twoFactor.legacyProvider": "authenticator-v1",
    "twoFactor.legacyCredentialId": { $oid: legacyValue.toHexString() }
  });
});

test("Mixed BSON fields retain a typed rollback sidecar alongside their PostgreSQL JSON value", () => {
  const id = new mongoose.Types.ObjectId();
  const referencedId = new mongoose.Types.ObjectId();
  const capturedAt = new Date("2026-05-06T07:08:09.000Z");
  const mapped = mapDocument(SiteSetting, {
    _id: id,
    key: "migration-test",
    group: "general",
    value: { nested: { referencedId, capturedAt } }
  });
  const row = Object.fromEntries(mapped.columns);

  assert.deepEqual(JSON.parse(row.value), { nested: { referencedId: referencedId.toHexString(), capturedAt: capturedAt.toISOString() } });
  assert.deepEqual(mapped.mixedBsonValues.value, {
    nested: {
      referencedId: { $oid: referencedId.toHexString() },
      capturedAt: { $date: { $numberLong: String(capturedAt.getTime()) } }
    }
  });
});

test("upsertSql is parameterized and updates fields without replacing the primary key", () => {
  const statement = upsertSql("services", [["_id", "mongo-id"], ["title", "Name"]]);
  assert.equal(statement.text, 'INSERT INTO "services" ("_id", "title") VALUES ($1, $2) ON CONFLICT ("_id") DO UPDATE SET "title" = EXCLUDED."title"');
  assert.deepEqual(statement.values, ["mongo-id", "Name"]);
});

test("staging reconciliation prunes only rows absent from the staged source ID set", () => {
  const query = pruneMissingTargetRowsSql("sample\"collection");
  assert.match(query.text, /DELETE FROM "sample""collection" AS target/);
  assert.match(query.text, /NOT EXISTS \(SELECT 1 FROM migration_source_ids AS source WHERE source\.source_collection = \$1 AND source\.id = target\."_id"\)/);
  assert.deepEqual(query.values, ["sample\"collection"]);
});

test("final PostgreSQL sync requires an explicit Preview source-write-freeze confirmation", () => {
  assert.throws(() => assertSourceWriteFreeze(undefined), /confirmed MongoDB application write freeze/);
  assert.throws(() => assertSourceWriteFreeze("production"), /confirmed MongoDB application write freeze/);
  assert.doesNotThrow(() => assertSourceWriteFreeze("preview-staging"));
});

test("PostgreSQL import requires both Mongo source and Preview app write freezes only for apply", () => {
  assert.doesNotThrow(() => assertMigrationWriteAuthorization({ apply: false }));
  assert.throws(() => assertPostgresWriteFreeze(undefined), /application to be write-frozen/);
  assert.throws(() => assertMigrationWriteAuthorization({
    apply: true,
    sourceConfirmation: "preview-staging"
  }), /application-level read-only deployment/);
  assert.throws(() => assertMigrationWriteAuthorization({
    apply: true,
    deployedFreezeConfirmation: "preview-staging",
    sourceConfirmation: "preview-staging"
  }), /application to be write-frozen/);
  assert.doesNotThrow(() => assertMigrationWriteAuthorization({
    apply: true,
    deployedFreezeConfirmation: "preview-staging",
    sourceConfirmation: "preview-staging",
    postgresConfirmation: "preview-staging"
  }));
});

test("Production import target is separate from Preview and requires a remote Atlas URI", () => {
  const production = {
    vercelEnv: "production",
    target: "production",
    databaseUrl: "postgresql://production.example/db",
    previewDatabaseUrl: "postgresql://preview.example/db",
    mongoUri: "mongodb+srv://source.example/db"
  };
  assert.equal(validateMigrationTarget(production), "production");
  assert.throws(() => validateMigrationTarget({ ...production, databaseUrl: production.previewDatabaseUrl }), /distinct from PREVIEW_DATABASE_URL/);
  assert.throws(() => validateMigrationTarget({ ...production, mongoUri: "mongodb://localhost/db" }), /remote MongoDB source/);
  assert.throws(() => validateMigrationTarget({ ...production, vercelEnv: "preview" }), /VERCEL_ENV=production/);
});

test("Production import apply requires both freezes and a verified current Atlas backup", () => {
  const authorization = {
    apply: true,
    target: "production",
    deployedFreezeConfirmation: "production",
    sourceConfirmation: "production",
    postgresConfirmation: "production"
  };
  assert.throws(() => assertMigrationWriteAuthorization(authorization), /verified, current MongoDB Atlas backup/);
  assert.throws(() => assertMigrationWriteAuthorization({ ...authorization, sourceConfirmation: "preview-staging", mongoBackupConfirmation: "production" }), /MongoDB application write freeze/);
  assert.doesNotThrow(() => assertMigrationWriteAuthorization({ ...authorization, mongoBackupConfirmation: "production" }));
});

test("dependencyOrder places referenced records before dependents", () => {
  const ordered = dependencyOrder([Media, User]);
  assert.ok(ordered.indexOf(User) < ordered.indexOf(Media));
});

test("stale rows are pruned in reverse dependency order to satisfy restrictive foreign keys", () => {
  const ordered = reconciliationPruneOrder([Media, User]);
  assert.ok(ordered.indexOf(Media) < ordered.indexOf(User));
});

test("all application models have a valid dependency order for import", async () => {
  const models = await loadModels();
  const ordered = dependencyOrder(models);
  assert.equal(ordered.length, models.length);
  const position = new Map(ordered.map((model, index) => [model.modelName, index]));
  for (const model of models) {
    for (const field of Object.values(model.schema.paths)) {
      if (!field.options?.ref) continue;
      const referenced = models.find((candidate) => candidate.modelName === field.options.ref);
      if (referenced) assert.ok(position.get(referenced.modelName) < position.get(model.modelName), `${referenced.modelName} must precede ${model.modelName}`);
    }
  }
});

test("required model defaults satisfy their Mongoose validators", async () => {
  const models = await loadModels();
  const invalidDefaults = [];
  for (const model of models) {
    for (const [fieldPath, field] of Object.entries(model.schema.paths)) {
      if (!field.isRequired || field.options?.default === undefined) continue;
      const document = new model({ [fieldPath]: field.getDefault() });
      const error = document.validateSync();
      if (error?.errors?.[fieldPath]) invalidDefaults.push(`${model.modelName}.${fieldPath}`);
    }
  }
  assert.deepEqual(invalidDefaults, []);
});

test("PostgreSQL schema declares a table for every imported Mongoose model", async () => {
  const models = await loadModels();
  const schema = await fs.readFile(new URL("../migrations/0001_initial_postgres_schema.sql", import.meta.url), "utf8");
  const missing = models
    .map((model) => model.collection.collectionName)
    .filter((collection) => !schema.includes(`CREATE TABLE IF NOT EXISTS "${collection}"`));

  assert.deepEqual(missing, []);
});

test("PostgreSQL generated IDs remain valid Mongoose ObjectIds for rollback", async () => {
  const models = await loadModels();
  const schema = await fs.readFile(new URL("../migrations/0001_initial_postgres_schema.sql", import.meta.url), "utf8");
  for (const model of models) {
    const table = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS "${model.collection.collectionName}" \\(([\\s\\S]*?)\\n\\);`));
    assert.ok(table, `Missing SQL table for ${model.modelName}`);
    assert.match(table[1], /"_id" TEXT PRIMARY KEY DEFAULT substr\(replace\(gen_random_uuid\(\)::text, '-', ''\), 1, 24\)/);
  }
});

test("PostgreSQL schema includes resumable media upload session and chunk tables", async () => {
  const schema = await fs.readFile(new URL("../migrations/0001_initial_postgres_schema.sql", import.meta.url), "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS media_upload_sessions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS media_upload_parts/);
  assert.match(schema, /REFERENCES media_upload_sessions\(upload_id\) ON DELETE CASCADE/);
  assert.match(schema, /PRIMARY KEY \(upload_id, part_index\)/);
});

test("PostgreSQL schema preserves every modeled field and index column", async () => {
  const models = await loadModels();
  const schema = await fs.readFile(new URL("../migrations/0001_initial_postgres_schema.sql", import.meta.url), "utf8");
  const tables = new Map([...schema.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)" \(([\s\S]*?)\n\);/g)]
    .map(([, name, body]) => [name, new Set([...body.matchAll(/^\s*"([^"]+)"\s+/gm)].map(([, column]) => column))]));
  const indexes = [...schema.matchAll(/CREATE (UNIQUE )?INDEX IF NOT EXISTS "([^"]+)" ON "([^"]+)" \(([^;]+)\);/g)]
    .map(([, unique, name, table, columns]) => ({ unique: Boolean(unique), name, table, columns }));
  const columnName = (path) => path.split(".").map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()).join("__");
  const missingFields = [];
  const missingIndexes = [];

  for (const model of models) {
    const tableName = model.collection.collectionName;
    const tableColumns = tables.get(tableName);
    assert.ok(tableColumns, `Missing SQL table for ${model.modelName}`);
    for (const [field] of Object.entries(model.schema.paths)) {
      if (["_id", "__v"].includes(field) || model.schema.options.timestamps && ["createdAt", "updatedAt"].includes(field)) continue;
      const column = columnName(field);
      if (!tableColumns.has(column)) missingFields.push(`${tableName}.${column}`);
    }

    for (const [keys, options] of model.schema.indexes()) {
      const expectedColumns = Object.entries(keys)
        .map(([field, direction]) => `"${columnName(field)}" ${direction < 0 ? "DESC" : "ASC"}`)
        .join(", ");
      const found = indexes.some((index) => index.table === tableName && index.unique === Boolean(options.unique) && index.columns === expectedColumns);
      if (!found) missingIndexes.push(`${tableName}(${expectedColumns})${options.unique ? " UNIQUE" : ""}`);
    }
  }

  assert.deepEqual(missingFields, []);
  assert.deepEqual(missingIndexes, []);
});

test("PostgreSQL schema preserves every declared reference and delete policy", async () => {
  const models = await loadModels();
  const schema = await fs.readFile(new URL("../migrations/0001_initial_postgres_schema.sql", import.meta.url), "utf8");
  const byName = new Map(models.map((model) => [model.modelName, model]));
  const columnName = (path) => path.split(".").map((part) => part.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()).join("__");
  const missingReferences = [];
  const cascadeReferences = new Set(["EmailOtp.user", "Session.user", "TrustedDevice.user", "VideoAnalytics.videoId"]);

  for (const model of models) {
    for (const [fieldPath, field] of Object.entries(model.schema.paths)) {
      if (!field.options?.ref) continue;
      const referencedModel = byName.get(field.options.ref);
      if (!referencedModel) {
        missingReferences.push(`${model.modelName}.${fieldPath}: unknown model ${field.options.ref}`);
        continue;
      }
      const onDelete = cascadeReferences.has(`${model.modelName}.${fieldPath}`)
        ? "CASCADE"
        : field.isRequired && !(model.modelName === "AdminActivityLog" && fieldPath === "adminId")
          ? "RESTRICT"
          : "SET NULL";
      const constraint = `FOREIGN KEY ("${columnName(fieldPath)}") REFERENCES "${referencedModel.collection.collectionName}" ("_id") ON DELETE ${onDelete}`;
      if (!schema.includes(constraint)) missingReferences.push(`${model.modelName}.${fieldPath}: ${constraint}`);
    }
  }

  assert.deepEqual(missingReferences, []);
});

test("reference preflight reports orphan counts before importing", async () => {
  const userModel = { modelName: "User", collection: { collectionName: "users" }, schema: { paths: {} } };
  const photoModel = {
    modelName: "Photo",
    collection: { collectionName: "photos" },
    schema: { paths: { createdBy: { options: { ref: "User" } } } }
  };
  let pipeline;
  const mongoDb = {
    collection(name) {
      assert.equal(name, "photos");
      return {
        aggregate(value) {
          pipeline = value;
          return { toArray: async () => [{ count: 2 }] };
        }
      };
    }
  };

  const results = await findOrphanedReferences(mongoDb, [userModel, photoModel]);

  assert.deepEqual(results, [{ collection: "photos", field: "createdBy", referencedCollection: "users", count: 2 }]);
  assert.equal(pipeline[1].$lookup.from, "users");
  assert.equal(pipeline[1].$lookup.localField, "createdBy");
});

test("required-field preflight reports missing values before schema creation", async () => {
  const requiredModel = {
    modelName: "Example",
    collection: { collectionName: "examples" },
    schema: { paths: { title: { instance: "String", isRequired: true, options: {} }, key: { instance: "String", isRequired: true, options: { default: "default" } } } }
  };
  let query;
  const mongoDb = {
    collection(name) {
      assert.equal(name, "examples");
      return { countDocuments: async (filter) => { query = filter; return 3; } };
    }
  };
  const violations = await findRequiredFieldViolations(mongoDb, [requiredModel]);

  assert.deepEqual(query, { $or: [{ title: { $exists: false } }, { title: null }, { title: "" }] });
  assert.deepEqual(violations, [{ collection: "examples", field: "title", count: 3 }]);
});

test("unique-index preflight identifies duplicate source values", async () => {
  const uniqueModel = {
    modelName: "Example",
    collection: { collectionName: "examples" },
    schema: { indexes: () => [[{ slug: 1 }, { unique: true, name: "slug_unique" }]] }
  };
  let pipeline;
  const mongoDb = {
    collection(name) {
      assert.equal(name, "examples");
      return { aggregate: (value) => { pipeline = value; return { toArray: async () => [{ count: 2 }] }; } };
    }
  };
  const duplicates = await findDuplicateUniqueValues(mongoDb, [uniqueModel]);

  assert.deepEqual(pipeline.at(-3), { $group: { _id: { slug: "$slug" }, count: { $sum: 1 } } });
  assert.deepEqual(duplicates, [{ collection: "examples", fields: ["slug"], index: "slug_unique", count: 2 }]);
});

test("migration runner rejects a Preview target when invoked in Production", () => {
  const result = spawnSync(process.execPath, ["scripts/migrate-mongo-to-postgres.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "production",
      MIGRATION_TARGET: "preview-staging",
      MONGODB_URI: "mongodb://127.0.0.1:27017/source",
      DATABASE_URL: "postgresql://app:unused@primary-db.example/production",
      PREVIEW_DATABASE_URL: "postgresql://app:unused@staging-db.example/staging"
    }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Preview migration requires VERCEL_ENV=preview/);
});

test("BSON values that exceed JavaScript precision retain lossless representations", () => {
  const { Long, Binary, Decimal128 } = mongoose.mongo.BSON;

  assert.deepEqual(toJsonValue(Long.fromString("9007199254740993")), { $numberLong: "9007199254740993" });
  assert.deepEqual(toJsonValue(Decimal128.fromString("1234567890.123456789")), { $numberDecimal: "1234567890.123456789" });
  assert.deepEqual(toJsonValue(new Binary(Buffer.from([0, 1, 255]), 0x80)), {
    $binary: { base64: "AAH/", subType: "80" }
  });
});

test("unsafe BSON integers fail rather than lose precision in numeric columns", () => {
  const { Long } = mongoose.mongo.BSON;
  assert.throws(
    () => pgValue(Service.schema.path("order"), Long.fromString("9007199254740993")),
    /cannot be represented.*without data loss/
  );
  assert.equal(pgValue(Service.schema.path("order"), Long.fromString("9007199254740991")), Number.MAX_SAFE_INTEGER);
});

import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Service from "../src/models/Service.model.js";
import SiteSetting from "../src/models/SiteSetting.model.js";
import User from "../src/models/User.model.js";
import { mapPostgresRowToMongoDocument, validateRollbackTarget } from "./rollback-postgres-to-mongo.mjs";

const productionConfig = {
  VERCEL_ENV: "production",
  DATABASE_BACKEND: "postgres",
  DATABASE_URL: "postgresql://primary.example/database",
  MONGODB_URI: "mongodb+srv://atlas.example/database"
};

test("rollback rows restore mapped fields, nested types, timestamps, and Extended JSON extras", () => {
  const id = new mongoose.Types.ObjectId();
  const extraId = new mongoose.Types.ObjectId();
  const createdAt = new Date("2026-01-02T03:04:05.000Z");
  const row = {
    _id: id.toHexString(),
    __v: 3,
    title: "Color Grading",
    slug: "color-grading",
    description: "Film color work",
    category: "Post-Production",
    features: ["ACES", "HDR"],
    order: 4,
    is_published: true,
    created_at: createdAt,
    updated_at: createdAt
  };
  const extras = {
    legacyObjectId: { $oid: extraId.toHexString() },
    legacyDate: { $date: createdAt.toISOString() },
    legacyBinary: { $binary: { base64: "AAH/", subType: "00" } }
  };

  const restored = mapPostgresRowToMongoDocument(Service, row, extras);

  assert.ok(restored._id instanceof mongoose.Types.ObjectId);
  assert.equal(restored._id.toHexString(), id.toHexString());
  assert.equal(restored.__v, 3);
  assert.deepEqual(restored.features, ["ACES", "HDR"]);
  assert.equal(restored.createdAt.toISOString(), createdAt.toISOString());
  assert.ok(restored.legacyObjectId instanceof mongoose.Types.ObjectId);
  assert.equal(restored.legacyObjectId.toHexString(), extraId.toHexString());
  assert.equal(restored.legacyDate.toISOString(), createdAt.toISOString());
  assert.equal(restored.legacyBinary._bsontype, "Binary");
});

test("rollback reapplies unknown nested fields inside modeled objects", () => {
  const id = new mongoose.Types.ObjectId();
  const legacyCredentialId = new mongoose.Types.ObjectId();
  const restored = mapPostgresRowToMongoDocument(User, {
    _id: id.toHexString(),
    name: "Legacy admin",
    email: "legacy@example.test",
    password_hash: "hash",
    two_factor__enabled: true
  }, {
    "twoFactor.legacyProvider": "authenticator-v1",
    "twoFactor.legacyCredentialId": { $oid: legacyCredentialId.toHexString() }
  });

  assert.equal(restored.twoFactor.enabled, true);
  assert.equal(restored.twoFactor.legacyProvider, "authenticator-v1");
  assert.ok(restored.twoFactor.legacyCredentialId instanceof mongoose.Types.ObjectId);
  assert.equal(restored.twoFactor.legacyCredentialId.toHexString(), legacyCredentialId.toHexString());
});

test("rollback restores unchanged BSON values inside Mixed fields without reverting PostgreSQL edits", () => {
  const id = new mongoose.Types.ObjectId();
  const referencedId = new mongoose.Types.ObjectId();
  const capturedAt = new Date("2026-05-06T07:08:09.000Z");
  const row = {
    _id: id.toHexString(),
    key: "migration-test",
    group: "general",
    value: { nested: { referencedId: referencedId.toHexString(), capturedAt: capturedAt.toISOString() } }
  };
  const mixedValues = {
    value: {
      nested: {
        referencedId: { $oid: referencedId.toHexString() },
        capturedAt: { $date: { $numberLong: String(capturedAt.getTime()) } }
      }
    }
  };

  const unchanged = mapPostgresRowToMongoDocument(SiteSetting, row, {}, mixedValues);
  assert.ok(unchanged.value.nested.referencedId instanceof mongoose.Types.ObjectId);
  assert.equal(unchanged.value.nested.referencedId.toHexString(), referencedId.toHexString());
  assert.equal(unchanged.value.nested.capturedAt.toISOString(), capturedAt.toISOString());

  const editedRow = { ...row, value: { nested: { changed: true } } };
  const edited = mapPostgresRowToMongoDocument(SiteSetting, editedRow, {}, mixedValues);
  assert.deepEqual(edited.value, editedRow.value);
});

test("rollback dry run requires the exact Production source and remote Atlas destination", () => {
  assert.equal(validateRollbackTarget({ config: productionConfig, target: "production-rollback", apply: false }), true);
  assert.throws(() => validateRollbackTarget({ config: productionConfig, target: "preview-staging", apply: false }), /production-rollback/);
  assert.throws(() => validateRollbackTarget({ config: { ...productionConfig, VERCEL_ENV: "preview" }, target: "production-rollback", apply: false }), /VERCEL_ENV=production/);
  assert.throws(() => validateRollbackTarget({ config: { ...productionConfig, MONGODB_URI: "mongodb://127.0.0.1/test" }, target: "production-rollback", apply: false }), /remote Production\/Mongo URLs/);
  assert.equal(validateRollbackTarget({
    config: { ...productionConfig, MONGODB_URI: "mongodb+srv://user:localhost@atlas.example/database" },
    target: "production-rollback",
    apply: false
  }), true);
});

test("rollback apply requires both write freezes and a verified Atlas backup", () => {
  const base = { config: productionConfig, target: "production-rollback", apply: true };
  assert.throws(() => validateRollbackTarget(base), /deployed application-level read-only mode/);
  assert.throws(() => validateRollbackTarget({ ...base, deployedFreeze: "production" }), /Production PostgreSQL app write freeze/);
  assert.throws(() => validateRollbackTarget({ ...base, deployedFreeze: "production", postgresFreeze: "production" }), /MongoDB destination write freeze/);
  assert.throws(() => validateRollbackTarget({ ...base, deployedFreeze: "production", postgresFreeze: "production", mongoFreeze: "production" }), /verified Atlas backup/);
  assert.equal(validateRollbackTarget({
    ...base,
    deployedFreeze: "production",
    postgresFreeze: "production",
    mongoFreeze: "production",
    mongoBackup: "production"
  }), true);
});

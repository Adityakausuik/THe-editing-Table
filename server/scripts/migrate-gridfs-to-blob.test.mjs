import test from "node:test";
import assert from "node:assert/strict";
import { collectUploadUrlAliases, findUnmigratedUploadReferences, listPostgresUploadContentReferences, objectPath, replaceMappedStrings, validateMigrationTarget } from "./migrate-gridfs-to-blob.mjs";

test("GridFS URL rewrites preserve nested JSON shape and replace media aliases", () => {
  const source = {
    image: { url: "/uploads/services/cover.webp" },
    gallery: ["https://old.example/api/uploads/services/cover.webp", "leave-this-alone"],
    caption: "This filename is unrelated: cover.webp"
  };
  const result = replaceMappedStrings(source, [
    ["https://old.example/api/uploads/services/cover.webp", "https://store.public.blob.vercel-storage.com/new.webp"],
    ["/uploads/services/cover.webp", "https://store.public.blob.vercel-storage.com/new.webp"]
  ]);
  assert.deepEqual(result, {
    image: { url: "https://store.public.blob.vercel-storage.com/new.webp" },
    gallery: ["https://store.public.blob.vercel-storage.com/new.webp", "leave-this-alone"],
    caption: "This filename is unrelated: cover.webp"
  });
});

test("GridFS URL rewrites leave non-string values unchanged", () => {
  const date = new Date("2026-01-01T00:00:00Z");
  const value = { count: 4, active: true, date };
  const result = replaceMappedStrings(value, [["/uploads/a.jpg", "https://store/a.jpg"]]);
  assert.equal(result.count, 4);
  assert.equal(result.active, true);
  assert.equal(result.date, date);
});

test("GridFS asset destinations separate private resumes and use stable source IDs", () => {
  assert.deepEqual(objectPath({ _id: "abc123", filename: "resumes/Resume.PDF" }), {
    access: "private",
    pathname: "migration/private/abc123.pdf"
  });
  assert.deepEqual(objectPath({ _id: "def456", filename: "services.with.dots/cover.webp" }), {
    access: "public",
    pathname: "migration/public/def456.webp"
  });
});

test("GridFS preflight checks uploads nested in all content payloads", () => {
  const missing = findUnmigratedUploadReferences({
    mediaRows: [],
    applicationRows: [],
    contentReferences: [
      { table: "services", column: "gallery", id: "a", label: "services.gallery:a", value: { images: ["/uploads/services/known.webp"] } },
      { table: "blogs", column: "content", id: "b", label: "blogs.content:b", value: "See /uploads/blogs/missing.jpg for details." },
      { table: "services", column: "description", id: "c", label: "services.description:c", value: "https://external.example/uploads/not-managed.jpg" },
      { table: "photos", column: "cover", id: "d", label: "photos.cover:d", value: "https://example.public.blob.vercel-storage.com/existing.webp" }
    ],
    gridFsPaths: new Set(["services/known.webp"])
  });

  assert.deepEqual(missing, ["blogs.content:b:blogs/missing.jpg"]);
});

test("GridFS URL discovery keeps owned deployment aliases and ignores unrelated external uploads", () => {
  assert.deepEqual(collectUploadUrlAliases({
    gallery: [
      "https://t-he-editing-table-client-q01njwgjq-aditya-e619.vercel.app/uploads/services/cover.webp",
      "http://localhost:5000/uploads/services/local.webp",
      "https://external.example/uploads/third-party.webp",
      "/api/uploads/services/cover.webp"
    ]
  }), [
    "https://t-he-editing-table-client-q01njwgjq-aditya-e619.vercel.app/uploads/services/cover.webp",
    "http://localhost:5000/uploads/services/local.webp",
    "/api/uploads/services/cover.webp"
  ]);
});

test("GridFS reference scan pages text and JSON columns, including user avatar fields", async () => {
  const calls = [];
  const pool = {
    async query(text, values = []) {
      calls.push({ text, values });
      if (text.includes("information_schema.columns")) {
        return { rows: [
          { table_name: "users", column_name: "avatar" },
          { table_name: "sitesettings", column_name: "value" }
        ] };
      }
      if (text.includes('FROM "users"')) {
        return text.includes('AND "_id" > $1') ? { rows: [] } : { rows: [{ id: "user-1", value: "/uploads/avatars/editor.webp" }] };
      }
      if (text.includes('FROM "sitesettings"')) {
        return text.includes('AND "_id" > $1') ? { rows: [] } : { rows: [{ id: "setting-1", value: { hero: "/uploads/hero/cover.webp" } }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    }
  };

  const references = await listPostgresUploadContentReferences(pool);
  assert.deepEqual(references.map(({ table, column, id }) => [table, column, id]), [
    ["users", "avatar", "user-1"],
    ["sitesettings", "value", "setting-1"]
  ]);
  assert.ok(calls.some(({ text }) => text.includes('AND "_id" > $1') && text.includes('LIMIT $2')));
  assert.ok(calls[0].values[0].includes("users"));
});

test("asset backfill gate requires the exact Preview target, explicit source, tokens, and apply confirmation", () => {
  const safe = {
    sourceUrl: "mongodb+srv://source.example/db",
    targetUrl: "postgresql://preview.example/db",
    previewDatabaseUrl: "postgresql://preview.example/db",
    vercelEnv: "preview",
    migrationTarget: "preview-staging",
    publicToken: "public-test-token",
    privateToken: "private-test-token",
    apply: true,
    confirmation: "preview-staging",
    sourceWriteFreeze: "preview-staging",
    postgresWriteFreeze: "preview-staging",
    deployedFreezeConfirmation: "preview-staging"
  };
  assert.doesNotThrow(() => validateMigrationTarget(safe));
  assert.throws(() => validateMigrationTarget({ ...safe, sourceUrl: "" }), /remote MONGODB_URI/);
  assert.throws(() => validateMigrationTarget({ ...safe, vercelEnv: "production" }), /preview-staging/);
  assert.throws(() => validateMigrationTarget({ ...safe, targetUrl: "postgresql://production.example/db" }), /preview-staging/);
  assert.throws(() => validateMigrationTarget({ ...safe, privateToken: "" }), /public and private/);
  assert.throws(() => validateMigrationTarget({ ...safe, deployedFreezeConfirmation: "" }), /application-level read-only deployment/);
  assert.throws(() => validateMigrationTarget({ ...safe, confirmation: "" }), /CONFIRM_GRIDFS_BLOB_MIGRATION/);
  assert.throws(() => validateMigrationTarget({ ...safe, sourceWriteFreeze: "" }), /MongoDB application write freeze/);
  assert.throws(() => validateMigrationTarget({ ...safe, postgresWriteFreeze: "" }), /PostgreSQL application write freeze/);
});

test("Production asset backfill requires Production target, distinct URLs, and rollback backup confirmation", () => {
  const production = {
    sourceUrl: "mongodb+srv://source.example/db",
    targetUrl: "postgresql://production.example/db",
    previewDatabaseUrl: "postgresql://preview.example/db",
    vercelEnv: "production",
    migrationTarget: "production",
    publicToken: "public-test-token",
    privateToken: "private-test-token",
    apply: true,
    confirmation: "production",
    sourceWriteFreeze: "production",
    postgresWriteFreeze: "production",
    deployedFreezeConfirmation: "production",
    mongoBackupConfirmation: "production"
  };
  assert.doesNotThrow(() => validateMigrationTarget(production));
  assert.throws(() => validateMigrationTarget({ ...production, targetUrl: production.previewDatabaseUrl }), /distinct from PREVIEW_DATABASE_URL/);
  assert.throws(() => validateMigrationTarget({ ...production, sourceUrl: "mongodb://localhost/db" }), /remote MONGODB_URI/);
  assert.throws(() => validateMigrationTarget({ ...production, mongoBackupConfirmation: "" }), /verified, current MongoDB Atlas backup/);
  assert.throws(() => validateMigrationTarget({ ...production, sourceWriteFreeze: "preview-staging" }), /MongoDB application write freeze/);
});

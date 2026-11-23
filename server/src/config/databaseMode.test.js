import test from "node:test";
import assert from "node:assert/strict";
import { isPostgresAuthEnabled, isPostgresSelected } from "./databaseMode.js";

const production = {
  VERCEL_ENV: "production",
  DATABASE_BACKEND: "mongodb",
  DATABASE_URL: "postgresql://primary.example/db",
  PREVIEW_DATABASE_URL: undefined,
  POSTGRES_AUTH_ENABLED: true,
  PREVIEW_POSTGRES_AUTH_ENABLED: false
};

test("Production remains Mongo-backed until the explicit backend flag is enabled", () => {
  assert.equal(isPostgresSelected(production), false);
  assert.equal(isPostgresAuthEnabled(production), false);
  assert.equal(isPostgresSelected({ ...production, DATABASE_BACKEND: "postgres" }), true);
  assert.equal(isPostgresAuthEnabled({ ...production, DATABASE_BACKEND: "postgres" }), true);
});

test("Preview can only select its dedicated PostgreSQL URL and has a separate auth gate", () => {
  const preview = {
    ...production,
    VERCEL_ENV: "preview",
    DATABASE_BACKEND: "postgres",
    DATABASE_URL: "postgresql://staging.example/db",
    PREVIEW_DATABASE_URL: "postgresql://staging.example/db",
    PREVIEW_POSTGRES_AUTH_ENABLED: false
  };
  assert.equal(isPostgresSelected(preview), true);
  assert.equal(isPostgresAuthEnabled(preview), false);
  assert.equal(isPostgresSelected({ ...preview, DATABASE_URL: undefined, PREVIEW_DATABASE_URL: undefined }), true);
  assert.equal(isPostgresAuthEnabled({ ...preview, DATABASE_URL: undefined, PREVIEW_DATABASE_URL: undefined }), false);
  assert.equal(isPostgresAuthEnabled({ ...preview, PREVIEW_POSTGRES_AUTH_ENABLED: true }), true);
});

test("missing Production PostgreSQL URL keeps PostgreSQL selected instead of falling back to Mongo", () => {
  const config = { ...production, DATABASE_BACKEND: "postgres", DATABASE_URL: undefined };
  assert.equal(isPostgresSelected(config), true);
  assert.equal(isPostgresAuthEnabled(config), true);
});

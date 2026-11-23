import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const productionCutoverEnv = {
  ...process.env,
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  DATABASE_BACKEND: "postgres",
  POSTGRES_AUTH_ENABLED: "true",
  CRON_SECRET: "a-test-cron-secret-at-least-sixteen",
  JWT_SECRET: "a-development-test-secret-long-enough",
  MONGODB_URI: "mongodb+srv://source.example/the-editing-table"
};

function loadEnvironment(overrides = {}) {
  const childEnv = { ...productionCutoverEnv, ...overrides };
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete childEnv[name];
  }
  return spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { env } = await import("./src/config/env.js"); const { isPostgresSelected } = await import("./src/config/databaseMode.js"); process.stdout.write(String(isPostgresSelected()) + ":" + String(Boolean(env.DATABASE_URL)));'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: childEnv
  });
}

test("Production PostgreSQL mode refuses to start without its database URL", () => {
  const result = loadEnvironment({ DATABASE_URL: "" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL/);
});

test("Vercel Preview refuses to start without its dedicated PostgreSQL URL", () => {
  const result = loadEnvironment({
    VERCEL_ENV: "preview",
    PREVIEW_DATABASE_URL: undefined,
    DATABASE_URL: "postgresql://app:unused@production.example/primary"
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /PREVIEW_DATABASE_URL/);
  assert.doesNotMatch(result.stderr, /production\.example|unused/);
});

test("Production PostgreSQL mode requires auth and cron secret without requiring declined Blob provisioning", () => {
  const result = loadEnvironment({
    DATABASE_URL: "postgresql://app:unused@database.example/production",
    POSTGRES_AUTH_ENABLED: "false",
    CRON_SECRET: ""
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /POSTGRES_AUTH_ENABLED/);
  assert.match(result.stderr, /CRON_SECRET/);
  assert.doesNotMatch(result.stderr, /unused/);
});

test("Production PostgreSQL mode requires an explicit non-local Mongo rollback URI", () => {
  const databaseUrl = "postgresql://app:unused@database.example/production";
  for (const mongoUri of ["", "mongodb://127.0.0.1:27017/the-editing-table"]) {
    const result = loadEnvironment({ DATABASE_URL: databaseUrl, MONGODB_URI: mongoUri });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /MONGODB_URI/);
    assert.doesNotMatch(result.stderr, /unused/);
  }
});

test("Mongo rollback URI host validation ignores words in credentials", () => {
  const result = loadEnvironment({
    DATABASE_URL: "postgresql://app:unused@database.example/production",
    MONGODB_URI: "mongodb+srv://user:localhost@atlas.example/database"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "true:true");
});

test("Production PostgreSQL mode cannot point at the Preview staging database", () => {
  const stagingUrl = "postgresql://app:unused@staging.example/staging";
  const result = loadEnvironment({ DATABASE_URL: stagingUrl, PREVIEW_DATABASE_URL: stagingUrl });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Production PostgreSQL must not use the Preview staging database URL/);
  assert.doesNotMatch(result.stderr, /unused/);
});

test("fully configured Production PostgreSQL mode selects PostgreSQL", () => {
  const result = loadEnvironment({ DATABASE_URL: "postgresql://app:unused@database.example/production" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "true:true");
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("Preview with a staging PostgreSQL URL never opens the Mongo connection", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { default: mongoose } = await import("mongoose"); const { connectDatabase } = await import("./src/config/db.js"); await connectDatabase(); process.stdout.write(String(mongoose.connection.readyState));'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      PREVIEW_DATABASE_URL: "postgresql://preview:preview@localhost/staging",
      MONGODB_URI: "mongodb://127.0.0.1:27017/production"
    }
  });

  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout, "0");
});

test("Preview selects its staging URL while Production keeps the integration URL", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { env } = await import("./src/config/env.js"); process.stdout.write(new URL(env.DATABASE_URL).hostname);'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      PREVIEW_DATABASE_URL: "postgresql://preview:preview@staging-db.example/staging",
      DATABASE_URL: "postgresql://production:production@primary-db.example/production"
    }
  });

  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout, "staging-db.example");

  const productionProbe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { env } = await import("./src/config/env.js"); process.stdout.write(new URL(env.DATABASE_URL).hostname);'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "production",
      PREVIEW_DATABASE_URL: "postgresql://preview:preview@staging-db.example/staging",
      DATABASE_URL: "postgresql://production:production@primary-db.example/production"
    }
  });

  assert.equal(productionProbe.status, 0, productionProbe.stderr);
  assert.equal(productionProbe.stdout, "primary-db.example");
});

test("Preview without its staging URL does not fall back to primary PostgreSQL or MongoDB", () => {
  const childEnv = { ...process.env, VERCEL_ENV: "preview", DATABASE_URL: "postgresql://primary:primary@primary-db.example/production", MONGODB_URI: "mongodb://127.0.0.1:27017/production" };
  delete childEnv.PREVIEW_DATABASE_URL;
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { default: mongoose } = await import("mongoose"); const { env } = await import("./src/config/env.js"); const { connectDatabase } = await import("./src/config/db.js"); await connectDatabase(); process.stdout.write(JSON.stringify({ databaseUrl: env.DATABASE_URL ?? null, mongoReadyState: mongoose.connection.readyState }));'
  ], { cwd: new URL("../..", import.meta.url), encoding: "utf8", env: childEnv });

  assert.equal(probe.status, 1);
  assert.match(probe.stderr, /PREVIEW_DATABASE_URL/);
  assert.doesNotMatch(probe.stderr, /primary-db\.example|production/);
  assert.equal(probe.stdout, "");
});

test("Preview GridFS refuses the Production Atlas URI unless a separate staging URI is set", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { isGridFsConfigured } = await import("./src/config/gridfsDb.js"); process.stdout.write(String(isGridFsConfigured()));'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      DATABASE_BACKEND: "postgres",
      PREVIEW_DATABASE_URL: "postgresql://preview:preview@staging-db.example/staging",
      MONGODB_URI: "mongodb+srv://prod:prod@atlas.example/production"
    }
  });
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout, "false");
});

test("Preview GridFS accepts only its explicit staging URI", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { isGridFsConfigured } = await import("./src/config/gridfsDb.js"); process.stdout.write(String(isGridFsConfigured()));'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      DATABASE_BACKEND: "postgres",
      PREVIEW_DATABASE_URL: "postgresql://preview:preview@staging-db.example/staging",
      MONGODB_URI: "mongodb+srv://prod:prod@atlas.example/production",
      PREVIEW_GRIDFS_MONGODB_URI: "mongodb+srv://preview:preview@atlas.example/staging"
    }
  });
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout, "true");
});

test("Preview GridFS rejects the Production Atlas database even with different credentials", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { isGridFsConfigured } = await import("./src/config/gridfsDb.js"); process.stdout.write(String(isGridFsConfigured()));'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      DATABASE_BACKEND: "postgres",
      PREVIEW_DATABASE_URL: "postgresql://preview:preview@staging-db.example/staging",
      MONGODB_URI: "mongodb+srv://prod:prod@atlas.example/production",
      PREVIEW_GRIDFS_MONGODB_URI: "mongodb+srv://preview:preview@atlas.example/production"
    }
  });
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout, "false");
});

test("PostgreSQL Production GridFS uses the retained Mongo rollback URI by default", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { isGridFsConfigured } = await import("./src/config/gridfsDb.js"); process.stdout.write(String(isGridFsConfigured()));'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      DATABASE_BACKEND: "postgres",
      DATABASE_URL: "postgresql://app:unused@primary.example/production",
      POSTGRES_AUTH_ENABLED: "true",
      CRON_SECRET: "a-test-cron-secret-at-least-sixteen",
      MONGODB_URI: "mongodb+srv://prod:prod@atlas.example/production"
    }
  });
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout, "true");
});

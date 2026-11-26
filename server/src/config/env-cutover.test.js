import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const productionCutoverEnv = {
  ...process.env,
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  DATABASE_URL: "postgresql://app:password@database.example/production",
  POSTGRES_AUTH_ENABLED: "true",
  CRON_SECRET: "a-test-cron-secret-at-least-sixteen",
  JWT_SECRET: "a-development-test-secret-long-enough"
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

test("Production PostgreSQL mode refuses to start with invalid DATABASE_URL", () => {
  const result = loadEnvironment({ DATABASE_URL: "not-a-valid-url" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL/);
});

test("Production mode validates CRON_SECRET length if provided", () => {
  const result = loadEnvironment({ CRON_SECRET: "short" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CRON_SECRET/);
});

test("fully configured Production PostgreSQL mode selects PostgreSQL", () => {
  const result = loadEnvironment({ DATABASE_URL: "postgresql://app:unused@database.example/production" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "true:true");
});

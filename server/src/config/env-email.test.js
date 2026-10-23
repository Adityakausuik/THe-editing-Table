import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("EMAIL_FROM survives server environment validation", () => {
  const emailFrom = "The Editing Table <no-reply@example.com>";
  const result = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { env } = await import("./src/config/env.js"); process.stdout.write(env.EMAIL_FROM || "");'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", EMAIL_FROM: emailFrom }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, emailFrom);
});

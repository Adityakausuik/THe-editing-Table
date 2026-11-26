import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("PostgreSQL Preview resume uploads route to Neon storage instead of falling back to GridFS", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { processAndSaveResume } = await import("./src/middleware/careersUpload.js"); try { await processAndSaveResume({ originalname: "resume.pdf", mimetype: "application/pdf", size: 8, buffer: Buffer.from("%PDF-1.4") }); } catch (error) { process.stdout.write(JSON.stringify({ code: error.code || "DB_ERROR", message: error.message })); }'
  ], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      DATABASE_BACKEND: "postgres",
      PREVIEW_DATABASE_URL: "postgresql://preview:preview@localhost/staging"
    }
  });

  assert.equal(probe.status, 0, probe.stderr);
  assert.doesNotMatch(probe.stdout, /mongodb|gridfs/i);
});

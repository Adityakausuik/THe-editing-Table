import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("PostgreSQL Preview resume uploads fail closed without private Blob storage", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { processAndSaveResume } = await import("./src/middleware/careersUpload.js"); try { await processAndSaveResume({ originalname: "resume.pdf", mimetype: "application/pdf", size: 8, buffer: Buffer.from("%PDF-1.4") }); process.exitCode = 2; } catch (error) { process.stdout.write(JSON.stringify({ code: error.code, status: error.status })); }'
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
  assert.deepEqual(JSON.parse(probe.stdout), { code: "BLOB_STORAGE_NOT_CONFIGURED", status: 503 });
  assert.doesNotMatch(probe.stdout, /mongodb|gridfs/i);
});

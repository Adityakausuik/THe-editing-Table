import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { MAX_IMAGE_SIZE, MAX_VIDEO_SIZE, processAndSaveFile, validateUploadMetadata } from "./upload.js";

test("upload metadata accepts supported images and MP4 at their advertised limits", () => {
  for (const mimeType of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
    assert.deepEqual(validateUploadMetadata({ mimeType, size: MAX_IMAGE_SIZE }), {
      size: MAX_IMAGE_SIZE,
      isVideo: false
    });
  }
  assert.deepEqual(validateUploadMetadata({ mimeType: "video/mp4", size: MAX_VIDEO_SIZE }), {
    size: MAX_VIDEO_SIZE,
    isVideo: true
  });
});

test("upload metadata rejects unsupported MIME types and oversize files", () => {
  assert.throws(() => validateUploadMetadata({ mimeType: "image/svg+xml", size: 10 }), {
    status: 415
  });
  assert.throws(() => validateUploadMetadata({ mimeType: "image/jpeg", size: MAX_IMAGE_SIZE + 1 }), {
    status: 413
  });
  assert.throws(() => validateUploadMetadata({ mimeType: "video/mp4", size: MAX_VIDEO_SIZE + 1 }), {
    status: 413
  });
  assert.throws(() => validateUploadMetadata({ mimeType: "image/jpeg", size: 0 }), {
    status: 413
  });
});

test("server rejects mismatched image and video content before persistence", async () => {
  await assert.rejects(
    processAndSaveFile({ originalname: "photo.jpg", mimetype: "image/jpeg", size: 4, buffer: Buffer.from("nope") }, "weddings"),
    { status: 415 }
  );
  await assert.rejects(
    processAndSaveFile({ originalname: "clip.mp4", mimetype: "video/mp4", size: 4, buffer: Buffer.from("nope") }, "weddings"),
    { status: 400 }
  );
});

test("PostgreSQL Preview uploads fail closed without Blob instead of falling back to GridFS", () => {
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    'const { processAndSaveFile } = await import("./src/middleware/upload.js"); try { await processAndSaveFile({ originalname: "photo.jpg", mimetype: "image/jpeg", size: 4, buffer: Buffer.from("nope") }, "weddings"); process.exitCode = 2; } catch (error) { process.stdout.write(JSON.stringify({ code: error.code, status: error.status })); }'
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

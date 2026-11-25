import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { validateFileSignature } from "../middleware/heroVideoUpload.js";
import {
  getActiveHeroBackground,
  getAdminHeroBackground,
  saveHeroBackgroundDraft,
  publishHeroBackground,
  unpublishHeroBackground,
  listHeroBackgroundHistory,
  deleteHeroBackgroundVersion
} from "../db/heroBackgroundRepository.js";

test("File signature validation accepts valid MP4, WebM and Images", () => {
  // Valid MP4 buffer with ftyp box
  const mp4Buf = Buffer.alloc(32);
  mp4Buf.write("....ftypisom....", 0, "latin1");
  const mp4Res = validateFileSignature(mp4Buf, "video/mp4", "sample.mp4");
  assert.equal(mp4Res.isVideo, true);
  assert.equal(mp4Res.format, "mp4");

  // Valid WebM buffer with EBML header (0x1A 0x45 0xDF 0xA3)
  const webmBuf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81]);
  const webmRes = validateFileSignature(webmBuf, "video/webm", "sample.webm");
  assert.equal(webmRes.isVideo, true);
  assert.equal(webmRes.format, "webm");

  // Valid JPEG buffer (0xFF 0xD8 0xFF)
  const jpgBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpgRes = validateFileSignature(jpgBuf, "image/jpeg", "poster.jpg");
  assert.equal(jpgRes.isVideo, false);
  assert.equal(jpgRes.format, "jpeg");

  // Valid PNG buffer (0x89 0x50 0x4E 0x47)
  const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngRes = validateFileSignature(pngBuf, "image/png", "poster.png");
  assert.equal(pngRes.isVideo, false);
  assert.equal(pngRes.format, "png");
});

test("File signature validation rejects spoofed files", () => {
  // Fake MP4 (text content pretending to be mp4)
  const fakeMp4 = Buffer.from("THIS IS PLAIN TEXT NOT A VIDEO AT ALL", "utf8");
  assert.throws(() => {
    validateFileSignature(fakeMp4, "video/mp4", "malicious.mp4");
  }, /missing ftyp box signature/);

  // Fake JPEG (empty or non-jpeg header)
  const fakeJpg = Buffer.from("NOT_A_JPEG_HEADER_BYTES_1234", "utf8");
  assert.throws(() => {
    validateFileSignature(fakeJpg, "image/jpeg", "fake.jpg");
  }, /Invalid JPEG image signature/);
});

test("Hero Background Repository draft, publish, and history cycle", async () => {
  const testUser = { id: "test_admin_user", email: "admin@theeditingtable.com" };

  // 1. Save draft
  const draft = await saveHeroBackgroundDraft(
    {
      title: "Automated Test Hero Background",
      videoUrl: "/uploads/hero/desktop/test-video.mp4",
      mobileVideoUrl: "/uploads/hero/mobile/test-video-mobile.mp4",
      posterUrl: "/uploads/hero/poster/test-poster.jpg",
      overlayOpacity: 0.4,
      playbackSpeed: 1.0,
      playbackSettings: { autoplay: true, muted: true, loop: true, playsInline: true }
    },
    testUser
  );
  assert.ok(draft._id, "Draft should have a primary key _id");
  assert.equal(draft.status, "draft");
  assert.equal(draft.overlayOpacity, 0.4);

  // 2. Publish draft
  const published = await publishHeroBackground(draft._id, testUser);
  assert.equal(published.status, "published");
  assert.ok(published.publishedAt, "Should set published_at");

  // 3. Verify public active query returns the published record
  const active = await getActiveHeroBackground();
  assert.ok(active, "Active published configuration must exist");
  assert.equal(active._id, published._id);
  assert.equal(active.status, "published");

  // 4. Unpublish
  const unpublished = await unpublishHeroBackground(published._id, testUser);
  assert.equal(unpublished.status, "draft");

  // 5. Clean up test record
  const deleted = await deleteHeroBackgroundVersion(unpublished._id);
  assert.equal(deleted._id, unpublished._id);
});

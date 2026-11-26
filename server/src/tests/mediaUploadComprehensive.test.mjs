import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import sharp from "sharp";
import { createApp } from "../app.js";
import { getYouTubeId, isValidYouTubeUrl, getYouTubeEmbedUrl, getYouTubeThumbnail } from "../../../client/src/utils/youtube.js";
import { extractYouTubeId, isValidYouTubeUrl as isServerValidYouTubeUrl } from "../utils/youtubeUtils.js";
import { normalizeMimeType, validateUploadMetadata, processAndSaveFile } from "../middleware/upload.js";
import { normalizeClientMimeType } from "../../../client/src/utils/mediaUtils.js";

const app = createApp();

async function runTests() {
  console.log("=================================================");
  console.log("STARTING COMPREHENSIVE MEDIA UPLOAD & YOUTUBE TEST");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------------
  // 1. YouTube URL Parsing & Validation Across All Formats
  // -------------------------------------------------------------------
  await test("YouTube: Extracts ID from standard watch URL", () => {
    const id = getYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(id, "dQw4w9WgXcQ");
    assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  await test("YouTube: Extracts ID from youtu.be short URL with tracking params", () => {
    const id = getYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=abcdef12345&t=30");
    assert.equal(id, "dQw4w9WgXcQ");
    assert.equal(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=abcdef12345&t=30"), "dQw4w9WgXcQ");
  });

  await test("YouTube: Extracts ID from embed and no-cookie embed URLs", () => {
    assert.equal(getYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(getYouTubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  await test("YouTube: Extracts ID from YouTube Shorts URL", () => {
    assert.equal(getYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  await test("YouTube: Extracts ID from live stream URL", () => {
    assert.equal(getYouTubeId("https://www.youtube.com/live/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  await test("YouTube: Handles bare 11-char ID", () => {
    assert.equal(getYouTubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  await test("YouTube: Rejects invalid, Vimeo, or non-YouTube URLs", () => {
    assert.equal(isValidYouTubeUrl("https://vimeo.com/1234567"), false);
    assert.equal(isValidYouTubeUrl("https://example.com/video.mp4"), false);
    assert.equal(isValidYouTubeUrl("not_a_valid_id"), false);
    assert.equal(isServerValidYouTubeUrl(""), false);
  });

  await test("YouTube: Generates embed URL with privacy enhancements", () => {
    const embed = getYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ", { autoplay: 1, mute: 1 });
    assert.ok(embed.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    assert.ok(embed.includes("playsinline=1"));
    assert.ok(embed.includes("playlist=dQw4w9WgXcQ"));
  });

  await test("YouTube: Generates valid HQ thumbnail URL", () => {
    const thumb = getYouTubeThumbnail("https://youtu.be/dQw4w9WgXcQ");
    assert.equal(thumb, "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  // -------------------------------------------------------------------
  // 2. Client & Server MIME Normalization
  // -------------------------------------------------------------------
  await test("MIME Normalization: Server normalizes image/jpg, image/pjpeg, .jpg, and QuickTime .mov", () => {
    assert.equal(normalizeMimeType("image/jpg", "test.jpg"), "image/jpeg");
    assert.equal(normalizeMimeType("image/pjpeg", "test.jpeg"), "image/jpeg");
    assert.equal(normalizeMimeType("application/octet-stream", "test.jpg"), "image/jpeg");
    assert.equal(normalizeMimeType("", "photo.jpeg"), "image/jpeg");
    assert.equal(normalizeMimeType("video/quicktime", "clip.mov"), "video/quicktime");
    assert.equal(normalizeMimeType("", "film.mov"), "video/quicktime");
  });

  await test("MIME Normalization: Client normalizes JPG, PNG, WEBP, GIF, MP4, and MOV", () => {
    assert.equal(normalizeClientMimeType({ type: "image/jpg", name: "test.jpg" }), "image/jpeg");
    assert.equal(normalizeClientMimeType({ type: "image/jpeg", name: "test.jpg" }), "image/jpeg");
    assert.equal(normalizeClientMimeType({ type: "", name: "camera.jpg" }), "image/jpeg");
    assert.equal(normalizeClientMimeType({ type: "image/png", name: "logo.png" }), "image/png");
    assert.equal(normalizeClientMimeType({ type: "image/webp", name: "img.webp" }), "image/webp");
    assert.equal(normalizeClientMimeType({ type: "image/gif", name: "clip.gif" }), "image/gif");
    assert.equal(normalizeClientMimeType({ type: "video/mp4", name: "reel.mp4" }), "video/mp4");
    assert.equal(normalizeClientMimeType({ type: "video/quicktime", name: "scene.mov" }), "video/quicktime");
    assert.equal(normalizeClientMimeType({ type: "", name: "raw_footage.mov" }), "video/quicktime");
  });

  // -------------------------------------------------------------------
  // 3. Metadata Validation & Size Limits (No Artificial Caps)
  // -------------------------------------------------------------------
  await test("validateUploadMetadata: Accepts JPG images with correct normalized MIME", () => {
    const resultJpg = validateUploadMetadata({ mimeType: "image/jpg", size: 5000, originalName: "camera.jpg" });
    assert.equal(resultJpg.mimeType, "image/jpeg");
    assert.equal(resultJpg.isVideo, false);
    assert.equal(resultJpg.size, 5000);
  });

  await test("validateUploadMetadata: Accepts large high-res photos without artificial caps", () => {
    for (const mime of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      const res = validateUploadMetadata({ mimeType: mime, size: 50 * 1024 * 1024 });
      assert.equal(res.size, 50 * 1024 * 1024);
      assert.equal(res.isVideo, false);
    }
  });

  await test("validateUploadMetadata: Accepts large MP4 and MOV videos without artificial caps", () => {
    for (const mime of ["video/mp4", "video/quicktime", "video/webm"]) {
      const res = validateUploadMetadata({ mimeType: mime, size: 500 * 1024 * 1024 });
      assert.equal(res.size, 500 * 1024 * 1024);
      assert.equal(res.isVideo, true);
    }
  });

  await test("validateUploadMetadata: Rejects zero or negative file sizes (400)", () => {
    assert.throws(() => {
      validateUploadMetadata({ mimeType: "image/jpeg", size: 0 });
    }, { status: 400 });
    assert.throws(() => {
      validateUploadMetadata({ mimeType: "video/mp4", size: -1 });
    }, { status: 400 });
  });

  await test("validateUploadMetadata: Rejects unsupported file types (e.g. PDF, EXE)", () => {
    assert.throws(() => {
      validateUploadMetadata({ mimeType: "application/pdf", size: 1000 });
    }, /Unsupported file type/);
    assert.throws(() => {
      validateUploadMetadata({ mimeType: "application/x-msdownload", size: 1000 });
    }, /Unsupported file type/);
  });

  // -------------------------------------------------------------------
  // 4. File Processing & Real Image Conversion with Sharp
  // -------------------------------------------------------------------
  const validJpgBuffer = await sharp({
    create: { width: 120, height: 120, channels: 3, background: { r: 38, g: 61, b: 45 } }
  }).jpeg().toBuffer();

  const validPngBuffer = await sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).png().toBuffer();

  const validWebpBuffer = await sharp({
    create: { width: 80, height: 80, channels: 3, background: { r: 72, g: 125, b: 72 } }
  }).webp().toBuffer();

  const validGifBuffer = await sharp({
    create: { width: 60, height: 60, channels: 3, background: { r: 180, g: 120, b: 60 } }
  }).gif().toBuffer();

  const validMp4Buffer = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from("ftypisom", "latin1"),
    Buffer.from([0x00, 0x00, 0x02, 0x00]),
    Buffer.from("isommp41", "latin1"),
    Buffer.alloc(256)
  ]);

  await test("processAndSaveFile: Successfully processes JPG file in portfolio", async () => {
    const file = {
      originalname: "test_retouch.jpg",
      mimetype: "image/jpg",
      size: validJpgBuffer.length,
      buffer: validJpgBuffer
    };
    const saved = await processAndSaveFile(file, "portfolio");
    assert.ok(saved.url.startsWith("/uploads/portfolio/"));
    assert.ok(saved.url.endsWith(".webp") || saved.url.endsWith(".jpg"));
    assert.ok(saved.mimeType === "image/webp" || saved.mimeType === "image/jpeg");
    assert.equal(saved.isVideo, false);
  });

  await test("processAndSaveFile: Successfully processes PNG file in services", async () => {
    const file = {
      originalname: "service_icon.png",
      mimetype: "image/png",
      size: validPngBuffer.length,
      buffer: validPngBuffer
    };
    const saved = await processAndSaveFile(file, "services");
    assert.ok(saved.url.startsWith("/uploads/services/"));
    assert.ok(saved.mimeType === "image/webp" || saved.mimeType === "image/png");
  });

  await test("processAndSaveFile: Successfully processes GIF file in general", async () => {
    const file = {
      originalname: "animation.gif",
      mimetype: "image/gif",
      size: validGifBuffer.length,
      buffer: validGifBuffer
    };
    const saved = await processAndSaveFile(file, "general");
    assert.ok(saved.url.startsWith("/uploads/general/"));
    assert.ok(saved.mimeType === "image/webp" || saved.mimeType === "image/gif");
  });

  await test("processAndSaveFile: Successfully processes MP4 video in hero", async () => {
    const file = {
      originalname: "showreel.mp4",
      mimetype: "video/mp4",
      size: validMp4Buffer.length,
      buffer: validMp4Buffer
    };
    const saved = await processAndSaveFile(file, "hero");
    assert.ok(saved.url.startsWith("/uploads/hero/"));
    assert.ok(saved.url.endsWith(".mp4"));
    assert.equal(saved.isVideo, true);
  });

  const validMovBuffer = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x14]),
    Buffer.from("ftypqt  ", "latin1"),
    Buffer.from([0x20, 0x05, 0x03, 0x00]),
    Buffer.from("qt  ", "latin1"),
    Buffer.alloc(256)
  ]);

  await test("processAndSaveFile: Successfully processes MOV video in hero", async () => {
    const file = {
      originalname: "cinematic.mov",
      mimetype: "video/quicktime",
      size: validMovBuffer.length,
      buffer: validMovBuffer
    };
    const saved = await processAndSaveFile(file, "hero");
    assert.ok(saved.url.startsWith("/uploads/hero/"));
    assert.ok(saved.url.endsWith(".mov"));
    assert.equal(saved.isVideo, true);
  });

  await test("processAndSaveFile: Successfully processes uploads to aboutme and photo-showcase", async () => {
    const aboutFile = {
      originalname: "founder.jpg",
      mimetype: "image/jpeg",
      size: validJpgBuffer.length,
      buffer: validJpgBuffer
    };
    const savedAbout = await processAndSaveFile(aboutFile, "aboutme");
    assert.ok(savedAbout.url.startsWith("/uploads/aboutme/"));

    const photoFile = {
      originalname: "showcase1.png",
      mimetype: "image/png",
      size: validPngBuffer.length,
      buffer: validPngBuffer
    };
    const savedPhoto = await processAndSaveFile(photoFile, "photo-showcase");
    assert.ok(savedPhoto.url.startsWith("/uploads/photo-showcase/"));
  });

  await test("Security: Rejects spoofed text file masquerading as .jpg (415)", async () => {
    const spoofedFile = {
      originalname: "malicious.jpg",
      mimetype: "image/jpeg",
      size: 30,
      buffer: Buffer.from("THIS_IS_PLAIN_TEXT_NOT_AN_IMAGE")
    };
    await assert.rejects(
      processAndSaveFile(spoofedFile, "portfolio"),
      { status: 415 }
    );
  });

  await test("Security: Rejects spoofed binary file masquerading as .mp4 (400)", async () => {
    const fakeMp4 = {
      originalname: "corrupt.mp4",
      mimetype: "video/mp4",
      size: 40,
      buffer: Buffer.from("NOT_AN_MP4_FILE_NO_FTYP_BOX_HERE")
    };
    await assert.rejects(
      processAndSaveFile(fakeMp4, "hero"),
      { status: 400 }
    );
  });

  // -------------------------------------------------------------------
  // 5. Live Server Endpoint Testing via Native HTTP
  // -------------------------------------------------------------------
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await test("API Security: Unauthenticated POST /api/v1/upload/single returns 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/upload/single`, { method: "POST" });
      assert.equal(res.status, 401);
    });

    await test("API Security: Unauthenticated POST /api/v1/upload/chunked/start returns 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/upload/chunked/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "general", mimeType: "image/jpeg", size: 1000 })
      });
      assert.equal(res.status, 401);
    });

    await test("API Security: Unauthenticated POST /api/v1/upload/chunked/part returns 401", async () => {
      const res = await fetch(`${baseUrl}/api/v1/upload/chunked/part`, { method: "POST" });
      assert.equal(res.status, 401);
    });

    await test("API Health: GET /health returns online status", async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data?.status);
    });
  } finally {
    server.close();
  }

  console.log("=================================================");
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});

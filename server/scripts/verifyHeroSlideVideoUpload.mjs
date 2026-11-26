import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import { chromium } from "playwright";
import { createApp } from "../src/app.js";
import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";
import { createPostgresHeroSlide, deletePostgresHeroSlide } from "../src/db/heroSlideRepository.js";
import { createId } from "../src/utils/ids.js";
import { signAccessToken } from "../src/lib/jwt.js";
import { csrfTokenForSession } from "../src/middleware/auth.js";
import User from "../src/models/User.model.js";

const clientDist = path.resolve(process.cwd(), "../client/dist");

async function run() {
  console.log("==================================================================");
  console.log("THE EDITING TABLE – HERO SLIDE VIDEO UPLOAD & PLAYBACK VERIFICATION");
  console.log("==================================================================\n");

  const pool = getPostgresPool();
  const apiApp = createApp();

  // Unified express server for both API and client static dist
  const serverApp = express();
  serverApp.use((req, res, next) => {
    if (
      req.path.startsWith("/api/") ||
      req.path.startsWith("/uploads/") ||
      req.path === "/health"
    ) {
      return apiApp(req, res, next);
    }
    return next();
  });
  serverApp.use(express.static(clientDist));
  serverApp.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  const server = http.createServer(serverApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test server running on ${baseUrl}`);

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  FAIL: ${message}`);
      testsFailed++;
    }
  }

  // Setup verified admin user & session in PostgreSQL
  const testAdminId = createId();
  const testSessionId = createId();
  const testEmail = `test.admin.${Date.now()}@theeditingtable.com`;
  const pwdHash = await User.hashPassword("TestAdmin@2026!Secure");

  await pool.query(
    `INSERT INTO "users" ("_id", "name", "email", "password_hash", "role", "is_active", "two_factor__enabled")
     VALUES ($1, $2, $3, $4, 'superadmin', true, false)`,
    [testAdminId, "Test Hero Admin", testEmail, pwdHash]
  );
  await pool.query(
    `INSERT INTO "sessions" ("_id", "user", "ip_address", "user_agent", "expires_at", "two_factor_verified")
     VALUES ($1, $2, '127.0.0.1', 'AuditBot/1.0', now() + interval '2 hours', true)`,
    [testSessionId, testAdminId]
  );

  const adminToken = signAccessToken({
    id: testAdminId,
    email: testEmail,
    role: "superadmin",
    type: "access",
    sid: testSessionId
  });
  const csrfToken = csrfTokenForSession(testSessionId);

  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    "x-csrf-token": csrfToken
  };

  const cleanupSlideIds = [];
  const cleanupMediaIds = [];
  const cleanupUserIds = [testAdminId];
  const cleanupSessionIds = [testSessionId];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Chunked Video Upload (MP4) to folder="hero"
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Chunked Video Upload (MP4) to folder='hero'");
    const videoData = Buffer.alloc(128 * 1024, 0x5a); // 128KB dummy MP4
    const filename = `hero_test_slide_${Date.now()}.mp4`;

    // 1.1 Start chunked upload
    const startRes = await fetch(`${baseUrl}/api/v1/upload/chunked/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...adminHeaders
      },
      body: JSON.stringify({
        folder: "hero",
        mimeType: "video/mp4",
        size: videoData.length,
        originalName: filename
      })
    });
    const startJson = await startRes.json();
    assert(startRes.status === 201 && startJson.data?.uploadId, "Video chunked upload started in 'hero' folder");
    const uploadId = startJson.data.uploadId;

    // 1.2 Upload Chunk 0
    const chunkForm = new FormData();
    chunkForm.append("uploadId", uploadId);
    chunkForm.append("index", "0");
    chunkForm.append("count", "1");
    chunkForm.append("chunk", new Blob([videoData], { type: "video/mp4" }), filename);

    const chunkRes = await fetch(`${baseUrl}/api/v1/upload/chunked/part`, {
      method: "POST",
      headers: {
        ...adminHeaders
      },
      body: chunkForm
    });
    const chunkJson = await chunkRes.json();
    assert(chunkRes.status === 200, "Video chunk 0 uploaded successfully");

    // 1.3 Finish chunked upload
    const finishRes = await fetch(`${baseUrl}/api/v1/upload/chunked/finish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...adminHeaders
      },
      body: JSON.stringify({
        uploadId,
        originalName: filename,
        mimeType: "video/mp4",
        size: videoData.length,
        folder: "hero"
      })
    });
    const finishJson = await finishRes.json();
    assert((finishRes.status === 200 || finishRes.status === 201) && finishJson.data?.url, `Video upload finished successfully: ${finishJson.data?.url}`);
    const uploadedVideoUrl = finishJson.data.url;
    const mediaId = finishJson.data._id || finishJson.data.id;
    if (mediaId) cleanupMediaIds.push(mediaId);

    // -------------------------------------------------------------------------
    // TEST 2: Neon PostgreSQL Media Storage Persistence Verification
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Neon PostgreSQL Media Storage Verification");
    const mediaRow = await pool.query('SELECT * FROM "media" WHERE "url" = $1 OR "_id" = $2', [uploadedVideoUrl, mediaId || "none"]);
    assert(mediaRow.rows.length >= 1, "Media metadata record exists in Neon PostgreSQL");
    assert(mediaRow.rows[0].is_video === true, "media.is_video flagged as TRUE");
    assert(mediaRow.rows[0].category === "hero", "media.category set to 'hero'");
    const actualMediaId = mediaRow.rows[0]._id;
    cleanupMediaIds.push(actualMediaId);

    const chunkRow = await pool.query('SELECT COUNT(*) FROM "media_chunks" WHERE "media_id" = $1', [actualMediaId]);
    assert(parseInt(chunkRow.rows[0].count, 10) >= 1, "media_chunks binary data saved in PostgreSQL BYTEA");

    // -------------------------------------------------------------------------
    // TEST 3: Create Hero Slide with the Uploaded Video
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Create Hero Slide with Video in Neon PostgreSQL");
    const slideKey = `test-hero-video-${Date.now()}`;
    const slidePayload = {
      slideKey,
      slideType: "ceo",
      layoutType: "ceo_editorial",
      eyebrow: "CINEMATIC HERO",
      title: "Mastering Storytelling Through Video",
      subtitle: "Full-fidelity video slide in Neon PostgreSQL",
      ctaText: "Explore Portfolio",
      ctaLink: "/portfolio",
      mainImage: uploadedVideoUrl,
      order: 1,
      active: true,
      status: "published"
    };

    const createSlideRes = await fetch(`${baseUrl}/api/v1/cms/hero-slides/admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...adminHeaders
      },
      body: JSON.stringify(slidePayload)
    });
    const createSlideJson = await createSlideRes.json();
    assert(createSlideRes.status === 201 && createSlideJson.data?._id, "Hero slide created via API");
    const createdSlideId = createSlideJson.data._id;
    cleanupSlideIds.push(createdSlideId);

    // -------------------------------------------------------------------------
    // TEST 4: Hero Slide API Response Formatting & isVideo Flag
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Hero Slide API Response Normalization");
    const getSlidesRes = await fetch(`${baseUrl}/api/v1/cms/hero-slides`);
    const getSlidesJson = await getSlidesRes.json();
    assert(getSlidesRes.status === 200 && Array.isArray(getSlidesJson.data), "GET /api/v1/cms/hero-slides returned 200 OK");
    const foundSlide = getSlidesJson.data.find((s) => s._id === createdSlideId || s.slideKey === slideKey);
    assert(Boolean(foundSlide), "Newly created slide is present in public slides list");
    assert(foundSlide.isVideo === true, "slide.isVideo is true");
    assert(foundSlide.mediaType === "video", "slide.mediaType is 'video'");
    assert(foundSlide.videoUrl === uploadedVideoUrl, "slide.videoUrl points to uploaded media URL");

    // -------------------------------------------------------------------------
    // TEST 5: HTTP Range Streaming of Uploaded Video
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] HTTP Range Streaming of Video from Neon PostgreSQL");
    const streamRes = await fetch(`${baseUrl}${uploadedVideoUrl}`, {
      headers: { Range: "bytes=0-1023" }
    });
    assert(streamRes.status === 206, "HTTP 206 Partial Content returned for range stream");
    const contentType = streamRes.headers.get("content-type") || "";
    assert(contentType.includes("video/mp4"), `Content-Type contains video/mp4 (received: "${contentType}")`);
    assert(streamRes.headers.get("accept-ranges") === "bytes", "Accept-Ranges: bytes header present");
    assert(streamRes.headers.get("content-range") === `bytes 0-1023/${videoData.length}`, "Content-Range header matches");

    // -------------------------------------------------------------------------
    // TEST 6: Playwright Headless Browser Verification
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Playwright Headless Browser Verification (Edge)");
    const browser = await chromium.launch({
      headless: true,
      channel: "msedge"
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    // 6.1 Public Homepage Hero Verification
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Check if the hero section rendered the slide video
    const videoLocator = page.locator(".et-hero main.hero video");
    const videoCount = await videoLocator.count();
    assert(videoCount >= 1, "Public homepage rendered HTML5 <video> element for hero slide");

    const videoSrc = await videoLocator.first().getAttribute("src");
    assert(videoSrc && videoSrc.includes(".mp4"), `Video src correctly points to MP4: ${videoSrc}`);

    const isMuted = await videoLocator.first().evaluate((el) => el.muted);
    assert(isMuted === true, "Video is muted for autoplay compliance");

    const heroTitle = await page.locator(".slide-title").textContent();
    assert(heroTitle && heroTitle.includes("Mastering Storytelling"), `Slide title correctly displayed: "${heroTitle}"`);

    // Take screenshot for visual verification artifact
    const screenshotPath = "C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc/hero_slide_video_verified.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  ✓ Visual verification screenshot captured: ${screenshotPath}`);

    await browser.close();

  } catch (err) {
    console.error("Test execution failed with error:", err);
    testsFailed++;
  } finally {
    // Clean up test data
    console.log("\n[CLEANUP] Removing test artifacts from database...");
    for (const slideId of cleanupSlideIds) {
      try {
        await pool.query('DELETE FROM "heroslides" WHERE "_id" = $1', [slideId]);
        console.log(`  ✓ Cleaned up slide: ${slideId}`);
      } catch (e) {
        console.error("Error cleaning up slide:", e.message);
      }
    }
    for (const mediaId of cleanupMediaIds) {
      try {
        await pool.query('DELETE FROM "media_chunks" WHERE "media_id" = $1', [mediaId]);
        await pool.query('DELETE FROM "media" WHERE "_id" = $1', [mediaId]);
        console.log(`  ✓ Cleaned up media: ${mediaId}`);
      } catch (e) {
        console.error("Error cleaning up media:", e.message);
      }
    }
    for (const sid of cleanupSessionIds) {
      try {
        await pool.query('DELETE FROM "sessions" WHERE "_id" = $1', [sid]);
      } catch {}
    }
    for (const uid of cleanupUserIds) {
      try {
        await pool.query('DELETE FROM "users" WHERE "_id" = $1', [uid]);
      } catch {}
    }

    server.close();
    await closePostgresPool();
  }

  console.log("\n==================================================================");
  console.log(`VERIFICATION COMPLETE: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log("==================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();

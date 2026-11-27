import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import { chromium } from "playwright";
import { createApp } from "../src/app.js";
import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";
import { createPostgresMediaUploadSession, savePostgresMediaUploadPart } from "../src/db/mediaUploadRepository.js";
import { commitChunkedUploadToNeon, deleteMediaFromNeon } from "../src/db/neonMediaStorage.js";
import { getCache, setCache } from "../src/config/redis.js";

const clientDist = path.resolve(process.cwd(), "client/dist");
const artifactDir = "C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc";

const MOBILE_VIEWPORTS = [
  { name: "320px (iPhone SE small)", width: 320, height: 568 },
  { name: "360px (Galaxy S8)", width: 360, height: 740 },
  { name: "390px (iPhone 13/14 Pro)", width: 390, height: 844 },
  { name: "430px (iPhone 14 Pro Max)", width: 430, height: 932 },
  { name: "768px (iPad Portrait)", width: 768, height: 1024 }
];

const DESKTOP_VIEWPORTS = [
  { name: "1024px (Tablet Landscape)", width: 1024, height: 768 },
  { name: "1440px (Laptop)", width: 1440, height: 900 },
  { name: "1920px (Desktop Full HD)", width: 1920, height: 1080 }
];

async function runMasterAudit() {
  console.log("==================================================================");
  console.log("MASTER FULL-STACK WEBSITE AUDIT & RESPONSIVE VERIFICATION");
  console.log("==================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      failedTests++;
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  // 1. Initialize Server
  const apiApp = createApp();
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
  console.log(`[1] Test server running at ${baseUrl}`);

  const browser = await chromium.launch({
    headless: true,
    channel: "msedge"
  });

  try {
    // -------------------------------------------------------------
    // PART 1: MOBILE HAMBURGER MENU & DRAWER AUDIT
    // -------------------------------------------------------------
    console.log("\n[2] AUDITING MOBILE HAMBURGER MENU & NAVIGATION DRAWER...");

    for (const vp of MOBILE_VIEWPORTS) {
      console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.width <= 768,
        hasTouch: true
      });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: "networkidle" });

      // Verify hamburger button exists and is visible
      const hamburger = page.locator('button[aria-label*="navigation menu"]');
      const isVisible = await hamburger.isVisible();
      assert(isVisible, `Hamburger button visible at ${vp.width}px`);

      // Verify initial state
      const initialExpanded = await hamburger.getAttribute("aria-expanded");
      assert(initialExpanded === "false", `Initial aria-expanded is 'false'`);

      // Click to open hamburger menu
      await hamburger.click();
      await page.waitForTimeout(350);

      // Verify expanded state
      const expandedAfterClick = await hamburger.getAttribute("aria-expanded");
      assert(expandedAfterClick === "true", `aria-expanded updated to 'true' after click`);

      // Verify mobile drawer element exists and is visible
      const drawer = page.locator("#mobile-navigation");
      const drawerVisible = await drawer.isVisible();
      assert(drawerVisible, `Mobile drawer (#mobile-navigation) is visible`);

      // Verify drawer dimensions (must NOT be collapsed / 0px height!)
      const drawerBox = await drawer.boundingBox();
      assert(
        drawerBox && drawerBox.height > 200,
        `Drawer height is robust (${Math.round(drawerBox?.height || 0)}px > 200px)`
      );
      assert(
        drawerBox && drawerBox.width >= vp.width * 0.8,
        `Drawer width spans viewport (${Math.round(drawerBox?.width || 0)}px)`
      );

      // Verify all navigation links are present in drawer
      const links = drawer.locator("a");
      const linkCount = await links.count();
      assert(linkCount >= 7, `Drawer contains all ${linkCount} links (expected >= 7)`);

      // Check specific link text
      const linkTexts = await links.allInnerTexts();
      const hasHome = linkTexts.some((t) => t.includes("Home"));
      const hasServices = linkTexts.some((t) => t.includes("Services"));
      const hasPortfolio = linkTexts.some((t) => t.includes("Portfolio"));
      const hasContact = linkTexts.some((t) => t.includes("Contact") || t.includes("Start a Project"));
      assert(hasHome && hasServices && hasPortfolio && hasContact, `Key navigation links rendered in drawer`);

      // Check Start a Project CTA button
      const ctaInDrawer = drawer.locator('a:has-text("Start a Project")');
      const ctaVisible = await ctaInDrawer.isVisible();
      assert(ctaVisible, `CTA 'Start a Project' button is visible inside drawer`);

      // Save screenshot for 390px and 320px
      if (vp.width === 390 || vp.width === 320) {
        const screenshotPath = path.join(artifactDir, `mobile_drawer_open_${vp.width}px.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`  📸 Saved drawer screenshot: ${screenshotPath}`);
      }

      // Test navigation on click: click "About" link
      const aboutLink = drawer.locator('a:has-text("About")');
      await aboutLink.click();
      await page.waitForTimeout(400);

      // Verify URL navigated and menu closed
      const currentUrl = page.url();
      assert(currentUrl.includes("/about"), `Navigation to /about succeeded (URL: ${currentUrl})`);
      const isClosedAfterNav = (await hamburger.getAttribute("aria-expanded")) === "false";
      assert(isClosedAfterNav, `Mobile menu auto-closed upon navigating`);

      await context.close();
    }

    // -------------------------------------------------------------
    // PART 2: DESKTOP NAVIGATION AUDIT
    // -------------------------------------------------------------
    console.log("\n[3] AUDITING DESKTOP NAVIGATION & RESPONSIVE BREAKPOINTS...");

    for (const vp of DESKTOP_VIEWPORTS) {
      console.log(`\n--- Testing Desktop Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height }
      });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: "networkidle" });

      // Verify brand logo
      const brandLogo = page.locator('header a[aria-label*="The Editing Table home"]');
      assert(await brandLogo.isVisible(), `Brand logo visible at ${vp.width}px`);

      if (vp.width >= 1080) {
        // Desktop nav should be visible
        const desktopNav = page.locator('header nav[aria-label="Primary navigation"]');
        assert(await desktopNav.isVisible(), `Desktop horizontal nav bar visible at ${vp.width}px`);

        // Hamburger button should be hidden
        const hamburger = page.locator('button[aria-label*="navigation menu"]');
        assert(!(await hamburger.isVisible()), `Hamburger button hidden on desktop (${vp.width}px)`);

        // Desktop CTA button visible
        const ctaBtn = desktopNav.locator('a:has-text("Start a Project")');
        assert(await ctaBtn.isVisible(), `Desktop CTA button visible at ${vp.width}px`);
      } else {
        // 1024px tablet landscape uses hamburger
        const hamburger = page.locator('button[aria-label*="navigation menu"]');
        assert(await hamburger.isVisible(), `Hamburger toggle visible at 1024px (below 1080px threshold)`);
      }

      await context.close();
    }

    // -------------------------------------------------------------
    // PART 3: QUALITY STANDARDS SECTION AUDIT
    // -------------------------------------------------------------
    console.log("\n[4] AUDITING QUALITY STANDARDS SECTION...");

    const qsContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const qsPage = await qsContext.newPage();
    await qsPage.goto(baseUrl, { waitUntil: "networkidle" });

    const qsSection = qsPage.locator("#why-us");
    assert(await qsSection.isVisible(), `Quality Standards (#why-us) section is rendered on home page`);

    const qsBox = await qsSection.boundingBox();
    assert(
      qsBox && qsBox.height > 400 && qsBox.height < 1200,
      `Quality Standards section height is optimized (~${Math.round(qsBox?.height || 0)}px)`
    );

    const featureItems = qsSection.locator(".border-b.border-sage-border\\/60");
    const featureCount = await featureItems.count();
    assert(featureCount >= 6, `All 6 quality guarantee feature cards rendered (${featureCount} found)`);

    await qsContext.close();

    // -------------------------------------------------------------
    // PART 4: ZERO-LATENCY CHUNKED VIDEO UPLOAD & COMMITTED CACHE TEST
    // -------------------------------------------------------------
    console.log("\n[5] AUDITING CHUNKED VIDEO UPLOAD & DATABASE COMMIT SPEED...");

    const testUserId = "audit-tester-user";
    const testUploadId = `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const testVideoBuffer = Buffer.alloc(1024 * 512, 0x5a); // 512KB mock video
    const chunkSize = 256 * 1024; // 2 chunks of 256KB
    const partCount = 2;

    // Create session using official repository function
    await createPostgresMediaUploadSession({
      uploadId: testUploadId,
      userId: testUserId,
      folder: "hero",
      mimeType: "video/mp4",
      totalSize: testVideoBuffer.length,
      partCount,
      ttlHours: 1
    });

    // Save parts using official repository function
    for (let i = 0; i < partCount; i++) {
      const partSlice = testVideoBuffer.subarray(i * chunkSize, (i + 1) * chunkSize);
      await savePostgresMediaUploadPart({
        uploadId: testUploadId,
        userId: testUserId,
        index: i,
        count: partCount,
        buffer: partSlice
      });
    }

    // Measure in-database commit execution time
    const commitStart = performance.now();
    const committed = await commitChunkedUploadToNeon({
      uploadId: testUploadId,
      userId: testUserId,
      folder: "hero",
      originalName: "master_audit_video.mp4",
      mimeType: "video/mp4",
      size: testVideoBuffer.length,
      width: 1920,
      height: 1080,
      duration: 15
    });
    const commitDuration = performance.now() - commitStart;

    console.log(`  ⏱️ In-Database Chunk Migration time: ${commitDuration.toFixed(2)} ms`);
    assert(commitDuration < 2000, `Video commit completed in under 2000ms (${commitDuration.toFixed(2)}ms, previously >15000ms)`);
    assert(Boolean(committed?.url), `Committed media URL generated: ${committed?.url}`);
    assert(committed?.checksum?.length === 64, `SHA-256 checksum correctly computed: ${committed?.checksum}`);

    // Verify Redis cache was immediately warmed
    const cachedMeta = await getCache(`media:meta:${committed.path}`);
    assert(Boolean(cachedMeta && cachedMeta.url === committed.url), `Redis metadata cache pre-warmed instantly`);

    // Verify Range streaming returns HTTP 206
    const streamRes = await fetch(`${baseUrl}${committed.url}`, {
      headers: { Range: "bytes=0-1023" }
    });
    assert(streamRes.status === 206, `Video range streaming returns HTTP 206 Partial Content`);
    assert(
      streamRes.headers.get("content-type") === "video/mp4",
      `Video Content-Type is video/mp4 (${streamRes.headers.get("content-type")})`
    );

    // Cleanup test record
    await deleteMediaFromNeon(committed._id);
    console.log(`  ✓ Cleaned up test media: ${committed._id}`);

  } catch (err) {
    console.error("Master audit exception:", err);
    failedTests++;
  } finally {
    await browser.close();
    server.close();
    await closePostgresPool();
  }

  console.log("\n==================================================================");
  console.log(`AUDIT RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMasterAudit();

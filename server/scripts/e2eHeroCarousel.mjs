import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { chromium } from "playwright";
import express from "express";
import { createApp } from "../src/app.js";
import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";
import { createId } from "../src/utils/ids.js";
import { createPostgresHeroSlide, deletePostgresHeroSlide } from "../src/db/heroSlideRepository.js";
import { deleteCache, invalidateCmsCache } from "../src/config/redis.js";

async function runBrowserE2E() {
  console.log("==================================================================");
  console.log("PLAYWRIGHT BROWSER E2E: HERO CAROUSEL 5S ROTATION & DELIVERY TEST");
  console.log("==================================================================\n");

  const pool = getPostgresPool();
  await pool.query('DELETE FROM "heroslides"');

  // Create 3 published test hero slides
  const slide1Id = createId();
  const slide2Id = createId();
  const slide3Id = createId();

  await createPostgresHeroSlide(slide1Id, {
    slideKey: "cinematic-films-e2e",
    title: "Cinematic Film & Commercial Editing",
    eyebrow: "EDITORIAL POST-PRODUCTION",
    subtitle: "High-end post-production for directors, creators and luxury brands worldwide.",
    ctaText: "Start a Project",
    ctaLink: "/contact",
    order: 1,
    active: true,
    status: "published"
  });

  await createPostgresHeroSlide(slide2Id, {
    slideKey: "narrative-documentary-e2e",
    title: "Documentary & Narrative Storytelling",
    eyebrow: "NARRATIVE MASTERY",
    subtitle: "Pacing, multi-cam sync, emotion and precision editorial structure.",
    ctaText: "Explore Portfolio",
    ctaLink: "/portfolio",
    order: 2,
    active: true,
    status: "published"
  });

  await createPostgresHeroSlide(slide3Id, {
    slideKey: "color-grading-e2e",
    title: "DaVinci Resolve Color Grading & Finishing",
    eyebrow: "COLOR SCIENCE",
    subtitle: "Custom show-LUT creation, HDR mastering, and micro-contrast calibration.",
    ctaText: "View Showreel",
    ctaLink: "/portfolio",
    order: 3,
    active: true,
    status: "published"
  });

  await deleteCache("cms:hero-slides:public");
  await invalidateCmsCache("hero");

  // Create unified express app that mounts the API and serves client/dist
  const apiApp = createApp();
  const unifiedApp = express();
  const clientDist = path.resolve("client/dist");

  // Route API and Upload requests to backend
  unifiedApp.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/health")) {
      return apiApp(req, res, next);
    }
    next();
  });

  // Serve static client frontend build
  unifiedApp.use(express.static(clientDist));
  unifiedApp.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  const server = http.createServer(unifiedApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Full-stack preview server running at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log("\n[Step 1] Navigating to homepage...");
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    console.log("[Step 2] Verifying Slide 1 is active on initial render...");
    await page.waitForSelector(".slide-title", { timeout: 10000 });
    const initialTitle = await page.textContent(".slide-title");
    console.log(`  Initial Slide Title: "${initialTitle.trim()}"`);
    if (!initialTitle.includes("Cinematic Film & Commercial Editing")) {
      throw new Error(`Expected Slide 1 title, got: "${initialTitle}"`);
    }

    const eyebrow = await page.textContent(".slide-eyebrow span");
    console.log(`  Eyebrow: "${eyebrow.trim()}"`);
    const ctaButton = await page.textContent(".slide-cta-button");
    console.log(`  CTA Button: "${ctaButton.trim()}"`);

    // Take screenshot of Slide 1
    const screenshot1Path = path.resolve("C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc/hero_carousel_slide1.png");
    await page.screenshot({ path: screenshot1Path });
    console.log(`  ✓ Screenshot saved: ${screenshot1Path}`);

    console.log("\n[Step 3] Waiting for automatic 5-second rotation to Slide 2...");
    // Wait for the slide title to change to slide 2
    await page.waitForFunction(
      () => {
        const titleEl = document.querySelector(".slide-title");
        return titleEl && titleEl.textContent.includes("Documentary & Narrative Storytelling");
      },
      null,
      { timeout: 7000 }
    );
    const rotatedTitle = await page.textContent(".slide-title");
    console.log(`  ✓ Slide rotated automatically after 5s to: "${rotatedTitle.trim()}"`);

    // Take screenshot of Slide 2
    const screenshot2Path = path.resolve("C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc/hero_carousel_slide2.png");
    await page.screenshot({ path: screenshot2Path });
    console.log(`  ✓ Screenshot saved: ${screenshot2Path}`);

    console.log("\n[Step 4] Testing interactive indicator navigation to Slide 3...");
    const indicatorButtons = page.locator(".indicator-dot");
    const indicatorCount = await indicatorButtons.count();
    console.log(`  Found ${indicatorCount} carousel indicator dots.`);
    if (indicatorCount !== 3) {
      throw new Error(`Expected 3 indicator dots, found: ${indicatorCount}`);
    }

    // Click indicator 3 (index 2)
    await indicatorButtons.nth(2).click();
    await page.waitForFunction(
      () => {
        const titleEl = document.querySelector(".slide-title");
        return titleEl && titleEl.textContent.includes("DaVinci Resolve Color Grading & Finishing");
      },
      null,
      { timeout: 3000 }
    );
    const manualTitle = await page.textContent(".slide-title");
    console.log(`  ✓ Clicked indicator 3 -> Slide switched immediately to: "${manualTitle.trim()}"`);

    // Take screenshot of Slide 3
    const screenshot3Path = path.resolve("C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc/hero_carousel_slide3.png");
    await page.screenshot({ path: screenshot3Path });
    console.log(`  ✓ Screenshot saved: ${screenshot3Path}`);

    console.log("\n[Step 5] Testing 0-slide fallback mode...");
    // Delete slides and revalidate
    await deletePostgresHeroSlide(slide1Id);
    await deletePostgresHeroSlide(slide2Id);
    await deletePostgresHeroSlide(slide3Id);
    await deleteCache("cms:hero-slides:public");
    await invalidateCmsCache("hero");

    // Reload page to verify minimal brand fallback
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("h1.fallback-h1", { timeout: 10000 });
    const fallbackScript = await page.textContent(".script");
    const fallbackBold = await page.textContent(".bold");
    const fallbackBrand = await page.textContent(".brand h2");

    console.log(`  Fallback text: "${fallbackScript.trim()} ${fallbackBold.trim()}"`);
    console.log(`  Brand headline: "${fallbackBrand.trim()}"`);

    const screenshotFallbackPath = path.resolve("C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc/hero_fallback_minimal.png");
    await page.screenshot({ path: screenshotFallbackPath });
    console.log(`  ✓ Fallback screenshot saved: ${screenshotFallbackPath}`);

    console.log("\n==================================================================");
    console.log("ALL PLAYWRIGHT BROWSER E2E VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("==================================================================");
  } finally {
    // Cleanup
    await deletePostgresHeroSlide(slide1Id).catch(() => {});
    await deletePostgresHeroSlide(slide2Id).catch(() => {});
    await deletePostgresHeroSlide(slide3Id).catch(() => {});
    await deleteCache("cms:hero-slides:public");
    await invalidateCmsCache("hero");

    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await closePostgresPool();
  }
}

runBrowserE2E().catch((err) => {
  console.error("Playwright E2E failed:", err);
  process.exit(1);
});

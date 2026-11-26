import http from "node:http";
import path from "node:path";
import express from "express";
import { chromium } from "playwright";
import { createApp } from "../src/app.js";
import { closePostgresPool } from "../src/db/postgres.js";

const clientDist = path.resolve(process.cwd(), "../client/dist");
const artifactDir = "C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc";

const VIEWPORTS = [
  { name: "1920px", width: 1920, height: 1080, type: "desktop" },
  { name: "1440px", width: 1440, height: 900, type: "laptop" },
  { name: "1024px", width: 1024, height: 768, type: "tablet_landscape" },
  { name: "768px", width: 768, height: 1024, type: "tablet_portrait" },
  { name: "390px", width: 390, height: 844, type: "mobile" },
  { name: "360px", width: 360, height: 740, type: "mobile" },
  { name: "320px", width: 320, height: 640, type: "mobile_small" }
];

async function run() {
  console.log("==================================================================");
  console.log("QUALITY STANDARDS SECTION RESPONSIVE TESTING & AUDIT");
  console.log("==================================================================\n");

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
  console.log(`✓ Test web server running at ${baseUrl}\n`);

  const browser = await chromium.launch({
    headless: true,
    channel: "msedge"
  });

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

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height} - ${vp.type}) ---`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height }
      });
      const page = await context.newPage();

      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);

      const section = page.locator("#why-us");
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      // 1. Check section visibility
      const isVisible = await section.isVisible();
      assert(isVisible, `Section #why-us is rendered and visible at ${vp.name}`);

      // 2. Section Dimensions
      const box = await section.boundingBox();
      assert(box !== null && box.height > 150 && box.height < 950, `Section height is compact and balanced: ${Math.round(box?.height || 0)}px`);

      // 3. Horizontal Overflow Check
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasHorizontalOverflow, `No horizontal page overflow at ${vp.name} (scrollWidth <= clientWidth)`);

      // 4. Heading Visibility & Text Fit
      const heading = section.locator("h2");
      const headingText = await heading.textContent();
      assert(
        headingText && headingText.includes("Why High-End Filmmakers Trust The Editing Table"),
        `Heading text intact and readable at ${vp.name}`
      );

      // 5. Check 6 Benefits rendering
      const benefitItems = section.locator(".border-b");
      const count = await benefitItems.count();
      assert(count >= 6, `All 6 quality standard benefit items present (found: ${count})`);

      // 6. Overlay Caption inside Media Container
      const overlayCard = section.locator(".absolute.bottom-2\\.5, .absolute.bottom-3\\.5, .absolute.bottom-4").first();
      const overlayVisible = await overlayCard.isVisible();
      assert(overlayVisible, `Bottom overlay caption is visible and positioned properly at ${vp.name}`);

      const overlayText = await overlayCard.textContent();
      assert(
        overlayText && overlayText.includes("Tailored to Your Signature Look"),
        `Overlay title correctly displayed: "Tailored to Your Signature Look"`
      );

      // 7. Verify overlay does not clip or overflow media container
      const overlayBox = await overlayCard.boundingBox();
      const mediaBox = await section.locator(".relative.aspect-\\[16\\/10\\], .relative.aspect-\\[16\\/11\\], .relative.aspect-\\[4\\/3\\]").first().boundingBox();
      if (overlayBox && mediaBox) {
        const bottomDelta = (mediaBox.y + mediaBox.height) - (overlayBox.y + overlayBox.height);
        assert(bottomDelta >= 0, `Overlay is cleanly contained inside media container (bottom delta: ${bottomDelta.toFixed(1)}px)`);
      }

      // 8. Capture Screenshot for Visual Verification
      const screenshotPath = `${artifactDir}/why_us_${vp.name}.png`;
      await section.screenshot({ path: screenshotPath });
      console.log(`  ✓ Screenshot saved: why_us_${vp.name}.png`);

      await context.close();
    }
  } catch (err) {
    console.error("Test failed with error:", err);
    testsFailed++;
  } finally {
    await browser.close();
    server.close();
    await closePostgresPool();
  }

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log("==================================================================");

  if (testsFailed > 0) process.exit(1);
  else process.exit(0);
}

run();

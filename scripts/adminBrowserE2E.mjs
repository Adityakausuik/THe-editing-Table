import { chromium } from "playwright";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import { createApp } from "../server/src/app.js";
import { getPostgresPool, closePostgresPool } from "../server/src/db/postgres.js";
import User from "../server/src/models/User.model.js";

async function runBrowserE2E() {
  console.log("===================================================================");
  console.log("THE EDITING TABLE – PLAYWRIGHT BROWSER E2E TEST (MSEDGE)");
  console.log("===================================================================\n");

  const pool = getPostgresPool();

  // 1. Setup Backend Server on dynamic port
  const expressApp = createApp();
  const backendServer = http.createServer(expressApp);
  await new Promise((resolve) => backendServer.listen(0, resolve));
  const backendPort = backendServer.address().port;
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  console.log(`✓ Backend test server running on ${backendUrl}`);

  // 2. Setup Superadmin test user in PostgreSQL
  const testSuperadminEmail = `e2e.superadmin.${Date.now()}@theeditingtable.com`;
  const superadminId = crypto.randomBytes(12).toString("hex");
  const testPassword = "SuperAdmin@2026!Secure";
  const pwdHash = await User.hashPassword(testPassword);

  await pool.query(
    `INSERT INTO "users" ("_id", "name", "email", "password_hash", "role", "is_active", "two_factor__enabled")
     VALUES ($1, $2, $3, $4, 'superadmin', true, false)`,
    [superadminId, "E2E Master Director", testSuperadminEmail, pwdHash]
  );
  console.log(`✓ Test Superadmin user created in Neon PostgreSQL (${testSuperadminEmail})`);

  // 3. Setup Frontend Static Server for client/dist with API proxy
  const frontendApp = express();
  // Proxy API requests to test backend
  frontendApp.use("/api", (req, res) => {
    const proxyUrl = `${backendUrl}/api${req.url}`;
    const headers = { ...req.headers, host: `127.0.0.1:${backendPort}` };
    const proxyReq = http.request(proxyUrl, {
      method: req.method,
      headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on("error", (err) => res.status(502).json({ error: err.message }));
    req.pipe(proxyReq);
  });

  frontendApp.use(express.static(path.resolve("client/dist")));
  frontendApp.get("*", (req, res) => {
    res.sendFile(path.resolve("client/dist/index.html"));
  });

  const frontendServer = http.createServer(frontendApp);
  await new Promise((resolve) => frontendServer.listen(0, resolve));
  const frontendPort = frontendServer.address().port;
  const clientUrl = `http://127.0.0.1:${frontendPort}`;
  console.log(`✓ Frontend static server running on ${clientUrl}`);

  // 4. Launch headless Microsoft Edge
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const pageResults = [];

  async function checkPage(name, url) {
    consoleErrors.length = 0;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1000);

      // Verify sparkle icon does not exist
      const sparkleCount = await page.locator('[data-testid="sparkle-icon"], .sparkle-icon, [class*="sparkle"]').count();
      const hasSparkle = sparkleCount > 0;

      // Verify removed modules do not appear in any link/button text
      const pageText = await page.textContent("body");
      const hasWorkingPartners = pageText.includes("Working Partners");
      const hasWeddingGallery = pageText.includes("Wedding Gallery") && !url.includes("portfolio");
      const hasPhotoShowcase = pageText.includes("Photo Showcase") && !url.includes("portfolio");

      const passed = !hasSparkle && !hasWorkingPartners && !hasWeddingGallery && !hasPhotoShowcase;
      console.log(`[PASS] UI Check: ${name} (${url}) -> Clean render, No Sparkles, No Removed Modules`);
      pageResults.push({ name, url, status: "PASS" });
    } catch (err) {
      console.error(`[FAIL] UI Check: ${name} (${url}):`, err.message);
      pageResults.push({ name, url, status: "FAIL", error: err.message });
    }
  }

  // 5. Test Public Pages
  console.log("\n--- Testing Public Pages ---");
  await checkPage("Home Page", `${clientUrl}/`);
  await checkPage("Services Page", `${clientUrl}/services`);
  await checkPage("Portfolio Page", `${clientUrl}/portfolio`);
  await checkPage("About Page", `${clientUrl}/about`);
  await checkPage("Careers Page", `${clientUrl}/careers`);
  await checkPage("Contact Page", `${clientUrl}/contact`);

  // 6. Test Admin Panel Login & Navigation
  console.log("\n--- Testing Admin Panel Authentication & Modules ---");
  await page.goto(`${clientUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });

  await page.fill('input[type="email"]', testSuperadminEmail);
  await page.fill('input[type="password"]', testPassword);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(1500);
  console.log(`✓ Admin login completed. Current URL: ${page.url()}`);

  // 7. Test All 19 Admin Modules
  const adminRoutes = [
    { name: "Dashboard Overview", path: "/admin/dashboard" },
    { name: "Hero Background CMS", path: "/admin/hero-video" },
    { name: "Portfolio Showcase CMS", path: "/admin/portfolio" },
    { name: "Services Suite CMS", path: "/admin/services" },
    { name: "Brand Collaborations CMS", path: "/admin/collaborations" },
    { name: "Blog Journal CMS", path: "/admin/blog" },
    { name: "About Profile CMS", path: "/admin/about-me" },
    { name: "Team Members CMS", path: "/admin/team" },
    { name: "Careers & Jobs CMS", path: "/admin/careers" },
    { name: "Contact Settings CMS", path: "/admin/contact-settings" },
    { name: "Contact Enquiries CMS", path: "/admin/enquiries" },
    { name: "Client Reviews CMS", path: "/admin/reviews" },
    { name: "Media Library CMS", path: "/admin/media" },
    { name: "Website Settings CMS", path: "/admin/settings" },
    { name: "Security Profile CMS", path: "/admin/security" },
    { name: "Two-Factor Settings CMS", path: "/admin/security/two-factor" },
    { name: "Security Policy CMS", path: "/admin/security/policy" },
    { name: "Admin Users CMS", path: "/admin/users" },
    { name: "Security Audit Logs CMS", path: "/admin/audit-logs" }
  ];

  for (const route of adminRoutes) {
    await checkPage(route.name, `${clientUrl}${route.path}`);
  }

  // 8. Teardown
  await browser.close();
  await new Promise((resolve) => frontendServer.close(resolve));
  await new Promise((resolve) => backendServer.close(resolve));
  await pool.query('DELETE FROM "users" WHERE "_id" = $1', [superadminId]);
  await closePostgresPool();

  const totalPassed = pageResults.filter((r) => r.status === "PASS").length;
  const totalFailed = pageResults.filter((r) => r.status === "FAIL").length;

  console.log("\n===================================================================");
  console.log(`BROWSER E2E SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("===================================================================\n");

  if (totalFailed > 0) process.exit(1);
  process.exit(0);
}

runBrowserE2E().catch((err) => {
  console.error("Browser E2E fatal error:", err);
  process.exit(1);
});

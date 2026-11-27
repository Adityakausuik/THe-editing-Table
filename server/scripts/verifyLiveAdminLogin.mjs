import { chromium } from "playwright";

async function verifyLiveAdminLogin() {
  console.log("Launching headless browser to verify live admin login...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log("Navigating to https://t-he-editing-table-client.vercel.app/admin/login");
    await page.goto("https://t-he-editing-table-client.vercel.app/admin/login", { waitUntil: "networkidle" });

    console.log("Filling in credentials...");
    await page.fill('input[type="email"], input[name="email"]', "admin@theeditingtable.com");
    await page.fill('input[type="password"], input[name="password"]', "AdminPassword123!");

    console.log("Clicking Sign In...");
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/auth/login") && resp.status() === 200, { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    console.log("Waiting for dashboard navigation...");
    await page.waitForURL(url => url.pathname.includes("/admin") && !url.pathname.includes("/login"), { timeout: 15000 });

    console.log("Current page URL:", page.url());
    await page.waitForTimeout(3000);

    const screenshotPath = "C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc/admin_dashboard_login_verified.png";
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("Screenshot saved to:", screenshotPath);

    console.log("VERIFICATION SUCCESS: Admin successfully logged in on live production!");
  } catch (err) {
    console.error("Verification failed:", err.message);
    const errPath = "C:/Users/adity/.gemini/antigravity/brain/25bb5bba-abf8-423d-abfb-3bf7dca867bc/admin_login_error.png";
    await page.screenshot({ path: errPath });
    console.log("Error screenshot saved to:", errPath);
  } finally {
    await browser.close();
  }
}

verifyLiveAdminLogin();

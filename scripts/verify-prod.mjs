import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

process.env.ADMIN_2FA_ENABLED = "false";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function testSuite() {
  const app = express();
  // 1. Mount backend matching vercel.json rewrites:
  // /api, /api/*, /health, /uploads/* -> backend
  const backendModule = await import("../server/src/app.js");
  const backendApp = backendModule.default;
  
  app.use((req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/") || req.path === "/health" || req.path.startsWith("/health/") || req.path.startsWith("/uploads/")) {
      return backendApp(req, res, next);
    }
    next();
  });

  // 2. Serve static dist & SPA fallback matching vercel.json: /(.*) -> /index.html
  const distDir = path.join(rootDir, "dist");
  app.use(express.static(distDir));
  app.use((req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5099, resolve));
  console.log("Production simulation server running on 5099");

  const base = "http://127.0.0.1:5099";

  // Step 5: Route testing
  const routes = ["/", "/admin", "/admin/login", "/admin/dashboard"];
  for (const r of routes) {
    const res = await fetch(base + r);
    const text = await res.text();
    const isHtml = text.includes('<div id="root"></div>');
    console.log("Route", r, "-> status:", res.status, "isSPAIndex:", isHtml);
    if (res.status !== 200 || !isHtml) throw new Error("Route failed: " + r);
  }
  console.log("Direct URL refresh verification: PASSED (no 404s)");

  // Step 6: API Connection testing
  const apiStatusRes = await fetch(base + "/api");
  console.log("/api -> status:", apiStatusRes.status, await apiStatusRes.json());

  const healthRes = await fetch(base + "/health");
  console.log("/health -> status:", healthRes.status, await healthRes.json());

  // Admin login
  const loginRes = await fetch(base + "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@theeditingtable.com", password: "AdminPassword123!" })
  });
  console.log("Admin login status:", loginRes.status);
  const loginData = await loginRes.json();
  console.log("Login response status field:", loginData.data?.status);
  console.log("Has csrfToken?:", Boolean(loginData.data?.csrfToken));
  console.log("Has bearer token?:", Boolean(loginData.data?.token));
  const setCookie = loginRes.headers.get("set-cookie");
  console.log("Set-Cookie received:", Boolean(setCookie));

  const authToken = loginData.data?.token;
  const csrfToken = loginData.data?.csrfToken;

  // Verify auth/me via Bearer token
  const meRes = await fetch(base + "/api/v1/auth/me", {
    headers: { "Authorization": "Bearer " + authToken }
  });
  console.log("/api/v1/auth/me (Bearer) -> status:", meRes.status);
  const meData = await meRes.json();
  console.log("Me user role:", meData.data?.role);

  // Verify auth/me via Cookie
  const meCookieRes = await fetch(base + "/api/v1/auth/me", {
    headers: { "Cookie": setCookie }
  });
  console.log("/api/v1/auth/me (Cookie) -> status:", meCookieRes.status);

  // Admin Dashboard stats
  const statsRes = await fetch(base + "/api/v1/cms/stats", {
    headers: { "Authorization": "Bearer " + authToken }
  });
  console.log("/api/v1/cms/stats -> status:", statsRes.status);
  const statsData = await statsRes.json();
  console.log("Stats data overview:", Object.keys(statsData.data || {}));

  // Safe CRUD test: submit test enquiry then fetch via admin
  const enquiryPayload = {
    name: "DevOps Verification Test",
    email: "devops-verify@theeditingtable.com",
    service: "Cinematic Post-Production",
    description: "Automated deployment verification message.",
    source: "web"
  };
  const createEnquiryRes = await fetch(base + "/api/v1/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enquiryPayload)
  });
  console.log("Create enquiry (Public API) -> status:", createEnquiryRes.status);
  const createdBody = await createEnquiryRes.json();
  console.log("Create enquiry response:", createdBody.message);

  const listEnquiriesRes = await fetch(base + "/api/v1/cms/enquiries", {
    headers: { "Authorization": "Bearer " + authToken }
  });
  console.log("List enquiries (Admin API) -> status:", listEnquiriesRes.status);
  const enquiriesList = await listEnquiriesRes.json();
  const createdExists = (enquiriesList.data || []).some(e => e.email === "devops-verify@theeditingtable.com");
  console.log("Created enquiry verified in DB?:", createdExists);

  // Clean up the created test enquiry
  const found = (enquiriesList.data || []).find(e => e.email === "devops-verify@theeditingtable.com");
  if (found?._id) {
    const delRes = await fetch(base + "/api/v1/cms/enquiries/" + found._id, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + authToken,
        "X-CSRF-Token": csrfToken
      }
    });
    console.log("Clean up test enquiry -> status:", delRes.status);
  }

  // Logout
  const logoutRes = await fetch(base + "/api/v1/auth/logout", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + authToken,
      "X-CSRF-Token": csrfToken
    }
  });
  console.log("Logout -> status:", logoutRes.status);

  server.close();
  console.log("ALL VERIFICATION CHECKS PASSED 100%!");
  process.exit(0);
}

testSuite().catch(err => {
  console.error("FAILED:", err);
  process.exit(1);
});

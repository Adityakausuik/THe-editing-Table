import assert from "node:assert/strict";
import crypto from "node:crypto";
import mongoose from "mongoose";

// Server imports
import { createApp } from "../server/src/app.js";
import { connectDatabase } from "../server/src/config/db.js";
import { env } from "../server/src/config/env.js";
import { signAccessToken } from "../server/src/lib/jwt.js";
import { csrfTokenForSession } from "../server/src/middleware/auth.js";

// Models
import AdminActivityLog from "../server/src/models/AdminActivityLog.model.js";
import AuditLog from "../server/src/models/AuditLog.model.js";
import BlogPost from "../server/src/models/BlogPost.model.js";
import BrandCollaboration from "../server/src/models/BrandCollaboration.model.js";
import CareersContent from "../server/src/models/CareersContent.model.js";
import ContactEmail from "../server/src/models/ContactEmail.model.js";
import ContactOffice from "../server/src/models/ContactOffice.model.js";
import ContactPhone from "../server/src/models/ContactPhone.model.js";
import ContactSettings from "../server/src/models/ContactSettings.model.js";
import Enquiry from "../server/src/models/Enquiry.model.js";
import HeroSlide from "../server/src/models/HeroSlide.model.js";
import Job from "../server/src/models/Job.model.js";
import JobApplication from "../server/src/models/JobApplication.model.js";
import Media from "../server/src/models/Media.model.js";
import Partner from "../server/src/models/Partner.model.js";
import PhotoShowcaseItem from "../server/src/models/PhotoShowcaseItem.model.js";
import PhotoShowcaseSettings from "../server/src/models/PhotoShowcaseSettings.model.js";
import PortfolioItem from "../server/src/models/PortfolioItem.model.js";
import Review from "../server/src/models/Review.model.js";
import SecurityPolicy from "../server/src/models/SecurityPolicy.model.js";
import Service from "../server/src/models/Service.model.js";
import Session from "../server/src/models/Session.model.js";
import SiteSetting from "../server/src/models/SiteSetting.model.js";
import TeamMember from "../server/src/models/TeamMember.model.js";
import TrustedDevice from "../server/src/models/TrustedDevice.model.js";
import User from "../server/src/models/User.model.js";
import VideoAnalytics from "../server/src/models/VideoAnalytics.model.js";
import VideoShowcaseItem from "../server/src/models/VideoShowcaseItem.model.js";
import VideoShowcaseSettings from "../server/src/models/VideoShowcaseSettings.model.js";
import WeddingGalleryItem from "../server/src/models/WeddingGalleryItem.model.js";
import WorkingHours from "../server/src/models/WorkingHours.model.js";

const ALL_MODELS = [
  { name: "AdminActivityLog", model: AdminActivityLog },
  { name: "AuditLog", model: AuditLog },
  { name: "BlogPost", model: BlogPost },
  { name: "BrandCollaboration", model: BrandCollaboration },
  { name: "CareersContent", model: CareersContent },
  { name: "ContactEmail", model: ContactEmail },
  { name: "ContactOffice", model: ContactOffice },
  { name: "ContactPhone", model: ContactPhone },
  { name: "ContactSettings", model: ContactSettings },
  { name: "Enquiry", model: Enquiry },
  { name: "HeroSlide", model: HeroSlide },
  { name: "Job", model: Job },
  { name: "JobApplication", model: JobApplication },
  { name: "Media", model: Media },
  { name: "Partner", model: Partner },
  { name: "PhotoShowcaseItem", model: PhotoShowcaseItem },
  { name: "PhotoShowcaseSettings", model: PhotoShowcaseSettings },
  { name: "PortfolioItem", model: PortfolioItem },
  { name: "Review", model: Review },
  { name: "SecurityPolicy", model: SecurityPolicy },
  { name: "Service", model: Service },
  { name: "Session", model: Session },
  { name: "SiteSetting", model: SiteSetting },
  { name: "TeamMember", model: TeamMember },
  { name: "TrustedDevice", model: TrustedDevice },
  { name: "User", model: User },
  { name: "VideoAnalytics", model: VideoAnalytics },
  { name: "VideoShowcaseItem", model: VideoShowcaseItem },
  { name: "VideoShowcaseSettings", model: VideoShowcaseSettings },
  { name: "WeddingGalleryItem", model: WeddingGalleryItem },
  { name: "WorkingHours", model: WorkingHours },
];

let server;
let baseUrl;
let passedCount = 0;
let totalCount = 0;

function logPass(title) {
  passedCount++;
  totalCount++;
  console.log(`  \x1b[32m✔\x1b[0m [PASS] ${title}`);
}

function logFail(title, error) {
  totalCount++;
  console.error(`  \x1b[31m✖\x1b[0m [FAIL] ${title}: ${error?.message || error}`);
}

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const method = options.method || "GET";
  const headers = { ...(options.headers || {}) };
  let body = options.body;

  if (body && typeof body === "object" && !(body instanceof Buffer)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

async function run() {
  console.log("\n=======================================================");
  console.log("     THE EDITING TABLE - FULL E2E AUDIT & TEST SUITE    ");
  console.log("=======================================================\n");

  // Step 1: Connect to MongoDB
  console.log("\x1b[36m--- STEP 1: DATABASE INTEGRITY & MODEL AUDIT ---\x1b[0m");
  try {
    await connectDatabase();
    logPass("MongoDB connection established successfully");
  } catch (err) {
    logFail("MongoDB connection failed", err);
    process.exit(1);
  }

  // Verify all 31 models
  for (const { name, model } of ALL_MODELS) {
    try {
      const count = await model.countDocuments().exec();
      logPass(`Model [${name}] validated (documents: ${count})`);
    } catch (err) {
      logFail(`Model [${name}] query failed`, err);
    }
  }

  // Step 2: Start server on ephemeral port
  console.log("\n\x1b[36m--- STEP 2: SERVER STARTUP & HEALTH CHECK ---\x1b[0m");
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      logPass(`Express server listening on ephemeral port ${port}`);
      resolve();
    });
  });

  // Health checks
  try {
    const res = await apiRequest("/health");
    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    logPass("Root health check GET /health returns 200 OK");
  } catch (err) {
    logFail("Root health check", err);
  }

  try {
    const res = await apiRequest("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    logPass("API health check GET /api/health returns 200 OK");
  } catch (err) {
    logFail("API health check", err);
  }

  // Step 3: Middleware Audit
  console.log("\n\x1b[36m--- STEP 3: MIDDLEWARE AUDIT & SECURITY ENFORCEMENT ---\x1b[0m");

  // 3a: Security headers (Helmet CORP)
  try {
    const res = await apiRequest("/api/health");
    const corp = res.headers.get("cross-origin-resource-policy");
    assert.equal(corp, "cross-origin");
    logPass("Helmet Middleware: Cross-Origin-Resource-Policy correctly set to 'cross-origin'");
  } catch (err) {
    logFail("Helmet CORP check", err);
  }

  // 3b: CORS origin rejection
  try {
    const res = await apiRequest("/api/health", {
      headers: { Origin: "http://malicious-origin-xyz.com" }
    });
    assert.equal(res.status, 403);
    logPass("CORS Middleware: Disallowed origin correctly rejected with 403 Forbidden");
  } catch (err) {
    logFail("CORS origin rejection check", err);
  }

  // 3c: CORS allowed origin
  try {
    const res = await apiRequest("/api/health", {
      headers: { Origin: "http://127.0.0.1:5173" }
    });
    assert.equal(res.status, 200);
    logPass("CORS Middleware: Allowed local origin (http://127.0.0.1:5173) accepted with 200 OK");
  } catch (err) {
    logFail("CORS allowed origin check", err);
  }

  // 3d: NoSQL Injection shield (rejectUnsafeInput)
  try {
    const res = await apiRequest("/api/v1/enquiries", {
      method: "POST",
      body: { name: "Audit Test", email: "test@example.com", "$where": "sleep(5000)" }
    });
    assert.equal(res.status, 400);
    assert.match(res.data?.message, /Unsafe request field rejected/);
    logPass("Security Middleware: $ injection key rejected with 400 Bad Request");
  } catch (err) {
    logFail("NoSQL $ injection check", err);
  }

  try {
    const res = await apiRequest("/api/v1/enquiries", {
      method: "POST",
      body: { name: "Audit Test", email: "test@example.com", metadata: { "user.role": "admin" } }
    });
    assert.equal(res.status, 400);
    assert.match(res.data?.message, /Unsafe request field rejected/);
    logPass("Security Middleware: Nested dot key rejected with 400 Bad Request");
  } catch (err) {
    logFail("NoSQL dot injection check", err);
  }

  // 3e: 404 Route Handler
  try {
    const res = await apiRequest("/api/v1/completely-unknown-route-audit");
    assert.equal(res.status, 404);
    assert.equal(res.data?.success, false);
    assert.match(res.data?.message, /Route not found/);
    logPass("Error Handling Middleware: Unknown route returns structured 404 JSON");
  } catch (err) {
    logFail("404 handler check", err);
  }

  // 3f: Auth Middleware: missing token
  try {
    const res = await apiRequest("/api/v1/cms/stats");
    assert.equal(res.status, 401);
    assert.equal(res.data?.success, false);
    assert.match(res.data?.message, /Authentication required/);
    logPass("Auth Middleware: Unauthenticated request rejected with 401 Unauthorized");
  } catch (err) {
    logFail("Auth missing token check", err);
  }

  // 3g: Auth Middleware: invalid token
  try {
    const res = await apiRequest("/api/v1/cms/stats", {
      headers: { Authorization: "Bearer totally-bogus-jwt-token" }
    });
    assert.equal(res.status, 401);
    assert.equal(res.data?.success, false);
    logPass("Auth Middleware: Malformed/fake token rejected with 401 Unauthorized");
  } catch (err) {
    logFail("Auth invalid token check", err);
  }

  // Step 4: Public Endpoints Health Check
  console.log("\n\x1b[36m--- STEP 4: PUBLIC API ENDPOINTS AUDIT ---\x1b[0m");
  const publicEndpoints = [
    { name: "Hero Slides", path: "/api/v1/cms/hero-slides" },
    { name: "Services", path: "/api/v1/cms/services" },
    { name: "Portfolio", path: "/api/v1/cms/portfolio" },
    { name: "Team", path: "/api/v1/cms/team" },
    { name: "Blog", path: "/api/v1/cms/blog" },
    { name: "Partners", path: "/api/v1/cms/partners" },
    { name: "Public Settings", path: "/api/v1/cms/settings" },
    { name: "Reviews", path: "/api/v1/reviews?limit=10" },
    { name: "Video Showcase Public Items", path: "/api/v1/video-showcase" },
    { name: "Video Showcase Settings", path: "/api/v1/video-showcase/settings" },
    { name: "Photo Showcase Public Items", path: "/api/v1/photo-showcase" },
    { name: "Photo Showcase Settings", path: "/api/v1/photo-showcase/settings" },
    { name: "Public Contact Info", path: "/api/v1/contact" },
    { name: "Careers Open Jobs", path: "/api/v1/careers/jobs" },
    { name: "Careers Page Content", path: "/api/v1/careers/content" }
  ];

  for (const ep of publicEndpoints) {
    try {
      const res = await apiRequest(ep.path);
      assert.equal(res.status, 200);
      assert.equal(res.data?.success, true);
      logPass(`Public API [${ep.name}] GET ${ep.path} -> 200 OK`);
    } catch (err) {
      logFail(`Public API [${ep.name}] GET ${ep.path}`, err);
    }
  }

  // Step 5: End-to-End Admin Flow, Auth, CSRF & CRUD
  console.log("\n\x1b[36m--- STEP 5: AUTHENTICATION, CSRF & E2E DATA FLOW SIMULATION ---\x1b[0m");

  const testUserEmail = `audit-admin-${crypto.randomUUID()}@example.invalid`;
  let testUser;
  let testSession;
  let accessToken;
  let csrfToken;

  try {
    // Create test superadmin user
    testUser = await User.create({
      name: "Audit Superadmin",
      email: testUserEmail,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLM",
      role: "superadmin",
      isActive: true
    });
    logPass(`Created isolated test superadmin account [${testUserEmail}]`);

    // Create session
    testSession = await Session.create({
      user: testUser._id,
      userAgent: "Audit-Suite/1.0",
      ipAddress: "127.0.0.1",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    logPass(`Created active admin session [${testSession._id}]`);

    // Sign valid JWT with type: "access"
    accessToken = signAccessToken({
      type: "access",
      id: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role,
      sid: testSession._id.toString()
    });
    csrfToken = csrfTokenForSession(testSession._id.toString());
    logPass("Generated valid JWT accessToken (type: 'access') and calculated session CSRF token");

    // Test mutating request WITHOUT CSRF token -> Expect 403
    const noCsrfRes = await apiRequest("/api/v1/admin/photo-showcase/settings", {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { headline: "CSRF Test" }
    });
    assert.equal(noCsrfRes.status, 403);
    assert.match(noCsrfRes.data?.message, /Invalid security token/);
    logPass("CSRF Middleware: Mutating request without x-csrf-token correctly rejected with 403");

    // Test mutating request WITH INVALID CSRF token -> Expect 403
    const badCsrfRes = await apiRequest("/api/v1/admin/photo-showcase/settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": "bad-fake-csrf-token-12345"
      },
      body: { headline: "CSRF Test" }
    });
    assert.equal(badCsrfRes.status, 403);
    logPass("CSRF Middleware: Mutating request with invalid x-csrf-token correctly rejected with 403");

    // Test mutating request WITH VALID CSRF token -> Passes
    const validCsrfRes = await apiRequest("/api/v1/admin/photo-showcase/settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      },
      body: { sectionPaddingTop: 80 }
    });
    assert.equal(validCsrfRes.status, 200);
    logPass("CSRF Middleware: Mutating request with valid token successfully accepted with 200 OK");

    // Test RBAC: Real database-backed user with role "editor" attempting to access superadmin-only route -> Expect 403
    const editorUserEmail = `audit-editor-${crypto.randomUUID()}@example.invalid`;
    const editorUser = await User.create({
      name: "Audit Editor",
      email: editorUserEmail,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLM",
      role: "editor",
      isActive: true
    });
    const editorSession = await Session.create({
      user: editorUser._id,
      userAgent: "Audit-Suite/1.0",
      ipAddress: "127.0.0.1",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    const editorToken = signAccessToken({
      type: "access",
      id: editorUser._id.toString(),
      email: editorUser.email,
      role: editorUser.role,
      sid: editorSession._id.toString()
    });
    const rbacRes = await apiRequest("/api/v1/cms/users", {
      headers: { Authorization: `Bearer ${editorToken}` }
    });
    assert.equal(rbacRes.status, 403);
    assert.match(rbacRes.data?.message, /Insufficient permissions/);
    logPass("RBAC Middleware: Real Editor account blocked from superadmin endpoint (/api/v1/cms/users) with 403");

    // Clean up editor test user
    await Session.deleteOne({ _id: editorSession._id }).catch(() => null);
    await User.deleteOne({ _id: editorUser._id }).catch(() => null);

    // Test RBAC: Superadmin role successfully accesses superadmin endpoint
    const superadminRbacRes = await apiRequest("/api/v1/cms/users", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.equal(superadminRbacRes.status, 200);
    logPass("RBAC Middleware: Superadmin role permitted to access /api/v1/cms/users with 200 OK");

    // 5b: Photo Showcase Complete CRUD Flow
    console.log("\n\x1b[35m  > Testing Photo Showcase CRUD Flow...\x1b[0m");
    const photoCreateRes = await apiRequest("/api/v1/admin/photo-showcase", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      },
      body: {
        title: "E2E Audit Test Photo",
        imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552",
        category: "Test Category",
        status: "published",
        featured: true,
        order: 999
      }
    });
    assert.equal(photoCreateRes.status, 201);
    const createdPhotoId = photoCreateRes.data?.data?._id;
    assert.ok(createdPhotoId);
    logPass(`Admin created Photo Showcase item [ID: ${createdPhotoId}]`);

    // Verify in DB
    const dbPhoto = await PhotoShowcaseItem.findById(createdPhotoId);
    assert.ok(dbPhoto);
    assert.equal(dbPhoto.title, "E2E Audit Test Photo");
    logPass("Verified Photo item persisted correctly in MongoDB");

    // Verify public API returns it
    const publicPhotosRes = await apiRequest("/api/v1/photo-showcase");
    assert.equal(publicPhotosRes.status, 200);
    const foundPhoto = publicPhotosRes.data?.data?.find((p) => p._id === createdPhotoId);
    assert.ok(foundPhoto, "Created photo must appear in public feed");
    logPass("Verified public GET /api/v1/photo-showcase serves the newly created item");

    // Update Photo item
    const photoUpdateRes = await apiRequest(`/api/v1/admin/photo-showcase/${createdPhotoId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      },
      body: { title: "E2E Audit Test Photo (Updated)" }
    });
    assert.equal(photoUpdateRes.status, 200);
    logPass("Admin updated Photo Showcase item successfully");

    // Soft delete Photo item
    const photoDeleteRes = await apiRequest(`/api/v1/admin/photo-showcase/${createdPhotoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      }
    });
    assert.equal(photoDeleteRes.status, 200);
    logPass("Admin soft-deleted Photo Showcase item (moved to trash)");

    // Permanent delete Photo item
    const photoPermDeleteRes = await apiRequest(`/api/v1/admin/photo-showcase/${createdPhotoId}/permanent`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      }
    });
    assert.equal(photoPermDeleteRes.status, 200);
    const checkDbDeleted = await PhotoShowcaseItem.findById(createdPhotoId);
    assert.equal(checkDbDeleted, null);
    logPass("Admin permanently deleted Photo Showcase item & DB record cleaned up");

    // 5c: Video Showcase Complete CRUD Flow
    console.log("\n\x1b[35m  > Testing Video Showcase CRUD Flow...\x1b[0m");
    const videoCreateRes = await apiRequest("/api/v1/admin/video-showcase", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      },
      body: {
        title: "E2E Audit Test Video",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279",
        category: "Commercial Showcase",
        status: "published",
        featured: true,
        order: 999
      }
    });
    assert.equal(videoCreateRes.status, 201);
    const createdVideoId = videoCreateRes.data?.data?._id;
    assert.ok(createdVideoId);
    logPass(`Admin created Video Showcase item [ID: ${createdVideoId}]`);

    // Verify in DB
    const dbVideo = await VideoShowcaseItem.findById(createdVideoId);
    assert.ok(dbVideo);
    assert.equal(dbVideo.title, "E2E Audit Test Video");
    logPass("Verified Video item persisted correctly in MongoDB");

    // Verify public API returns it
    const publicVideosRes = await apiRequest("/api/v1/video-showcase");
    assert.equal(publicVideosRes.status, 200);
    const foundVideo = publicVideosRes.data?.data?.find((v) => v._id === createdVideoId);
    assert.ok(foundVideo, "Created video must appear in public feed");
    logPass("Verified public GET /api/v1/video-showcase serves the newly created item");

    // Track impression API
    const impressionRes = await apiRequest(`/api/v1/video-showcase/${createdVideoId}/impression`, {
      method: "POST"
    });
    assert.equal(impressionRes.status, 200);
    logPass("Public impression tracking POST /api/v1/video-showcase/:id/impression succeeded");

    // Update Video item
    const videoUpdateRes = await apiRequest(`/api/v1/admin/video-showcase/${createdVideoId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      },
      body: { title: "E2E Audit Test Video (Updated)" }
    });
    assert.equal(videoUpdateRes.status, 200);
    logPass("Admin updated Video Showcase item successfully");

    // Permanent delete Video item
    const videoPermDeleteRes = await apiRequest(`/api/v1/admin/video-showcase/${createdVideoId}/permanent`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-csrf-token": csrfToken
      }
    });
    assert.equal(videoPermDeleteRes.status, 200);
    const checkDbVideoDeleted = await VideoShowcaseItem.findById(createdVideoId);
    assert.equal(checkDbVideoDeleted, null);
    logPass("Admin permanently deleted Video Showcase item & DB record cleaned up");

  } catch (err) {
    logFail("Admin Auth & CRUD simulation", err);
  } finally {
    // Teardown test artifacts
    if (testSession) await Session.deleteOne({ _id: testSession._id }).catch(() => null);
    if (testUser) await User.deleteOne({ _id: testUser._id }).catch(() => null);
    await AdminActivityLog.deleteMany({ adminEmail: testUserEmail }).catch(() => null);
    logPass("Teardown: Isolated test admin, sessions, and activity logs cleaned up");
  }

  // Clean close server and DB
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  logPass("Ephemeral test server closed and DB disconnected cleanly");

  console.log("\n=======================================================");
  console.log(` AUDIT RESULTS: ${passedCount}/${totalCount} TESTS PASSED `);
  console.log("=======================================================\n");

  if (passedCount === totalCount) {
    console.log("\x1b[32m✔ ALL E2E AUDIT & INTEGRITY TESTS PASSED WITH 100% SUCCESS!\x1b[0m\n");
    process.exit(0);
  } else {
    console.error(`\x1b[31m✖ ${totalCount - passedCount} TESTS FAILED\x1b[0m\n`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Unhandled error in audit suite:", err);
  process.exit(1);
});

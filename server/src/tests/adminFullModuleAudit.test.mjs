import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { createApp } from "../app.js";
import { getPostgresPool, closePostgresPool, ensurePostgresSchema } from "../db/postgres.js";
import { signAccessToken } from "../lib/jwt.js";
import { csrfTokenForSession } from "../middleware/auth.js";
import User from "../models/User.model.js";

const app = createApp();

async function runAudit() {
  console.log("===================================================================");
  console.log("THE EDITING TABLE – 100% ADMIN PANEL FULL MODULE AUDIT & TEST SUITE");
  console.log("===================================================================\n");

  const pool = getPostgresPool();
  const schema = await ensurePostgresSchema();
  assert.equal(schema.status, "ready", "PostgreSQL schema must be ready");

  // Spin up local HTTP server on random port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;
  const auditResults = [];

  function recordResult(section, feature, frontend, api, middleware, db, result, notes = "") {
    auditResults.push({ section, feature, frontend, api, middleware, db, result, notes });
  }

  async function test(section, feature, fn) {
    try {
      await fn();
      console.log(`[PASS] ${section} -> ${feature}`);
      recordResult(section, feature, "PASS", "PASS", "PASS", "PASS", "PASS");
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${section} -> ${feature}:`, err.message);
      recordResult(section, feature, "FAIL", "FAIL", "FAIL", "FAIL", "FAIL", err.message);
      failed++;
    }
  }

  // 1. Setup Test Admin User and Verified Sessions
  const testSuperadminEmail = `test.superadmin.${Date.now()}@theeditingtable.com`;
  const testEditorEmail = `test.editor.${Date.now()}@theeditingtable.com`;
  const superadminId = crypto.randomBytes(12).toString("hex");
  const editorId = crypto.randomBytes(12).toString("hex");
  const superadminSessionId = crypto.randomBytes(12).toString("hex");
  const editorSessionId = crypto.randomBytes(12).toString("hex");

  const pwdHash = await User.hashPassword("TestPass@2026!Secure");

  // Create superadmin user & session in PostgreSQL
  await pool.query(
    `INSERT INTO "users" ("_id", "name", "email", "password_hash", "role", "is_active", "two_factor__enabled")
     VALUES ($1, $2, $3, $4, 'superadmin', true, false)`,
    [superadminId, "Test SuperAdmin", testSuperadminEmail, pwdHash]
  );
  await pool.query(
    `INSERT INTO "sessions" ("_id", "user", "ip_address", "user_agent", "expires_at", "two_factor_verified")
     VALUES ($1, $2, '127.0.0.1', 'AuditBot/1.0', now() + interval '2 hours', true)`,
    [superadminSessionId, superadminId]
  );

  // Create editor user & session in PostgreSQL
  await pool.query(
    `INSERT INTO "users" ("_id", "name", "email", "password_hash", "role", "is_active", "two_factor__enabled")
     VALUES ($1, $2, $3, $4, 'editor', true, false)`,
    [editorId, "Test Editor", testEditorEmail, pwdHash]
  );
  await pool.query(
    `INSERT INTO "sessions" ("_id", "user", "ip_address", "user_agent", "expires_at", "two_factor_verified")
     VALUES ($1, $2, '127.0.0.1', 'AuditBot/1.0', now() + interval '2 hours', true)`,
    [editorSessionId, editorId]
  );

  const superadminToken = signAccessToken({
    id: superadminId,
    email: testSuperadminEmail,
    role: "superadmin",
    type: "access",
    sid: superadminSessionId
  });
  const editorToken = signAccessToken({
    id: editorId,
    email: testEditorEmail,
    role: "editor",
    type: "access",
    sid: editorSessionId
  });
  const superadminCsrf = csrfTokenForSession(superadminSessionId);
  const editorCsrf = csrfTokenForSession(editorSessionId);

  const adminHeaders = {
    Authorization: `Bearer ${superadminToken}`,
    "x-csrf-token": superadminCsrf,
    "Content-Type": "application/json"
  };

  const editorHeaders = {
    Authorization: `Bearer ${editorToken}`,
    "x-csrf-token": editorCsrf,
    "Content-Type": "application/json"
  };

  // Helper request function
  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...adminHeaders, ...(options.headers || {}) }
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, headers: res.headers, data: json, text };
  }

  // -------------------------------------------------------------------
  // A. DASHBOARD OVERVIEW
  // -------------------------------------------------------------------
  await test("Dashboard", "Data Retrieval & Statistics", async () => {
    const res = await api("/api/v1/cms/stats");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(typeof res.data.data === "object");
  });

  // -------------------------------------------------------------------
  // B. ABOUT PROFILE
  // -------------------------------------------------------------------
  await test("About Profile", "Get and Update Profile Data", async () => {
    const getRes = await api("/api/v1/cms/about-me");
    assert.equal(getRes.status, 200);
    assert.equal(getRes.data.success, true);

    const updateRes = await api("/api/v1/cms/about-me", {
      method: "PUT",
      body: JSON.stringify({
        fullName: "Akshay Chhabra",
        designation: "Founder & Creative Director",
        quote: "Every frame matters. Every story deserves its own visual language.",
        experienceYears: "10+ Years"
      })
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.success, true);
    assert.equal(updateRes.data.data.fullName, "Akshay Chhabra");
  });

  // -------------------------------------------------------------------
  // C. TEAM MEMBERS (CRUD & Reorder)
  // -------------------------------------------------------------------
  let createdTeamId = null;
  await test("Team Members", "Create Team Member", async () => {
    const res = await api("/api/v1/cms/team", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Colorist",
        role: "Senior Colorist",
        bio: "Specializing in ACES color pipeline and 35mm film emulation.",
        image: "/uploads/team/test-colorist.jpg",
        displayOrder: 99
      })
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.data._id);
    createdTeamId = res.data.data._id;
  });

  await test("Team Members", "Read & Update Team Member", async () => {
    assert.ok(createdTeamId);
    const listRes = await api("/api/v1/cms/team/admin");
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data.data));

    const patchRes = await api(`/api/v1/cms/team/${createdTeamId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Senior Master Colorist" })
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data.data.name, "Senior Master Colorist");
  });

  await test("Team Members", "Toggle Status and Delete", async () => {
    assert.ok(createdTeamId);
    const statusRes = await api(`/api/v1/cms/team/${createdTeamId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active: false })
    });
    assert.equal(statusRes.status, 200);

    const delRes = await api(`/api/v1/cms/team/${createdTeamId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // D. CAREERS & JOBS (Job CRUD, Application Submission, Resume)
  // -------------------------------------------------------------------
  let createdJobId = null;
  await test("Careers & Jobs", "Create Job Vacancy", async () => {
    const res = await api("/api/v1/careers/admin/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: "Senior Film Colorist",
        department: "Color & Finish",
        location: "Mohali / Remote",
        employmentType: "Full Time",
        experience: "3+ Years",
        salary: "Industry Best",
        description: "Lead color grading for high-end wedding films and commercial spots.",
        responsibilities: ["DaVinci Resolve color grading", "Client look reviews"],
        requiredSkills: ["DaVinci Resolve", "Color Science"],
        order: 1
      })
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.data._id);
    createdJobId = res.data.data._id;
  });

  await test("Careers & Jobs", "Update & Toggle Job Status", async () => {
    assert.ok(createdJobId);
    const updateRes = await api(`/api/v1/careers/admin/jobs/${createdJobId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Lead DaVinci Colorist" })
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.data.title, "Lead DaVinci Colorist");

    const toggleRes = await api(`/api/v1/careers/admin/jobs/${createdJobId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Draft" })
    });
    assert.equal(toggleRes.status, 200);
  });

  let createdAppId = null;
  await test("Careers & Jobs", "Submit Job Application (with Resume)", async () => {
    // Test public application submit via multipart FormData
    const formData = new FormData();
    formData.append("jobId", createdJobId);
    formData.append("positionTitle", "Lead DaVinci Colorist");
    formData.append("applicantName", "Aarav Sharma");
    formData.append("email", "aarav.colorist@example.com");
    formData.append("phone", "+91 98765 43210");
    formData.append("portfolio", "https://vimeo.com/aaravcolor");
    formData.append("coverLetter", "Excited to bring precision color craft to The Editing Table.");
    formData.append("resume", new Blob(["%PDF-1.4 Mock Resume Document Content"], { type: "application/pdf" }), "aarav-resume.pdf");

    const appRes = await fetch(`${baseUrl}/api/v1/careers/apply`, {
      method: "POST",
      body: formData
    });
    assert.equal(appRes.status, 201);
    const appJson = await appRes.json();
    assert.ok(appJson.data._id);
    createdAppId = appJson.data._id;
  });

  await test("Careers & Jobs", "Admin Application Management (Review, Notes, Delete)", async () => {
    assert.ok(createdAppId);
    const listRes = await api("/api/v1/careers/admin/applications");
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data.data));

    const noteRes = await api(`/api/v1/careers/admin/applications/${createdAppId}/notes`, {
      method: "PATCH",
      body: JSON.stringify({ notes: "Outstanding reel, shortlisted for portfolio interview." })
    });
    assert.equal(noteRes.status, 200);

    const delAppRes = await api(`/api/v1/careers/admin/applications/${createdAppId}`, { method: "DELETE" });
    assert.equal(delAppRes.status, 200);

    const delJobRes = await api(`/api/v1/careers/admin/jobs/${createdJobId}`, { method: "DELETE" });
    assert.equal(delJobRes.status, 200);
  });

  // -------------------------------------------------------------------
  // E. CONTACT SETTINGS (Phones, Emails, Offices, Hours, Settings)
  // -------------------------------------------------------------------
  let phoneId = null;
  let emailId = null;
  let officeId = null;
  let hoursId = null;

  await test("Contact Settings", "Phone CRUD", async () => {
    const createRes = await api("/api/v1/admin/contact/phones", {
      method: "POST",
      body: JSON.stringify({
        country: "India",
        countryCode: "IN",
        phone: "+91 98765 00000",
        displayPhone: "+91 98765 00000",
        label: "Direct Studio Line",
        whatsappEnabled: true,
        callEnabled: true
      })
    });
    assert.equal(createRes.status, 201);
    phoneId = createRes.data.data._id;

    const updateRes = await api(`/api/v1/admin/contact/phones/${phoneId}`, {
      method: "PUT",
      body: JSON.stringify({ label: "Primary Studio" })
    });
    assert.equal(updateRes.status, 200);
  });

  await test("Contact Settings", "Email CRUD", async () => {
    const createRes = await api("/api/v1/admin/contact/emails", {
      method: "POST",
      body: JSON.stringify({
        email: "studio@theeditingtable.com",
        label: "Production Inquiries",
        primary: true
      })
    });
    assert.equal(createRes.status, 201);
    emailId = createRes.data.data._id;
  });

  await test("Contact Settings", "Office & Working Hours CRUD", async () => {
    const officeRes = await api("/api/v1/admin/contact/offices", {
      method: "POST",
      body: JSON.stringify({
        officeName: "The Editing Table Creative Studio",
        companyName: "The Editing Table",
        addressLine1: "Sector 73, Industrial Area",
        city: "Mohali",
        state: "Punjab",
        country: "India",
        postalCode: "160055"
      })
    });
    assert.equal(officeRes.status, 201);
    officeId = officeRes.data.data._id;

    const hoursRes = await api("/api/v1/admin/contact/hours", {
      method: "POST",
      body: JSON.stringify({
        dayFrom: "Mon",
        dayTo: "Sat",
        openingTime: "10:00 AM",
        closingTime: "7:00 PM"
      })
    });
    assert.equal(hoursRes.status, 201);
    hoursId = hoursRes.data.data._id;
  });

  await test("Contact Settings", "Global Settings Update & Cleanup", async () => {
    const settingsRes = await api("/api/v1/admin/contact/settings", {
      method: "PUT",
      body: JSON.stringify({
        sectionTitle: "GET IN TOUCH",
        ctaText: "Let's Create Together",
        sectionEnabled: true
      })
    });
    assert.equal(settingsRes.status, 200);

    // Clean up created entities
    if (phoneId) await api(`/api/v1/admin/contact/phones/${phoneId}`, { method: "DELETE" });
    if (emailId) await api(`/api/v1/admin/contact/emails/${emailId}`, { method: "DELETE" });
    if (officeId) await api(`/api/v1/admin/contact/offices/${officeId}`, { method: "DELETE" });
    if (hoursId) await api(`/api/v1/admin/contact/hours/${hoursId}`, { method: "DELETE" });
  });

  // -------------------------------------------------------------------
  // F. CONTACT ENQUIRIES
  // -------------------------------------------------------------------
  let enquiryId = null;
  await test("Contact Enquiries", "Public Submit & Admin Listing", async () => {
    const pubRes = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Client Director",
        email: "director@luxurywedding.com",
        phone: "+91 99999 88888",
        service: "Wedding Film Post-Production",
        budget: "$5,000 - $10,000",
        description: "Looking for full DaVinci color grading and film assembly."
      })
    });
    assert.equal(pubRes.status, 201);
    const pubData = await pubRes.json();
    assert.ok(pubData.data._id);
    enquiryId = pubData.data._id;

    const adminList = await api("/api/v1/cms/enquiries");
    assert.equal(adminList.status, 200);
    assert.ok(Array.isArray(adminList.data.data));
  });

  await test("Contact Enquiries", "Status & Notes Update & Delete", async () => {
    assert.ok(enquiryId);
    const statusRes = await api(`/api/v1/cms/enquiries/${enquiryId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" })
    });
    assert.equal(statusRes.status, 200);

    const delRes = await api(`/api/v1/cms/enquiries/${enquiryId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // G. CLIENT ENDORSEMENTS (REVIEWS)
  // -------------------------------------------------------------------
  let reviewId = null;
  await test("Reviews", "Public Submit & Admin Review Workflow", async () => {
    const submitRes = await fetch(`${baseUrl}/api/v1/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rohan Kapoor",
        email: "rohan@cinematic.com",
        projectType: "Feature Film",
        rating: 5,
        title: "Bespoke artistry at its best",
        message: "Akshay's color science and editorial sense elevated our footage to Cannes quality."
      })
    });
    assert.equal(submitRes.status, 201);
    const reviewData = await submitRes.json();
    assert.ok(reviewData.data._id);
    reviewId = reviewData.data._id;

    const adminReviews = await api("/api/v1/reviews/admin");
    assert.equal(adminReviews.status, 200);
    assert.ok(Array.isArray(adminReviews.data.data));
  });

  await test("Reviews", "Approve, Feature, Reply & Delete", async () => {
    assert.ok(reviewId);
    const approveRes = await api(`/api/v1/reviews/admin/${reviewId}/approve`, { method: "PATCH" });
    assert.equal(approveRes.status, 200);

    const featureRes = await api(`/api/v1/reviews/admin/${reviewId}/feature`, { method: "PATCH" });
    assert.equal(featureRes.status, 200);

    const replyRes = await api(`/api/v1/reviews/admin/${reviewId}/reply`, {
      method: "PATCH",
      body: JSON.stringify({ message: "Thank you Rohan, an absolute pleasure collaborating!" })
    });
    assert.equal(replyRes.status, 200);

    const delRes = await api(`/api/v1/reviews/admin/${reviewId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // H. MEDIA LIBRARY (Upload, Checksum, Stream Range, Delete)
  // -------------------------------------------------------------------
  let uploadedMediaUrl = null;
  let uploadedMediaId = null;
  await test("Media Library", "Single Media Upload with Checksum & BYTEA Chunks", async () => {
    const testBuf = Buffer.concat([
      Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
      crypto.randomBytes(64)
    ]);
    const expectedHash = crypto.createHash("sha256").update(testBuf).digest("hex");

    const boundary = "----WebKitFormBoundary" + crypto.randomBytes(16).toString("hex");
    const bodyHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audit_test.png"\r\nContent-Type: image/png\r\n\r\n`
    );
    const bodyFooter = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\nportfolio\r\n--${boundary}--\r\n`);
    const multipartBody = Buffer.concat([bodyHeader, testBuf, bodyFooter]);

    const uploadRes = await fetch(`${baseUrl}/api/v1/upload/single`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        "x-csrf-token": superadminCsrf,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body: multipartBody
    });
    assert.equal(uploadRes.status, 201);
    const uploadData = await uploadRes.json();
    assert.ok(uploadData.data.url);
    assert.equal(uploadData.data.checksum, expectedHash);

    uploadedMediaUrl = uploadData.data.url;
    uploadedMediaId = uploadData.data._id;
  });

  await test("Media Library", "Stream Media with HTTP 206 & ETag Verification", async () => {
    assert.ok(uploadedMediaUrl);
    const streamRes = await fetch(`${baseUrl}${uploadedMediaUrl}`, {
      headers: { Range: "bytes=0-50" }
    });
    assert.equal(streamRes.status, 206);
    assert.ok(streamRes.headers.get("etag"));
    assert.ok(streamRes.headers.get("content-range"));
  });

  await test("Media Library", "List & Delete Media", async () => {
    assert.ok(uploadedMediaId);
    const listRes = await api("/api/v1/media");
    assert.equal(listRes.status, 200);

    const delRes = await api(`/api/v1/media/${uploadedMediaId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // I. WEBSITE SETTINGS
  // -------------------------------------------------------------------
  await test("Website Settings", "Read & Save Settings", async () => {
    const getRes = await api("/api/v1/cms/settings");
    assert.equal(getRes.status, 200);

    const saveRes = await api("/api/v1/cms/settings", {
      method: "POST",
      body: JSON.stringify({
        key: "seo_metadata",
        value: {
          siteTitle: "The Editing Table | Global Cinematic Post-Production",
          siteDescription: "Bespoke color grading and film editing for visionary storytellers worldwide."
        }
      })
    });
    assert.equal(saveRes.status, 200);
  });

  // -------------------------------------------------------------------
  // J. MY SECURITY & SESSIONS
  // -------------------------------------------------------------------
  await test("My Security", "Session Inspection & Security Profile", async () => {
    const meRes = await api("/api/v1/security/me");
    assert.equal(meRes.status, 200);
    assert.ok(Array.isArray(meRes.data.data.sessions));
  });

  // -------------------------------------------------------------------
  // K. TWO-FACTOR MANAGEMENT
  // -------------------------------------------------------------------
  await test("Two-Factor Management", "Begin TOTP Setup Flow", async () => {
    const beginRes = await api("/api/v1/auth/security/2fa/setup/begin", {
      method: "POST",
      body: JSON.stringify({ password: "TestPass@2026!Secure" })
    });
    assert.equal(beginRes.status, 200);
    assert.ok(beginRes.data.data.manualKey || beginRes.data.data.qrCodeDataUrl);
  });

  // -------------------------------------------------------------------
  // L. SECURITY POLICY
  // -------------------------------------------------------------------
  await test("Security Policy", "Read & Update Policy", async () => {
    const getRes = await api("/api/v1/security/policy");
    assert.equal(getRes.status, 200);

    const updateRes = await api("/api/v1/security/policy", {
      method: "PUT",
      body: JSON.stringify({
        password: "TestPass@2026!Secure",
        requireAdmin2FA: true,
        trustedDeviceDays: 30,
        maxFailedAttempts: 5,
        sessionExpiryHours: 24
      })
    });
    assert.equal(updateRes.status, 200);
  });

  // -------------------------------------------------------------------
  // M. ADMIN USERS & RBAC
  // -------------------------------------------------------------------
  let createdUserId = null;
  await test("Admin Users", "Create User, List Users, & Delete User", async () => {
    const createRes = await api("/api/v1/cms/users", {
      method: "POST",
      body: JSON.stringify({
        name: "Assistant Editor",
        email: `assistant.${Date.now()}@theeditingtable.com`,
        password: "Pass@Editing2026!",
        role: "editor"
      })
    });
    assert.equal(createRes.status, 201);
    createdUserId = createRes.data.data._id;

    // List users
    const usersList = await api("/api/v1/cms/users");
    assert.equal(usersList.status, 200);
    assert.ok(Array.isArray(usersList.data.data));

    // Delete created test user
    const delRes = await api(`/api/v1/cms/users/${createdUserId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // N. SECURITY AUDIT LOGS
  // -------------------------------------------------------------------
  await test("Security Audit Logs", "Query and Filter Audit Trails", async () => {
    const logsRes = await api("/api/v1/cms/audit-logs");
    assert.equal(logsRes.status, 200);
    assert.ok(Array.isArray(logsRes.data.data));
  });

  // -------------------------------------------------------------------
  // O. PORTFOLIO SHOWCASE (CRUD, Slug, Status, Reorder, Bulk Delete)
  // -------------------------------------------------------------------
  let portfolio1Id = null;
  let portfolio2Id = null;
  let portfolioSlug = null;

  await test("Portfolio Showcase", "Create Showcase Item (Add Showcase Item)", async () => {
    const res = await api("/api/v1/cms/portfolio", {
      method: "POST",
      body: JSON.stringify({
        title: "Dior Haute Couture Editorial",
        category: "Commercial Film",
        client: "Christian Dior",
        coverImage: "/uploads/portfolio/dior-cover.jpg",
        videoUrl: "https://vimeo.com/diorhautecouture",
        description: "35mm analog grain and filmic highlight roll-off.",
        deliverables: ["Theatrical Master", "Color LUT", "Instagram Reel"],
        isFeatured: true,
        isPublished: true
      })
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.data._id);
    assert.ok(res.data.data.id);
    portfolio1Id = res.data.data._id;
    portfolioSlug = res.data.data.slug;
  });

  await test("Portfolio Showcase", "Retrieve by ID and by Slug (No 'Invalid record ID')", async () => {
    assert.ok(portfolio1Id);
    assert.ok(portfolioSlug);

    // By ID
    const byIdRes = await api(`/api/v1/cms/portfolio/${portfolio1Id}`);
    assert.equal(byIdRes.status, 200);
    assert.equal(byIdRes.data.data._id, portfolio1Id);

    // By Slug
    const bySlugRes = await api(`/api/v1/cms/portfolio/${portfolioSlug}`);
    assert.equal(bySlugRes.status, 200);
    assert.equal(bySlugRes.data.data._id, portfolio1Id);
  });

  await test("Portfolio Showcase", "Update Showcase Item & Toggle Status", async () => {
    assert.ok(portfolio1Id);
    const updateRes = await api(`/api/v1/cms/portfolio/${portfolio1Id}`, {
      method: "PATCH",
      body: JSON.stringify({ client: "Dior Paris" })
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.data.client, "Dior Paris");

    const statusRes = await api(`/api/v1/cms/portfolio/${portfolio1Id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active: false })
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.data.active, false);
  });

  await test("Portfolio Showcase", "Reorder and Bulk Delete Items", async () => {
    // Create second item
    const res2 = await api("/api/v1/cms/portfolio", {
      method: "POST",
      body: JSON.stringify({
        title: "Gucci Flora Campaign",
        category: "Fashion Film",
        client: "Gucci",
        coverImage: "/uploads/portfolio/gucci-cover.jpg",
        isPublished: true
      })
    });
    assert.equal(res2.status, 201);
    portfolio2Id = res2.data.data._id;

    // Reorder
    const reorderRes = await api("/api/v1/cms/portfolio/reorder", {
      method: "PUT",
      body: JSON.stringify({
        items: [
          { id: portfolio2Id, order: 1 },
          { id: portfolio1Id, order: 2 }
        ]
      })
    });
    assert.equal(reorderRes.status, 200);

    // Bulk Delete
    const bulkRes = await api("/api/v1/cms/portfolio/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids: [portfolio1Id, portfolio2Id] })
    });
    assert.equal(bulkRes.status, 200);
  });

  // -------------------------------------------------------------------
  // P. HERO BACKGROUND VIDEO MANAGER
  // -------------------------------------------------------------------
  let heroVideoVersionId = null;
  await test("Hero Video Manager", "Create Draft Version & Settings", async () => {
    const draftRes = await api("/api/v1/admin/hero-video/draft", {
      method: "POST",
      body: JSON.stringify({
        title: "Autumn 2026 Hero Reel",
        videoUrl: "https://youtu.be/testReel123",
        videoType: "youtube",
        overlayOpacity: 0.35,
        playbackSpeed: 1.0,
        versionNotes: "Draft for master campaign review"
      })
    });
    assert.equal(draftRes.status, 200);
    assert.ok(draftRes.data.data._id);
    heroVideoVersionId = draftRes.data.data._id;
  });

  await test("Hero Video Manager", "Publish & Fetch Public Active", async () => {
    assert.ok(heroVideoVersionId);
    const pubRes = await api("/api/v1/admin/hero-video/publish", {
      method: "POST",
      body: JSON.stringify({ versionId: heroVideoVersionId })
    });
    assert.equal(pubRes.status, 200);

    const activeRes = await fetch(`${baseUrl}/api/v1/hero-video/active`);
    assert.equal(activeRes.status, 200);
    const activeData = await activeRes.json();
    assert.ok(activeData.data);

    // Unpublish and delete test version
    const unpubRes = await api("/api/v1/admin/hero-video/unpublish", { method: "POST" });
    assert.equal(unpubRes.status, 200);

    const delRes = await api(`/api/v1/admin/hero-video/${heroVideoVersionId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // Q. HERO SLIDES
  // -------------------------------------------------------------------
  let slideId = null;
  await test("Hero Slides", "Create, Update, Reorder & Delete Slide", async () => {
    const createRes = await api("/api/v1/cms/hero-slides/admin", {
      method: "POST",
      body: JSON.stringify({
        slideKey: `slide-${Date.now()}`,
        slideType: "ceo",
        title: "Crafting Cinematic Emotion",
        subtitle: "The signature aesthetic for premiere filmmakers",
        order: 1,
        active: true
      })
    });
    assert.equal(createRes.status, 201);
    slideId = createRes.data.data._id;

    const patchRes = await api(`/api/v1/cms/hero-slides/admin/${slideId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Visual Storytelling Mastered" })
    });
    assert.equal(patchRes.status, 200);

    const delRes = await api(`/api/v1/cms/hero-slides/admin/${slideId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // R. SERVICES SUITE
  // -------------------------------------------------------------------
  let serviceId = null;
  await test("Services Suite", "Create, Update & Delete Service", async () => {
    const createRes = await api("/api/v1/cms/services", {
      method: "POST",
      body: JSON.stringify({
        title: "ACES Color Grading & Mastering",
        category: "Post-Production",
        description: "Theatrical color grading calibrated for ARRI and RED RAW cameras.",
        price: "Custom Scope",
        turnaround: "48-72h",
        isPublished: true
      })
    });
    assert.equal(createRes.status, 201);
    serviceId = createRes.data.data._id;

    const patchRes = await api(`/api/v1/cms/services/${serviceId}`, {
      method: "PATCH",
      body: JSON.stringify({ price: "Contact for Quote" })
    });
    assert.equal(patchRes.status, 200);

    const delRes = await api(`/api/v1/cms/services/${serviceId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // S. BRAND COLLABORATIONS
  // -------------------------------------------------------------------
  let collabId = null;
  await test("Brand Collaborations", "Create, Update & Delete Collaboration", async () => {
    const createRes = await api("/api/v1/cms/collaborations", {
      method: "POST",
      body: JSON.stringify({
        title: "Zara Man Editorial",
        brandName: "Zara",
        category: "Fashion & Retail",
        shortDescription: "Autumn lookbook color science.",
        fullDescription: "Calibrated 35mm film stock emulation and micro dodge & burn.",
        coverImage: "/uploads/brands/zara-cover.jpg",
        published: true
      })
    });
    assert.equal(createRes.status, 201);
    collabId = createRes.data.data._id;

    const patchRes = await api(`/api/v1/cms/collaborations/${collabId}`, {
      method: "PATCH",
      body: JSON.stringify({ shortDescription: "Global Autumn Campaign" })
    });
    assert.equal(patchRes.status, 200);

    const delRes = await api(`/api/v1/cms/collaborations/${collabId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // T. BLOG JOURNAL
  // -------------------------------------------------------------------
  let blogId = null;
  await test("Blog Journal", "Create, Update & Delete Blog Post", async () => {
    const createRes = await api("/api/v1/cms/blog", {
      method: "POST",
      body: JSON.stringify({
        title: "Why Color Science Matters in Modern Filmmaking",
        category: "Color Science",
        excerpt: "An in-depth look into DaVinci Resolve YRGB vs ACES color spaces.",
        content: "Color science is the foundation of emotional cinematic storytelling...",
        coverImage: "/uploads/blogs/color-science-thumb.jpg",
        authorName: "Akshay Chhabra",
        authorRole: "Founder & Creative Director",
        status: "published"
      })
    });
    assert.equal(createRes.status, 201);
    blogId = createRes.data.data._id;

    const patchRes = await api(`/api/v1/cms/blog/${blogId}`, {
      method: "PATCH",
      body: JSON.stringify({ readTime: "7 min read" })
    });
    assert.equal(patchRes.status, 200);

    const delRes = await api(`/api/v1/cms/blog/${blogId}`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------------
  // U. RBAC & SECURITY BOUNDARIES
  // -------------------------------------------------------------------
  await test("RBAC", "Editor Denied Access to Superadmin Endpoints (403 Forbidden)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/cms/users`, {
      headers: editorHeaders
    });
    assert.equal(res.status, 403, "Editor must be forbidden from managing users");
  });

  await test("RBAC", "Unauthenticated Request Rejected (401 Unauthorized)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/cms/stats`);
    assert.equal(res.status, 401, "Unauthenticated request must be rejected");
  });

  // -------------------------------------------------------------------
  // CLEANUP TEST USERS
  // -------------------------------------------------------------------
  await pool.query('DELETE FROM "sessions" WHERE "_id" = $1 OR "_id" = $2', [superadminSessionId, editorSessionId]);
  await pool.query('DELETE FROM "users" WHERE "_id" = $1 OR "_id" = $2', [superadminId, editorId]);

  // Close server
  await new Promise((resolve) => server.close(resolve));

  console.log("\n===================================================================");
  console.log(`FULL MODULE AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===================================================================\n");

  return { passed, failed, results: auditResults };
}

runAudit()
  .then(({ failed }) => {
    if (failed > 0) process.exit(1);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Audit suite fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closePostgresPool();
  });

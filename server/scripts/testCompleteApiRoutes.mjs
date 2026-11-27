import app from "../src/app.js";
import { closePostgresPool } from "../src/db/postgres.js";

async function runCompleteApiAudit() {
  console.log("==================================================================");
  console.log("THE EDITING TABLE — COMPREHENSIVE BACKEND API AUDIT SUITE");
  console.log("Target Database: Neon PostgreSQL (ep-falling-hall-b3o2td4g)");
  console.log("==================================================================\n");

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let authToken = null;
  let csrfToken = null;
  const results = [];

  async function api(method, endpoint, body = null, headers = {}) {
    const reqHeaders = { ...headers };
    if (authToken) {
      reqHeaders["Authorization"] = `Bearer ${authToken}`;
      reqHeaders["Cookie"] = `accessToken=${authToken}`;
    }
    if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
      reqHeaders["x-csrf-token"] = csrfToken;
    }
    if (body && typeof body === "object" && !(body instanceof Buffer) && !(body instanceof FormData)) {
      reqHeaders["Content-Type"] = "application/json";
    }

    const start = Date.now();
    try {
      let reqBody = body;
      if (body && typeof body === "object" && !(body instanceof Buffer) && !(body instanceof FormData)) {
        reqBody = JSON.stringify(body);
      }
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: reqHeaders,
        body: reqBody
      });
      const duration = Date.now() - start;
      let data = null;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { status: res.status, data, duration, ok: res.ok, headers: res.headers };
    } catch (err) {
      return { status: 0, error: err.message, duration: Date.now() - start, ok: false };
    }
  }

  function record(module, route, method, expectedStatus, actualStatus, passCondition, notes = "") {
    const passed = Boolean(passCondition && actualStatus === expectedStatus);
    results.push({
      module,
      route,
      method,
      expected: expectedStatus,
      status: actualStatus,
      result: passed ? "PASS" : "FAIL",
      notes
    });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${method} ${route} -> HTTP ${actualStatus} (Expected ${expectedStatus}) ${notes ? "- " + notes : ""}`);
  }

  try {
    // 1. HEALTH CHECKS
    console.log("\n--- MODULE 1: Health & Diagnostics ---");
    const h1 = await api("GET", "/health");
    record("Health", "/health", "GET", 200, h1.status, h1.data?.success && h1.data?.data?.activeDatabase?.status === "connected", `DB: ${h1.data?.data?.activeDatabase?.status}`);

    const h2 = await api("GET", "/api/health");
    record("Health", "/api/health", "GET", 200, h2.status, h2.data?.success && h2.data?.data?.postgresql?.status === "connected");

    const h3 = await api("GET", "/api/health/redis");
    record("Health", "/api/health/redis", "GET", 200, h3.status, h3.data?.success === true);

    // 2. AUTHENTICATION & SESSIONS
    console.log("\n--- MODULE 2: Authentication & Sessions ---");
    const badLogin = await api("POST", "/api/v1/auth/login", { email: "wrong@theeditingtable.com", password: "wrong" });
    record("Auth", "/api/v1/auth/login [invalid]", "POST", 401, badLogin.status, badLogin.data?.success === false);

    const goodLogin = await api("POST", "/api/v1/auth/login", {
      email: "admin@theeditingtable.com",
      password: "AdminPassword123!"
    });
    const loginOk = goodLogin.status === 200 && goodLogin.data?.data?.token;
    if (loginOk) {
      authToken = goodLogin.data.data.token;
      csrfToken = goodLogin.data.data.csrfToken;
    }
    record("Auth", "/api/v1/auth/login [valid]", "POST", 200, goodLogin.status, loginOk, `Role: ${goodLogin.data?.data?.user?.role}`);

    const me = await api("GET", "/api/v1/auth/me");
    record("Auth", "/api/v1/auth/me", "GET", 200, me.status, me.data?.data?.email === "admin@theeditingtable.com");

    // 3. SECURITY & POLICY
    console.log("\n--- MODULE 3: Security Policy & Audit Logs ---");
    const secPolicy = await api("GET", "/api/v1/security/policy");
    record("Security", "/api/v1/security/policy", "GET", 200, secPolicy.status, secPolicy.data?.success === true);

    const secAudit = await api("GET", "/api/v1/security/audit-logs");
    record("Security", "/api/v1/security/audit-logs", "GET", 200, secAudit.status, Array.isArray(secAudit.data?.data?.logs || secAudit.data?.data));

    const ownSec = await api("GET", "/api/v1/security/me");
    record("Security", "/api/v1/security/me", "GET", 200, ownSec.status, ownSec.data?.success === true);

    // 4. CMS DASHBOARD & STATS
    console.log("\n--- MODULE 4: CMS Overview & Stats ---");
    const cmsStats = await api("GET", "/api/v1/cms/stats");
    record("Dashboard", "/api/v1/cms/stats", "GET", 200, cmsStats.status, cmsStats.data?.success === true);

    // 5. HERO BACKGROUND VIDEO
    console.log("\n--- MODULE 5: Hero Background Video ---");
    const heroPublic = await api("GET", "/api/v1/hero-video");
    record("Hero Video", "/api/v1/hero-video [public]", "GET", 200, heroPublic.status, heroPublic.data?.success === true);

    const heroAdmin = await api("GET", "/api/v1/admin/hero-video");
    record("Hero Video", "/api/v1/admin/hero-video [admin]", "GET", 200, heroAdmin.status, heroAdmin.data?.success === true);

    const heroDraft = await api("POST", "/api/v1/admin/hero-video/draft", {
      title: "Hero Background Film",
      videoUrl: "/uploads/hero/test_cinematic.mp4",
      overlayOpacity: 0.35,
      playbackSpeed: 1.0
    });
    record("Hero Video", "/api/v1/admin/hero-video/draft", "POST", 200, heroDraft.status, heroDraft.data?.success === true);

    // 6. HERO SLIDES CMS
    console.log("\n--- MODULE 6: Hero Slides CMS ---");
    const heroSlidesPub = await api("GET", "/api/v1/cms/hero-slides");
    record("Hero Slides", "/api/v1/cms/hero-slides [public]", "GET", 200, heroSlidesPub.status, Array.isArray(heroSlidesPub.data?.data));

    const heroSlidesAdmin = await api("GET", "/api/v1/cms/hero-slides/admin");
    record("Hero Slides", "/api/v1/cms/hero-slides/admin", "GET", 200, heroSlidesAdmin.status, heroSlidesAdmin.data?.success === true);

    const createSlide = await api("POST", "/api/v1/cms/hero-slides/admin", {
      slideKey: `audit_slide_${Date.now()}`,
      title: "Precision Editorial",
      subtitle: "Color Science & Master Finish",
      mainImage: "/uploads/hero/cinematic.jpg",
      order: 1,
      active: true,
      slideType: "ceo",
      layoutType: "ceo_editorial",
      status: "published"
    });
    record("Hero Slides", "/api/v1/cms/hero-slides/admin", "POST", 201, createSlide.status, createSlide.data?.success === true);
    const slideId = createSlide.data?.data?._id;

    if (slideId) {
      const updateSlide = await api("PATCH", `/api/v1/cms/hero-slides/admin/${slideId}`, {
        title: "Precision Editorial [Updated]"
      });
      record("Hero Slides", "/api/v1/cms/hero-slides/admin/:id", "PATCH", 200, updateSlide.status, updateSlide.data?.success === true);

      const delSlide = await api("DELETE", `/api/v1/cms/hero-slides/admin/${slideId}`);
      record("Hero Slides", "/api/v1/cms/hero-slides/admin/:id", "DELETE", 200, delSlide.status, delSlide.data?.success === true);
    }

    // 7. ABOUT ME CMS
    console.log("\n--- MODULE 7: About Me CMS ---");
    const aboutPub = await api("GET", "/api/v1/cms/about-me");
    record("About Me", "/api/v1/cms/about-me [public]", "GET", 200, aboutPub.status, aboutPub.data?.success === true);

    const aboutAdmin = await api("GET", "/api/v1/cms/about-me/admin");
    record("About Me", "/api/v1/cms/about-me/admin", "GET", 200, aboutAdmin.status, aboutAdmin.data?.success === true);

    const aboutPut = await api("PUT", "/api/v1/cms/about-me", {
      fullName: "Akshay Chhabra",
      title: "Founder & Lead Colorist",
      shortBio: "Bespoke post-production specialist for high-end wedding and commercial cinema."
    });
    record("About Me", "/api/v1/cms/about-me", "PUT", 200, aboutPut.status, aboutPut.data?.success === true);

    // 8. SERVICES CMS
    console.log("\n--- MODULE 8: Services CMS ---");
    const servPub = await api("GET", "/api/v1/cms/services");
    record("Services", "/api/v1/cms/services [public]", "GET", 200, servPub.status, Array.isArray(servPub.data?.data));

    const createServ = await api("POST", "/api/v1/cms/services", {
      title: "Commercial Color Grade",
      description: "P3/Rec709 theatrical color grading with custom film emulsion profiles.",
      category: "Color Science",
      order: 10
    });
    record("Services", "/api/v1/cms/services", "POST", 201, createServ.status, createServ.data?.success === true);
    const servId = createServ.data?.data?._id;

    if (servId) {
      const delServ = await api("DELETE", `/api/v1/cms/services/${servId}`);
      record("Services", "/api/v1/cms/services/:id", "DELETE", 200, delServ.status, delServ.data?.success === true);
    }

    // 9. PORTFOLIO SHOWCASE CMS
    console.log("\n--- MODULE 9: Portfolio CMS ---");
    const portPub = await api("GET", "/api/v1/cms/portfolio");
    record("Portfolio", "/api/v1/cms/portfolio [public]", "GET", 200, portPub.status, Array.isArray(portPub.data?.data));

    const createPort = await api("POST", "/api/v1/cms/portfolio", {
      title: "Paris Luxury Wedding Showcase",
      slug: "paris-luxury-wedding-showcase",
      category: "commercial",
      client: "Château de Villette",
      description: "Multi-cam color grading, sound design sync, and master delivery.",
      coverImage: "/uploads/portfolio/paris_chateau.jpg"
    });
    record("Portfolio", "/api/v1/cms/portfolio", "POST", 201, createPort.status, createPort.data?.success === true);
    const portId = createPort.data?.data?._id;

    if (portId) {
      const delPort = await api("DELETE", `/api/v1/cms/portfolio/${portId}`);
      record("Portfolio", "/api/v1/cms/portfolio/:id", "DELETE", 200, delPort.status, delPort.data?.success === true);
    }

    // 10. BRAND COLLABORATIONS CMS
    console.log("\n--- MODULE 10: Brand Collaborations CMS ---");
    const collabPub = await api("GET", "/api/v1/cms/collaborations");
    record("Collaborations", "/api/v1/cms/collaborations [public]", "GET", 200, collabPub.status, Array.isArray(collabPub.data?.data));

    const createCollab = await api("POST", "/api/v1/cms/collaborations", {
      title: "Gucci Editorial Partnership",
      slug: `gucci-editorial-partnership-${Date.now()}`,
      brandName: "Gucci",
      category: "Luxury Fashion",
      shortDescription: "Color timing for Spring/Summer campaign",
      fullDescription: "Comprehensive editorial color timing and sound design mastering.",
      coverImage: "/uploads/collaborations/gucci.jpg"
    });
    record("Collaborations", "/api/v1/cms/collaborations", "POST", 201, createCollab.status, createCollab.data?.success === true);
    const collabId = createCollab.data?.data?._id;

    if (collabId) {
      const delCollab = await api("DELETE", `/api/v1/cms/collaborations/${collabId}`);
      record("Collaborations", "/api/v1/cms/collaborations/:id", "DELETE", 200, delCollab.status, delCollab.data?.success === true);
    }

    // Global Reach Marquee
    const globalReach = await api("GET", "/api/v1/cms/global-reach");
    record("Collaborations", "/api/v1/cms/global-reach", "GET", 200, globalReach.status, globalReach.data?.success === true);

    // 11. TEAM MEMBERS CMS
    console.log("\n--- MODULE 11: Team Members CMS ---");
    const teamPub = await api("GET", "/api/v1/cms/team");
    record("Team", "/api/v1/cms/team [public]", "GET", 200, teamPub.status, Array.isArray(teamPub.data?.data));

    const createTeam = await api("POST", "/api/v1/cms/team", {
      fullName: "Maya Lin",
      slug: `maya-lin-${Date.now()}`,
      designation: "Senior Lead Colorist",
      shortBio: "Specializing in commercial beauty and luxury film finishing.",
      profileImage: "/uploads/team/maya.jpg"
    });
    record("Team", "/api/v1/cms/team", "POST", 201, createTeam.status, createTeam.data?.success === true);
    const teamId = createTeam.data?.data?._id;

    if (teamId) {
      const delTeam = await api("DELETE", `/api/v1/cms/team/${teamId}`);
      record("Team", "/api/v1/cms/team/:id", "DELETE", 200, delTeam.status, delTeam.data?.success === true);
    }

    // 12. SITE SETTINGS CMS
    console.log("\n--- MODULE 12: Site Settings CMS ---");
    const settingsPub = await api("GET", "/api/v1/cms/settings");
    record("Settings", "/api/v1/cms/settings [public]", "GET", 200, settingsPub.status, settingsPub.data?.success === true);

    const settingsAdmin = await api("GET", "/api/v1/cms/settings/admin");
    record("Settings", "/api/v1/cms/settings/admin", "GET", 200, settingsAdmin.status, settingsAdmin.data?.success === true);

    // 13. REVIEWS & TESTIMONIALS
    console.log("\n--- MODULE 13: Reviews & Testimonials ---");
    const revPub = await api("GET", "/api/v1/reviews");
    record("Reviews", "/api/v1/reviews [public]", "GET", 200, revPub.status, Array.isArray(revPub.data?.data));

    const revAdmin = await api("GET", "/api/v1/reviews/admin");
    record("Reviews", "/api/v1/reviews/admin", "GET", 200, revAdmin.status, Array.isArray(revAdmin.data?.data));

    const revStats = await api("GET", "/api/v1/reviews/admin/stats");
    record("Reviews", "/api/v1/reviews/admin/stats", "GET", 200, revStats.status, revStats.data?.success === true);

    const submitRev = await api("POST", "/api/v1/reviews", {
      name: "Marcus Aurelius",
      email: "marcus@cinemastudios.com",
      projectType: "Feature Film",
      rating: 5,
      title: "Exceptional Post-Production Suite",
      message: "The color precision and narrative pacing delivered by The Editing Table were world-class."
    });
    record("Reviews", "/api/v1/reviews [submit]", "POST", 201, submitRev.status, submitRev.data?.success === true);
    const reviewId = submitRev.data?.data?._id;

    if (reviewId) {
      const delRev = await api("DELETE", `/api/v1/reviews/admin/${reviewId}`);
      record("Reviews", `/api/v1/reviews/admin/:id`, "DELETE", 200, delRev.status, delRev.data?.success === true);
    }

    // 14. CONTACT SETTINGS & DIRECTORY
    console.log("\n--- MODULE 14: Contact Settings & Directory ---");
    const contactPub = await api("GET", "/api/v1/contact");
    record("Contact", "/api/v1/contact [public]", "GET", 200, contactPub.status, contactPub.data?.success === true);

    const contactAdminSettings = await api("GET", "/api/v1/admin/contact/settings");
    record("Contact", "/api/v1/admin/contact/settings", "GET", 200, contactAdminSettings.status, contactAdminSettings.data?.success === true);

    const contactPhones = await api("GET", "/api/v1/admin/contact/phones");
    record("Contact", "/api/v1/admin/contact/phones", "GET", 200, contactPhones.status, Array.isArray(contactPhones.data?.data));

    const contactEmails = await api("GET", "/api/v1/admin/contact/emails");
    record("Contact", "/api/v1/admin/contact/emails", "GET", 200, contactEmails.status, Array.isArray(contactEmails.data?.data));

    const contactOffices = await api("GET", "/api/v1/admin/contact/offices");
    record("Contact", "/api/v1/admin/contact/offices", "GET", 200, contactOffices.status, Array.isArray(contactOffices.data?.data));

    const contactHours = await api("GET", "/api/v1/admin/contact/hours");
    record("Contact", "/api/v1/admin/contact/hours", "GET", 200, contactHours.status, Array.isArray(contactHours.data?.data));

    // 15. CONTACT ENQUIRIES
    console.log("\n--- MODULE 15: Contact Enquiries ---");
    const submitEnquiry = await api("POST", "/api/v1/enquiries", {
      name: "Jean-Luc Godard",
      email: "jeanluc@nouvellevague.fr",
      service: "Color Grading & Theatrical Master",
      budget: "$10,000+",
      description: "Full post-production suite for 35mm film scan and final DCP delivery."
    });
    record("Enquiries", "/api/v1/enquiries [submit]", "POST", 201, submitEnquiry.status, submitEnquiry.data?.success === true);
    const enquiryId = submitEnquiry.data?.data?._id;

    const cmsEnquiries = await api("GET", "/api/v1/cms/enquiries");
    record("Enquiries", "/api/v1/cms/enquiries [admin]", "GET", 200, cmsEnquiries.status, Array.isArray(cmsEnquiries.data?.data));

    if (enquiryId) {
      const patchEnquiry = await api("PATCH", `/api/v1/cms/enquiries/${enquiryId}/status`, { status: "contacted" });
      record("Enquiries", "/api/v1/cms/enquiries/:id/status", "PATCH", 200, patchEnquiry.status, patchEnquiry.data?.success === true);

      const delEnquiry = await api("DELETE", `/api/v1/cms/enquiries/${enquiryId}`);
      record("Enquiries", "/api/v1/cms/enquiries/:id", "DELETE", 200, delEnquiry.status, delEnquiry.data?.success === true);
    }

    // 16. CAREERS & JOBS
    console.log("\n--- MODULE 16: Careers & Jobs ---");
    const careersPub = await api("GET", "/api/v1/careers");
    record("Careers", "/api/v1/careers [public]", "GET", 200, careersPub.status, careersPub.data?.success === true);

    const careersJobs = await api("GET", "/api/v1/careers/jobs");
    record("Careers", "/api/v1/careers/jobs", "GET", 200, careersJobs.status, Array.isArray(careersJobs.data?.data));

    const createJob = await api("POST", "/api/v1/careers/admin/jobs", {
      title: "Senior Film Finishing Artist",
      department: "Color & Delivery",
      location: "London / Hybrid",
      type: "Full-Time",
      description: "Finishing artist managing conform, grade, and IMF packaging."
    });
    record("Careers", "/api/v1/careers/admin/jobs", "POST", 201, createJob.status, createJob.data?.success === true);
    const jobId = createJob.data?.data?._id;

    if (jobId) {
      const delJob = await api("DELETE", `/api/v1/careers/admin/jobs/${jobId}`);
      record("Careers", "/api/v1/careers/admin/jobs/:id", "DELETE", 200, delJob.status, delJob.data?.success === true);
    }

    const careersApps = await api("GET", "/api/v1/careers/admin/applications");
    record("Careers", "/api/v1/careers/admin/applications", "GET", 200, careersApps.status, Array.isArray(careersApps.data?.data));

    // 17. ADMIN USERS & AUDIT LOGS
    console.log("\n--- MODULE 17: Admin Users & Audit Logs ---");
    const cmsUsers = await api("GET", "/api/v1/cms/users");
    record("Users", "/api/v1/cms/users", "GET", 200, cmsUsers.status, Array.isArray(cmsUsers.data?.data));

    const cmsAudit = await api("GET", "/api/v1/cms/audit-logs");
    record("Audit Logs", "/api/v1/cms/audit-logs", "GET", 200, cmsAudit.status, Array.isArray(cmsAudit.data?.data));

    // 18. VIDEO SHOWCASE CMS
    console.log("\n--- MODULE 18: Video Showcase CMS ---");
    const vidShowcasePub = await api("GET", "/api/v1/video-showcase");
    record("Video Showcase", "/api/v1/video-showcase [public]", "GET", 200, vidShowcasePub.status, Array.isArray(vidShowcasePub.data?.data));

    const vidShowcaseAdmin = await api("GET", "/api/v1/admin/video-showcase");
    record("Video Showcase", "/api/v1/admin/video-showcase", "GET", 200, vidShowcaseAdmin.status, Array.isArray(vidShowcaseAdmin.data?.data));

    const vidShowcaseSettings = await api("GET", "/api/v1/admin/video-showcase/settings");
    record("Video Showcase", "/api/v1/admin/video-showcase/settings", "GET", 200, vidShowcaseSettings.status, vidShowcaseSettings.data?.success === true);

    // 19. MEDIA STORAGE, CHUNKING & BYTEA STREAMING
    console.log("\n--- MODULE 19: Media Storage, Chunking & BYTEA Streaming ---");
    const mediaLib = await api("GET", "/api/v1/media");
    record("Media", "/api/v1/media", "GET", 200, mediaLib.status, Array.isArray(mediaLib.data?.data));

    const uploadCfg = await api("GET", "/api/v1/upload/config");
    record("Upload", "/api/v1/upload/config", "GET", 200, uploadCfg.status, uploadCfg.data?.success === true);

    // Chunked upload start
    const startChunk = await api("POST", "/api/v1/upload/chunked/start", {
      originalName: "neon_stream_audit_master.mp4",
      size: 2048,
      mimeType: "video/mp4",
      folder: "portfolio"
    });
    record("Upload", "/api/v1/upload/chunked/start", "POST", 201, startChunk.status, startChunk.data?.success === true);
    const uploadId = startChunk.data?.data?.uploadId;

    if (uploadId) {
      // Chunk 0 upload via FormData
      const formData0 = new FormData();
      formData0.append("chunk", new Blob([new Uint8Array(2048).fill(65)]), "chunk_0.part");
      formData0.append("uploadId", uploadId);
      formData0.append("index", "0");
      formData0.append("count", "1");

      const res0 = await fetch(`${baseUrl}/api/v1/upload/chunked/part`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Cookie": `accessToken=${authToken}`,
          "x-csrf-token": csrfToken
        },
        body: formData0
      });
      const data0 = await res0.json();
      record("Upload", "/api/v1/upload/chunked/part [0]", "POST", 200, res0.status, data0?.success === true);

      // Finish chunked upload
      const finishChunk = await api("POST", "/api/v1/upload/chunked/finish", {
        uploadId,
        mimeType: "video/mp4",
        originalName: "neon_stream_audit_master.mp4",
        size: 2048,
        folder: "portfolio"
      });
      record("Upload", "/api/v1/upload/chunked/finish", "POST", 201, finishChunk.status, finishChunk.data?.success === true);
      const mediaItem = finishChunk.data?.data;

      if (mediaItem?.url) {
        // Stream full file (HTTP 200)
        const streamFull = await api("GET", mediaItem.url);
        record("Media", `${mediaItem.url} [full stream]`, "GET", 200, streamFull.status, streamFull.status === 200);

        // Stream range request (HTTP 206 Partial Content)
        const streamRange = await api("GET", mediaItem.url, null, { Range: "bytes=0-511" });
        record("Media", `${mediaItem.url} [HTTP 206 Range]`, "GET", 206, streamRange.status, streamRange.status === 206, "HTTP 206 Range Streaming Verified");

        // Delete test media from Neon
        const delMedia = await api("DELETE", `/api/v1/media/${mediaItem._id}`);
        record("Media", `/api/v1/media/:id`, "DELETE", 200, delMedia.status, delMedia.data?.success === true);
      }
    }

    // 20. LOGOUT
    console.log("\n--- MODULE 20: Logout ---");
    const logoutRes = await api("POST", "/api/v1/auth/logout");
    record("Auth", "/api/v1/auth/logout", "POST", 200, logoutRes.status, logoutRes.data?.success === true);

  } catch (err) {
    console.error("Global Audit Error:", err);
  } finally {
    server.close();
    await closePostgresPool();

    console.log("\n==================================================================");
    console.log("AUDIT RESULTS SUMMARY");
    console.log("==================================================================");
    const passCount = results.filter(r => r.result === "PASS").length;
    const failCount = results.filter(r => r.result === "FAIL").length;
    console.log(`Total Routes Tested: ${results.length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Pass Rate: ${((passCount / results.length) * 100).toFixed(1)}%`);

    console.table(results);
  }
}

runCompleteApiAudit();

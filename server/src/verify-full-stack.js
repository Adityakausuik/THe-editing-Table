/* global fetch */
import assert from "node:assert";
import mongoose from "mongoose";
import { connectDatabase } from "./config/db.js";
import { bootstrapDatabase } from "./config/bootstrap.js";
import { getGridFSBucket, saveBufferToGridFS, getFileStreamFromGridFS, deleteFromGridFS } from "./utils/gridfs.js";
import { validateEnquiryInput } from "./validators/enquiry.validator.js";
import { Enquiry } from "./models/Enquiry.model.js";
import { createApp } from "./app.js";

async function runVerification() {
  console.log("=== THE EDITING TABLE: FULL-STACK INTEGRATION VERIFICATION ===");

  // 1. Database Connection & Bootstrap
  console.log("\n[1/5] Testing MongoDB Connection & Bootstrap...");
  const conn = await connectDatabase();
  assert.strictEqual(conn.readyState, 1, "Mongoose should be in connected state (1)");
  await bootstrapDatabase();
  console.log("✔ MongoDB connected and bootstrapped successfully.");

  // 2. GridFS Persistence Verification
  console.log("\n[2/5] Testing MongoDB GridFS Storage & Streaming...");
  const bucket = getGridFSBucket();
  assert.ok(bucket, "GridFSBucket must be initialized");

  const testFilename = `test-media-${Date.now()}.txt`;
  const testContent = Buffer.from("The Editing Table - High-End Post Production Asset Content");
  const saveResult = await saveBufferToGridFS(testFilename, testContent, "text/plain", "test");
  assert.ok(saveResult, "saveBufferToGridFS must return result");
  assert.strictEqual(saveResult.filename, `test/${testFilename}`);

  const getResult = await getFileStreamFromGridFS(`test/${testFilename}`);
  assert.ok(getResult, "getFileStreamFromGridFS must find the saved file");
  assert.strictEqual(getResult.fileDoc.contentType, "text/plain");

  // Read stream data to verify content match
  const chunks = [];
  for await (const chunk of getResult.stream) {
    chunks.push(chunk);
  }
  const downloadedBuffer = Buffer.concat(chunks);
  assert.strictEqual(downloadedBuffer.toString(), testContent.toString(), "Downloaded stream must match original content");

  // Clean up
  const delResult = await deleteFromGridFS(`test/${testFilename}`);
  assert.strictEqual(delResult, true, "deleteFromGridFS should return true");
  const getAfterDel = await getFileStreamFromGridFS(`test/${testFilename}`);
  assert.strictEqual(getAfterDel, null, "File must no longer exist in GridFS after deletion");
  console.log("✔ GridFS bucket write, read stream, content verification, and deletion passed.");

  // 3. Contact Form Normalization Verification
  console.log("\n[3/5] Testing Enquiry Validation & Normalization...");
  const landingPayload = {
    fullName: "Elena Rostova",
    email: "elena@voguemag.com",
    phone: "+1 555 234 5678",
    service: "Editorial Video Editing",
    projectDetails: "Fashion week runway editorial film in 4K ProRes with vintage film stock emulation.",
    budgetRange: "$5,000 - $10,000",
    deliveryDate: "2026-11-15",
    referenceLink: "https://vimeo.com/76979871"
  };

  const validationRes = validateEnquiryInput(landingPayload);
  assert.strictEqual(validationRes.isValid, true, "Landing page payload must validate as true");
  assert.strictEqual(validationRes.normalizedData.name, "Elena Rostova");
  assert.strictEqual(validationRes.normalizedData.description, landingPayload.projectDetails);
  assert.strictEqual(validationRes.normalizedData.budget, landingPayload.budgetRange);
  assert.strictEqual(validationRes.normalizedData.referenceUrl, landingPayload.referenceLink);

  const standardPayload = {
    name: "Marcus Vance",
    email: "marcus@ateliervance.com",
    service: "Luxury Retouching",
    description: "Amalfi Coast wedding stills retouching, 120 selected hero frames.",
    budget: "$2,500 - $5,000"
  };
  const standardVal = validateEnquiryInput(standardPayload);
  assert.strictEqual(standardVal.isValid, true, "Standard payload must validate as true");
  assert.strictEqual(standardVal.normalizedData.name, "Marcus Vance");
  console.log("✔ Enquiry schema normalization validated for both landing page & standard form variants.");

  // 4. Express App Endpoints & Route Aliasing
  console.log("\n[4/5] Testing Express API Endpoints & Route Aliases...");
  const app = createApp();

  // Test helper using supertest-like fetch or internal dispatch
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Top-level API status
    const apiRes = await fetch(`${baseUrl}/api`);
    assert.strictEqual(apiRes.status, 200);
    const apiJson = await apiRes.json();
    assert.strictEqual(apiJson.status, "online");

    // Versionless CMS endpoints
    const servicesRes = await fetch(`${baseUrl}/api/cms/services`);
    assert.strictEqual(servicesRes.status, 200, "GET /api/cms/services must return 200");

    const heroSlidesRes = await fetch(`${baseUrl}/api/cms/hero-slides`);
    assert.strictEqual(heroSlidesRes.status, 200, "GET /api/cms/hero-slides must return 200");

    const videoRes = await fetch(`${baseUrl}/api/video-showcase`);
    assert.strictEqual(videoRes.status, 200, "GET /api/video-showcase must return 200");

    const photoRes = await fetch(`${baseUrl}/api/photo-showcase`);
    assert.strictEqual(photoRes.status, 200, "GET /api/photo-showcase must return 200");

    const contactRes = await fetch(`${baseUrl}/api/contact`);
    assert.strictEqual(contactRes.status, 200, "GET /api/contact must return 200");

    const careersRes = await fetch(`${baseUrl}/api/careers`);
    assert.strictEqual(careersRes.status, 200, "GET /api/careers must return 200");

    // Versioned counterparts
    const v1ServicesRes = await fetch(`${baseUrl}/api/v1/cms/services`);
    assert.strictEqual(v1ServicesRes.status, 200, "GET /api/v1/cms/services must return 200");

    // Test POST /api/enquiries with landing page payload
    const postEnquiryRes = await fetch(`${baseUrl}/api/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...landingPayload,
        email: `test-${Date.now()}@example.com`
      })
    });
    assert.strictEqual(postEnquiryRes.status, 201, "POST /api/enquiries must return 201 Created");
    const enquiryJson = await postEnquiryRes.json();
    assert.strictEqual(enquiryJson.success, true);
    assert.ok(enquiryJson.data.id, "Created enquiry must return an ID");

    // Clean up created test enquiry
    await Enquiry.deleteOne({ _id: enquiryJson.data.id });
    console.log("✔ Express API routes and versionless aliases responded with 200/201.");

    // 5. Media Serving Route Verification (Disk + GridFS)
    console.log("\n[5/5] Testing Media Serving via /uploads and /api/uploads...");
    const sampleMediaFilename = `brand-sample-${Date.now()}.txt`;
    await saveBufferToGridFS(sampleMediaFilename, Buffer.from("Brand sample file content"), "text/plain", "brands");

    const uploadsRouteRes = await fetch(`${baseUrl}/uploads/brands/${sampleMediaFilename}`);
    assert.strictEqual(uploadsRouteRes.status, 200, "GET /uploads/... must stream from GridFS with status 200");
    const textViaUploads = await uploadsRouteRes.text();
    assert.strictEqual(textViaUploads, "Brand sample file content");

    const apiUploadsRouteRes = await fetch(`${baseUrl}/api/uploads/brands/${sampleMediaFilename}`);
    assert.strictEqual(apiUploadsRouteRes.status, 200, "GET /api/uploads/... must stream from GridFS with status 200");
    const textViaApiUploads = await apiUploadsRouteRes.text();
    assert.strictEqual(textViaApiUploads, "Brand sample file content");

    await deleteFromGridFS(`brands/${sampleMediaFilename}`);
    console.log("✔ Media streaming via /uploads and /api/uploads verified with 100% persistence.");

  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log("\n============================================================");
  console.log("🎉 ALL INTEGRATION TESTS PASSED WITH ZERO ERRORS!");
  console.log("============================================================\n");
}

runVerification().catch((err) => {
  console.error("\n❌ VERIFICATION FAILED:", err);
  process.exit(1);
});

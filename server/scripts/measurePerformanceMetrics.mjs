import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { createApp } from "../src/app.js";
import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";
import { checkRedisHealth } from "../src/config/redis.js";

async function runBenchmark() {
  console.log("==================================================================");
  console.log("THE EDITING TABLE – PRODUCTION PERFORMANCE BENCHMARK SUITE");
  console.log("==================================================================\n");

  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Benchmark backend test server running on ${baseUrl}`);

  const pool = getPostgresPool();

  // 1. Check Redis Health
  console.log("\n[1/5] Checking Redis & In-Memory Cache Health...");
  const redisHealth = await checkRedisHealth();
  console.log("Redis Health Status:", JSON.stringify(redisHealth, null, 2));

  // 2. Measure API Response Times (Cache Miss vs Cache Hit)
  console.log("\n[2/5] Measuring API Latency & Caching Effectiveness...");
  const endpoints = [
    "/api/v1/cms/collaborations/global-reach",
    "/api/v1/cms/settings",
    "/api/v1/cms/services",
    "/api/v1/cms/portfolio",
    "/api/v1/cms/about-me",
    "/api/v1/reviews",
    "/api/v1/hero-video/active",
    "/api/v1/cms/hero-slides"
  ];

  const apiMetrics = [];

  for (const ep of endpoints) {
    const url = `${baseUrl}${ep}`;
    
    // First request: Cache MISS (Fetches from Neon PostgreSQL)
    const t0 = performance.now();
    const resMiss = await fetch(url);
    await resMiss.json();
    const missDuration = performance.now() - t0;
    const missCacheHeader = resMiss.headers.get("X-Cache") || "MISS";

    // Second request: Cache HIT (Served from Redis / In-Memory cache)
    const t1 = performance.now();
    const resHit = await fetch(url);
    await resHit.json();
    const hitDuration = performance.now() - t1;
    const hitCacheHeader = resHit.headers.get("X-Cache") || "HIT";

    // Third request: Warm Cache HIT
    const t2 = performance.now();
    const resHit2 = await fetch(url);
    await resHit2.json();
    const hit2Duration = performance.now() - t2;

    const avgHit = (hitDuration + hit2Duration) / 2;
    const speedup = ((missDuration - avgHit) / missDuration * 100).toFixed(1);

    apiMetrics.push({
      endpoint: ep,
      missMs: Math.round(missDuration),
      hitMs: Math.round(avgHit),
      speedup: `${speedup}% faster`,
      status: resHit.status,
      cacheHeader: hitCacheHeader
    });
  }
  console.table(apiMetrics);

  // 3. Measure Media Storage & Chunk Insert Performance
  console.log("\n[3/5] Measuring Media Upload Chunk Batch Insert Throughput...");
  const testMediaId = "bench_" + Date.now();
  const testFilename = "test_perf_" + Date.now() + ".jpg";
  const dummyChecksum = crypto.randomBytes(32).toString("hex");

  // First create test media entry in Neon PostgreSQL
  await pool.query(
    `INSERT INTO "media" ("_id", "filename", "original_name", "mime_type", "size", "url", "path", "category", "checksum", "upload_status", "total_chunks")
     VALUES ($1, $2, $2, 'image/jpeg', 2097152, $3, $4, 'benchmark', $5, 'uploading', 2)`,
    [testMediaId, testFilename, `/uploads/${testFilename}`, testFilename, dummyChecksum]
  );

  const chunkSize = 1024 * 1024; // 1MB
  const dummyBuffer = Buffer.alloc(chunkSize, 0x42);
  const uploadMetrics = [];

  const startTime = performance.now();
  const client = await pool.connect();
  try {
    const chunkRows = [];
    const values = [];
    for (let i = 0; i < 2; i++) {
      const offset = i * 7;
      chunkRows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      const start = i * chunkSize;
      const end = start + chunkSize - 1;
      const cHash = crypto.createHash("sha256").update(dummyBuffer).digest("hex");
      values.push(testMediaId, i, chunkSize, start, end, dummyBuffer, cHash);
    }
    const query = `
      INSERT INTO media_chunks (media_id, chunk_index, chunk_size, offset_start, offset_end, data, sha256)
      VALUES ${chunkRows.join(", ")}
    `;
    await client.query(query, values);
    const totalTime = performance.now() - startTime;
    uploadMetrics.push({
      totalBytes: "2MB (2 x 1MB chunks)",
      batchQueryTimeMs: Math.round(totalTime),
      effectiveThroughput: `${(2 / (totalTime / 1000)).toFixed(2)} MB/s`,
      avgPerChunkMs: (totalTime / 2).toFixed(1)
    });
  } finally {
    // Clean up test chunks and media entry
    await client.query(`DELETE FROM media_chunks WHERE media_id = $1`, [testMediaId]);
    await client.query(`DELETE FROM media WHERE _id = $1`, [testMediaId]);
    client.release();
  }
  console.table(uploadMetrics);

  // 4. Measure Client Bundle Sizes
  console.log("\n[4/5] Measuring Production Assets & Bundle Sizes (client/dist)...");
  const distAssetsDir = path.resolve("client/dist/assets");
  const bundleFiles = fs.readdirSync(distAssetsDir);
  const bundleReport = [];

  for (const f of bundleFiles) {
    const stat = fs.statSync(path.join(distAssetsDir, f));
    const sizeKb = (stat.size / 1024).toFixed(2);
    if (f.endsWith(".js") || f.endsWith(".css")) {
      bundleReport.push({
        file: f,
        sizeKB: parseFloat(sizeKb)
      });
    }
  }

  // Sort by size descending
  bundleReport.sort((a, b) => b.sizeKB - a.sizeKB);
  console.table(bundleReport.slice(0, 10)); // Top 10 largest assets

  const homePageChunk = bundleReport.find(b => b.file.startsWith("HomePage"));
  const vendorThreeChunk = bundleReport.find(b => b.file.startsWith("vendor-three"));
  const vendorAnimChunk = bundleReport.find(b => b.file.startsWith("vendor-animation"));
  const vendorFwChunk = bundleReport.find(b => b.file.startsWith("vendor-framework"));

  console.log(`\nBundle Summary:`);
  console.log(`- HomePage chunk: ${homePageChunk ? homePageChunk.sizeKB + " KB" : "N/A"}`);
  console.log(`- Three.js vendor chunk (Lazy): ${vendorThreeChunk ? vendorThreeChunk.sizeKB + " KB" : "N/A"}`);
  console.log(`- Framer/GSAP vendor chunk: ${vendorAnimChunk ? vendorAnimChunk.sizeKB + " KB" : "N/A"}`);
  console.log(`- React Framework chunk: ${vendorFwChunk ? vendorFwChunk.sizeKB + " KB" : "N/A"}`);

  // 5. Cleanup
  console.log("\n[5/5] Benchmark Complete. Tearing down...");
  await new Promise((resolve) => server.close(resolve));
  await closePostgresPool();
  console.log("✓ Done.");
}

runBenchmark().catch(err => {
  console.error("Benchmark error:", err);
  process.exit(1);
});

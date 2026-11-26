import fs from "node:fs";
import path from "node:path";
import { getPostgresPool } from "../src/db/postgres.js";
import { saveMediaBufferToNeon, getMediaMetadata } from "../src/db/neonMediaStorage.js";

const UPLOADS_DIR = path.resolve("./server/uploads");

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
}

async function findFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await findFiles(fullPath));
    } else if (entry.isFile() && !entry.name.startsWith(".")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function runMigration() {
  console.log("=== MIGRATING EXISTING MEDIA TO NEON POSTGRESQL ===");
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("No uploads directory found at", UPLOADS_DIR);
    return;
  }

  const allFiles = await findFiles(UPLOADS_DIR);
  console.log(`Discovered ${allFiles.length} file(s) in server/uploads.`);

  let migratedCount = 0;
  let skippedCount = 0;
  let verifiedCount = 0;

  for (const filePath of allFiles) {
    const relativePath = path.relative(UPLOADS_DIR, filePath).replace(/\\/g, "/");
    const mimeType = getMimeType(filePath);
    const parts = relativePath.split("/");
    const folder = parts.length > 1 ? parts[0] : "general";
    const filename = path.basename(filePath);

    // Check if already in Neon
    const existing = await getMediaMetadata(relativePath);
    if (existing) {
      console.log(`[SKIP] Already in Neon: ${relativePath}`);
      skippedCount++;
      continue;
    }

    const buffer = await fs.promises.readFile(filePath);
    console.log(`[MIGRATING] ${relativePath} (${buffer.length} bytes, ${mimeType})...`);

    const result = await saveMediaBufferToNeon({
      buffer,
      originalName: filename,
      mimeType,
      folder,
      altText: filename
    });

    migratedCount++;

    // Verify stored file
    const verified = await getMediaMetadata(result.path);
    if (verified && Number(verified.size) === buffer.length) {
      console.log(`[VERIFIED] ${result.path} - id: ${verified._id}, chunks: ${verified.total_chunks}`);
      verifiedCount++;
    } else {
      console.error(`[VERIFICATION FAILED] ${result.path}`);
      process.exit(1);
    }
  }

  console.log("==================================================");
  console.log(`Migration Complete: ${migratedCount} migrated, ${skippedCount} skipped, ${verifiedCount} verified.`);
  console.log("==================================================");
}

runMigration().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});

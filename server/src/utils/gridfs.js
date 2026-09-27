import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const BUCKET_NAME = "media_uploads";

export function getGridFSBucket() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return null;
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME
  });
}

/**
 * Save a buffer directly to MongoDB GridFS.
 * Stored with filename: `${folder}/${filename}` (e.g. `partners/atelier-123.webp`)
 */
export async function saveBufferToGridFS(filename, buffer, mimeType, folder = "general") {
  const bucket = getGridFSBucket();
  if (!bucket) {
    console.warn(`[GridFS] Cannot save ${filename}: MongoDB is not connected.`);
    return null;
  }

  const targetPath = `${folder}/${filename}`.replace(/^\/+/, "");

  // Safely remove any existing file with identical path
  try {
    const existing = await bucket.find({ filename: targetPath }).toArray();
    for (const f of existing) {
      await bucket.delete(f._id).catch(() => {});
    }
  } catch {
    // Non-fatal if index query fails
  }

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(targetPath, {
      contentType: mimeType,
      metadata: {
        folder,
        filename,
        mimeType,
        size: buffer.length,
        uploadedAt: new Date()
      }
    });

    uploadStream.on("finish", () => {
      resolve({
        id: uploadStream.id,
        filename: targetPath,
        size: buffer.length
      });
    });

    uploadStream.on("error", (err) => {
      console.error(`[GridFS Error] Upload failed for ${targetPath}:`, err.message);
      reject(err);
    });

    uploadStream.end(buffer);
  });
}

/**
 * Retrieve a readable stream and file metadata from GridFS.
 * @param {string} filePath - e.g. "partners/photo.webp" or "resumes/candidate.pdf"
 */
export async function getFileStreamFromGridFS(filePath) {
  const bucket = getGridFSBucket();
  if (!bucket) return null;

  const cleanPath = String(filePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "")
    .replace(/^api\/uploads\//, "");

  if (!cleanPath) return null;

  try {
    const files = await bucket.find({ filename: cleanPath }).limit(1).toArray();
    if (!files || files.length === 0) return null;

    const fileDoc = files[0];
    const stream = bucket.openDownloadStream(fileDoc._id);
    return { stream, fileDoc };
  } catch (err) {
    console.error(`[GridFS Error] Query failed for ${cleanPath}:`, err.message);
    return null;
  }
}

/**
 * Delete a file by path from GridFS.
 */
export async function deleteFromGridFS(filePath) {
  const bucket = getGridFSBucket();
  if (!bucket) return false;

  const cleanPath = String(filePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "")
    .replace(/^api\/uploads\//, "");

  if (!cleanPath) return false;

  try {
    const files = await bucket.find({ filename: cleanPath }).toArray();
    for (const f of files) {
      await bucket.delete(f._id).catch(() => {});
    }
    return true;
  } catch (err) {
    console.error(`[GridFS Error] Delete failed for ${cleanPath}:`, err.message);
    return false;
  }
}

/**
 * Synchronize files found on local disk to MongoDB GridFS.
 * Runs non-blockingly during server boot to ensure any existing disk assets exist in GridFS.
 */
export async function syncLocalUploadsToGridFS(baseUploadsDir) {
  const bucket = getGridFSBucket();
  if (!bucket || !fs.existsSync(baseUploadsDir)) return;

  async function walkAndSync(currentDir, relativePrefix = "") {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await walkAndSync(fullPath, relPath);
        } else if (entry.isFile()) {
          const cleanRel = relPath.replace(/\\/g, "/");
          const existing = await bucket.find({ filename: cleanRel }).limit(1).toArray();
          if (existing.length === 0) {
            const buffer = fs.readFileSync(fullPath);
            let mimeType = "application/octet-stream";
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === ".webp") mimeType = "image/webp";
            else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
            else if (ext === ".png") mimeType = "image/png";
            else if (ext === ".mp4") mimeType = "video/mp4";
            else if (ext === ".pdf") mimeType = "application/pdf";

            const parts = cleanRel.split("/");
            const filename = parts.pop();
            const folder = parts.join("/") || "general";

            await saveBufferToGridFS(filename, buffer, mimeType, folder).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn(`[GridFS Sync] Non-fatal note syncing ${currentDir}:`, err.message);
    }
  }

  try {
    await walkAndSync(baseUploadsDir);
  } catch (err) {
    console.warn("[GridFS Sync] Sync completed with notes:", err.message);
  }
}

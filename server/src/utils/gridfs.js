import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectGridFs, getGridFsConnection } from "../config/gridfsDb.js";
import { isPostgresSelected } from "../config/databaseMode.js";

const BUCKET_NAME = "media_uploads";
const UPLOAD_PARTS_BUCKET_NAME = "media_upload_parts";
let uploadPartsExpiryIndexPromise = null;

export function getGridFSBucket() {
  const connection = getGridFsConnection();
  if (connection?.readyState !== 1 || !connection.db) {
    return null;
  }
  return new mongoose.mongo.GridFSBucket(connection.db, {
    bucketName: BUCKET_NAME
  });
}

function getUploadPartsBucket() {
  const connection = getGridFsConnection();
  if (connection?.readyState !== 1 || !connection.db) return null;
  return new mongoose.mongo.GridFSBucket(connection.db, { bucketName: UPLOAD_PARTS_BUCKET_NAME });
}

export async function saveUploadPart(uploadId, index, buffer) {
  const bucket = getUploadPartsBucket();
  if (!bucket) throw new Error("MongoDB is unavailable for upload storage.");
  const filename = `${uploadId}/${index}`;
  const prior = await bucket.find({ filename }).toArray();
  await Promise.all(prior.map((file) => bucket.delete(file._id)));
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, {
      metadata: { uploadId, index, size: buffer.length, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    });
    stream.once("finish", () => resolve());
    stream.once("error", reject);
    stream.end(buffer);
  });
}

export async function readUploadParts(uploadId, expectedCount, expectedSize) {
  const bucket = getUploadPartsBucket();
  if (!bucket) throw new Error("MongoDB is unavailable for upload storage.");
  const files = await bucket.find({ "metadata.uploadId": uploadId }).toArray();
  files.sort((a, b) => a.metadata.index - b.metadata.index);
  if (files.length !== expectedCount || files.some((file, index) => file.metadata.index !== index)) {
    const error = new Error("Upload is incomplete. Please retry the upload.");
    error.status = 400;
    throw error;
  }
  const buffers = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const chunks = [];
    const stream = bucket.openDownloadStream(file._id);
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.once("error", reject);
    stream.once("end", () => resolve(Buffer.concat(chunks)));
  })));
  const buffer = Buffer.concat(buffers);
  if (buffer.length !== expectedSize) {
    const error = new Error("Upload size did not match the original file.");
    error.status = 400;
    throw error;
  }
  return buffer;
}

export async function deleteUploadParts(uploadId) {
  const bucket = getUploadPartsBucket();
  if (!bucket) return;
  const files = await bucket.find({ "metadata.uploadId": uploadId }).toArray();
  await Promise.all(files.map((file) => bucket.delete(file._id).catch(() => {})));
}

export async function cleanupExpiredUploadParts() {
  const bucket = getUploadPartsBucket();
  if (!bucket) return;
  if (!uploadPartsExpiryIndexPromise) {
    uploadPartsExpiryIndexPromise = getGridFsConnection().db
      .collection(`${UPLOAD_PARTS_BUCKET_NAME}.files`)
      .createIndex({ "metadata.expiresAt": 1 })
      .catch((error) => {
        uploadPartsExpiryIndexPromise = null;
        throw error;
      });
  }
  await uploadPartsExpiryIndexPromise;
  const expired = await bucket.find({ "metadata.expiresAt": { $lte: new Date() } }).toArray();
  await Promise.all(expired.map((file) => bucket.delete(file._id).catch(() => {})));
}

/**
 * Save a buffer directly to MongoDB GridFS.
 * Stored with filename: `${folder}/${filename}` (e.g. `partners/atelier-123.webp`)
 */
export async function saveBufferToGridFS(filename, buffer, mimeType, folder = "general") {
  await connectGridFs();
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new Error("MongoDB is unavailable for persistent media storage.");
  }

  const targetPath = `${folder}/${filename}`.replace(/^\/+/, "");

  // Safely remove any existing file with identical path
  let existing = [];
  try {
    existing = await bucket.find({ filename: targetPath }).toArray();
  } catch {
    // Non-fatal if index query fails
  }
  if (existing.length && isPostgresSelected()) {
    throw new Error("A GridFS file with this path already exists; existing rollback media was preserved.");
  }
  try {
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
  await connectGridFs();
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
  await connectGridFs();
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
  await connectGridFs();
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

import mongoose from "mongoose";
import { isRemoteMongoUri } from "../src/config/env.js";

const FILES_BUCKET = "media_uploads";

function databaseIdentity(uri) {
  const parsed = new URL(uri);
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}:${parsed.port}${parsed.pathname.replace(/\/$/, "")}`;
}

export function validateGridFsCopyTarget({ vercelEnv, target, sourceUri, previewUri, apply, confirmation }) {
  if (vercelEnv !== "preview" || target !== "preview-staging") {
    throw new Error("GridFS copy is restricted to VERCEL_ENV=preview and MIGRATION_TARGET=preview-staging.");
  }
  if (!isRemoteMongoUri(sourceUri) || !isRemoteMongoUri(previewUri)) {
    throw new Error("GridFS copy requires explicit remote MongoDB source and Preview destination URIs.");
  }
  if (databaseIdentity(sourceUri) === databaseIdentity(previewUri)) {
    throw new Error("GridFS copy source and Preview destination must be different MongoDB databases.");
  }
  if (apply && confirmation !== "preview-staging") {
    throw new Error("GridFS copy apply requires CONFIRM_GRIDFS_COPY=preview-staging.");
  }
  return "preview-staging";
}

function sameFileMetadata(source, target) {
  return source.filename === target.filename &&
    Number(source.length) === Number(target.length) &&
    Number(source.chunkSize) === Number(target.chunkSize) &&
    new Date(source.uploadDate).getTime() === new Date(target.uploadDate).getTime() &&
    (source.contentType || null) === (target.contentType || null) &&
    JSON.stringify(source.metadata ?? null) === JSON.stringify(target.metadata ?? null);
}

function sameChunk(source, target) {
  const bytes = (value) => {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value?.value === "function") return Buffer.from(value.value(true));
    if (value?.buffer) return Buffer.from(value.buffer).subarray(0, value.position ?? value.buffer.byteLength);
    return Buffer.from(value);
  };
  return String(source._id) === String(target._id) &&
    Number(source.n) === Number(target.n) &&
    Buffer.compare(bytes(source.data), bytes(target.data)) === 0;
}

export async function copyGridFsBucket({ sourceFiles, sourceChunks, targetFiles, targetChunks, apply = false }) {
  const sourceFileCount = await sourceFiles.countDocuments();
  const sourceChunkCount = await sourceChunks.countDocuments();
  let copiedFiles = 0;
  let copiedChunks = 0;
  let existingFiles = 0;
  let existingChunks = 0;

  for await (const sourceFile of sourceFiles.find({}).sort({ _id: 1 })) {
    const existingFile = await targetFiles.findOne({ _id: sourceFile._id });
    if (existingFile && !sameFileMetadata(sourceFile, existingFile)) {
      throw new Error(`Conflicting Preview GridFS file metadata for source file ${String(sourceFile._id)}.`);
    }
    if (existingFile) existingFiles += 1;

    let fileChunkCount = 0;
    for await (const sourceChunk of sourceChunks.find({ files_id: sourceFile._id }).sort({ n: 1 })) {
      if (Number(sourceChunk.n) !== fileChunkCount) {
        throw new Error(`Source GridFS chunks are incomplete or out of order for file ${String(sourceFile._id)}.`);
      }
      fileChunkCount += 1;
      const existingChunk = await targetChunks.findOne({ files_id: sourceFile._id, n: sourceChunk.n });
      if (existingChunk) {
        if (!sameChunk(sourceChunk, existingChunk)) {
          throw new Error(`Conflicting Preview GridFS chunk ${sourceChunk.n} for source file ${String(sourceFile._id)}.`);
        }
        existingChunks += 1;
      } else {
        copiedChunks += 1;
        if (apply) await targetChunks.insertOne(sourceChunk);
      }
    }
    const expectedChunks = Math.ceil(Number(sourceFile.length) / Number(sourceFile.chunkSize));
    if (!Number.isFinite(expectedChunks) || fileChunkCount !== expectedChunks) {
      throw new Error(`Source GridFS chunk count does not match file length for file ${String(sourceFile._id)}.`);
    }

    if (!existingFile) {
      copiedFiles += 1;
      if (apply) await targetFiles.insertOne(sourceFile);
    }
  }

  let verifiedFiles = 0;
  let verifiedChunks = 0;
  if (apply) {
    for await (const sourceFile of sourceFiles.find({}).sort({ _id: 1 })) {
      const targetFile = await targetFiles.findOne({ _id: sourceFile._id });
      if (!targetFile || !sameFileMetadata(sourceFile, targetFile)) {
        throw new Error(`GridFS copy verification failed for file ${String(sourceFile._id)}.`);
      }
      verifiedFiles += 1;
      let chunkNumber = 0;
      for await (const sourceChunk of sourceChunks.find({ files_id: sourceFile._id }).sort({ n: 1 })) {
        const targetChunk = await targetChunks.findOne({ files_id: sourceFile._id, n: sourceChunk.n });
        if (Number(sourceChunk.n) !== chunkNumber || !targetChunk || !sameChunk(sourceChunk, targetChunk)) {
          throw new Error(`GridFS copy verification failed for chunk ${sourceChunk.n} of file ${String(sourceFile._id)}.`);
        }
        chunkNumber += 1;
        verifiedChunks += 1;
      }
      if (chunkNumber !== Math.ceil(Number(sourceFile.length) / Number(sourceFile.chunkSize))) {
        throw new Error(`GridFS source changed during copy for file ${String(sourceFile._id)}; rerun after it settles.`);
      }
    }
    if (verifiedFiles !== sourceFileCount || verifiedChunks !== sourceChunkCount) {
      throw new Error("GridFS source changed during copy; rerun Preview staging so the destination can catch up.");
    }
  }

  const [targetFileCount, targetChunkCount] = await Promise.all([
    targetFiles.countDocuments(),
    targetChunks.countDocuments()
  ]);
  if (apply && (targetFileCount < sourceFileCount || targetChunkCount < sourceChunkCount)) {
    throw new Error("GridFS copy verification failed: Preview has fewer files or chunks than the source.");
  }

  return {
    sourceFileCount,
    sourceChunkCount,
    targetFileCount,
    targetChunkCount,
    copiedFiles,
    copiedChunks,
    existingFiles,
    existingChunks,
    verifiedFiles,
    verifiedChunks
  };
}

export async function copyProductionGridFsToPreview({ apply = process.argv.includes("--apply") } = {}) {
  const sourceUri = process.env.GRIDFS_MONGODB_URI || process.env.MONGODB_URI;
  const previewUri = process.env.PREVIEW_GRIDFS_MONGODB_URI;
  validateGridFsCopyTarget({
    vercelEnv: process.env.VERCEL_ENV,
    target: process.env.MIGRATION_TARGET,
    sourceUri,
    previewUri,
    apply,
    confirmation: process.env.CONFIRM_GRIDFS_COPY
  });

  const options = (uri) => ({
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    bufferCommands: false,
    ...(uri.startsWith("mongodb+srv://") ? { tlsAllowInvalidCertificates: true } : {})
  });
  const source = await mongoose.createConnection(sourceUri, options(sourceUri)).asPromise();
  let preview;
  try {
    preview = await mongoose.createConnection(previewUri, options(previewUri)).asPromise();
    const sourceFiles = source.db.collection(`${FILES_BUCKET}.files`);
    const sourceChunks = source.db.collection(`${FILES_BUCKET}.chunks`);
    const targetFiles = preview.db.collection(`${FILES_BUCKET}.files`);
    const targetChunks = preview.db.collection(`${FILES_BUCKET}.chunks`);

    if (apply) {
      await targetFiles.createIndex({ filename: 1, uploadDate: 1 });
      await targetChunks.createIndex({ files_id: 1, n: 1 }, { unique: true });
    }

    const summary = await copyGridFsBucket({ sourceFiles, sourceChunks, targetFiles, targetChunks, apply });
    console.info(`[gridfs-copy] ${JSON.stringify(summary)}`);
    console.info(apply
      ? "Preview GridFS copy complete. Source Atlas files and chunks were preserved."
      : "Dry run only. Preview GridFS was not changed; add --apply and CONFIRM_GRIDFS_COPY=preview-staging during the approved staging window to copy.");
    return summary;
  } finally {
    await Promise.allSettled([source.close(), preview?.close()]);
  }
}

if (process.argv[1] && process.argv[1].endsWith("copy-gridfs-to-preview.mjs")) {
  copyProductionGridFsToPreview().catch((error) => {
    console.error(`[gridfs-copy] Failed: ${error.message}`);
    process.exitCode = 1;
  });
}

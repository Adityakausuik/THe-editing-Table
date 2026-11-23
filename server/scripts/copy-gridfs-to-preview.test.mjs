import test from "node:test";
import assert from "node:assert/strict";
import { copyGridFsBucket, validateGridFsCopyTarget } from "./copy-gridfs-to-preview.mjs";

const sourceUri = "mongodb+srv://source:unused@cluster.example/production";
const previewUri = "mongodb+srv://preview:unused@cluster.example/preview";

test("GridFS copy only accepts an isolated Preview target", () => {
  assert.equal(validateGridFsCopyTarget({
    vercelEnv: "preview", target: "preview-staging", sourceUri, previewUri, apply: false
  }), "preview-staging");
  assert.throws(() => validateGridFsCopyTarget({
    vercelEnv: "production", target: "production", sourceUri, previewUri, apply: false
  }), /restricted to VERCEL_ENV=preview/);
  assert.throws(() => validateGridFsCopyTarget({
    vercelEnv: "preview", target: "preview-staging", sourceUri,
    previewUri: "mongodb+srv://different-user:unused@cluster.example/production", apply: false
  }), /different MongoDB databases/);
  assert.throws(() => validateGridFsCopyTarget({
    vercelEnv: "preview", target: "preview-staging", sourceUri, previewUri, apply: true
  }), /CONFIRM_GRIDFS_COPY=preview-staging/);
});

function cursor(items) {
  return {
    sort() { return this; },
    async *[Symbol.asyncIterator]() { yield* items; }
  };
}

function collection(items = []) {
  return {
    items: [...items],
    async countDocuments() { return this.items.length; },
    find(filter = {}) {
      const rows = this.items.filter((item) => filter.files_id === undefined || String(item.files_id) === String(filter.files_id));
      return cursor(rows);
    },
    async findOne(filter) {
      return this.items.find((item) => Object.entries(filter).every(([key, value]) => String(item[key]) === String(value))) || null;
    },
    async insertOne(item) { this.items.push(item); }
  };
}

test("GridFS dry run reports missing files and chunks without writing", async () => {
  const file = { _id: "file-1", filename: "services/cover.webp", length: 3, chunkSize: 255, uploadDate: new Date(1), metadata: { folder: "services" } };
  const chunk = { _id: "chunk-1", files_id: "file-1", n: 0, data: Buffer.from("abc") };
  const sourceFiles = collection([file]);
  const sourceChunks = collection([chunk]);
  const targetFiles = collection();
  const targetChunks = collection();

  const result = await copyGridFsBucket({ sourceFiles, sourceChunks, targetFiles, targetChunks });
  assert.equal(result.copiedFiles, 1);
  assert.equal(result.copiedChunks, 1);
  assert.equal(targetFiles.items.length, 0);
  assert.equal(targetChunks.items.length, 0);
});

test("GridFS apply preserves IDs and resumes safely without replacing existing files", async () => {
  const file = { _id: "file-1", filename: "resumes/candidate.pdf", length: 3, chunkSize: 255, uploadDate: new Date(1), metadata: { private: true } };
  const chunk = { _id: "chunk-1", files_id: "file-1", n: 0, data: Buffer.from("abc") };
  const sourceFiles = collection([file]);
  const sourceChunks = collection([chunk]);
  const targetFiles = collection();
  const targetChunks = collection();

  const first = await copyGridFsBucket({ sourceFiles, sourceChunks, targetFiles, targetChunks, apply: true });
  const second = await copyGridFsBucket({ sourceFiles, sourceChunks, targetFiles, targetChunks, apply: true });
  assert.equal(first.copiedFiles, 1);
  assert.equal(first.copiedChunks, 1);
  assert.equal(second.copiedFiles, 0);
  assert.equal(second.copiedChunks, 0);
  assert.equal(targetFiles.items[0]._id, file._id);
  assert.equal(targetChunks.items[0]._id, chunk._id);
});

test("GridFS copy stops on conflicting target content and never overwrites", async () => {
  const file = { _id: "file-1", filename: "services/cover.webp", length: 3, chunkSize: 255, uploadDate: new Date(1), metadata: null };
  const targetFile = { ...file, filename: "services/other.webp" };
  await assert.rejects(copyGridFsBucket({
    sourceFiles: collection([file]), sourceChunks: collection(),
    targetFiles: collection([targetFile]), targetChunks: collection(), apply: true
  }), /Conflicting Preview GridFS file metadata/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { getBlobAccess, getBlobToken, isBlobStorageConfigured, isVercelBlobUrl } from "./blobStorage.js";

test("only HTTPS Vercel Blob hostnames are treated as managed media", () => {
  assert.equal(isVercelBlobUrl("https://abc.public.blob.vercel-storage.com/photo.webp"), true);
  assert.equal(isVercelBlobUrl("https://abc.private.blob.vercel-storage.com/resume.pdf"), true);
  assert.equal(isVercelBlobUrl("https://evil.example/public.blob.vercel-storage.com/photo.webp"), false);
  assert.equal(isVercelBlobUrl("http://abc.public.blob.vercel-storage.com/photo.webp"), false);
  assert.equal(getBlobAccess("https://abc.private.blob.vercel-storage.com/resume.pdf"), "private");
});

test("public and private storage tokens remain separate", () => {
  const previousPublic = process.env.BLOB_READ_WRITE_TOKEN;
  const previousPrivate = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
  try {
    process.env.BLOB_READ_WRITE_TOKEN = "test-public";
    process.env.BLOB_PRIVATE_READ_WRITE_TOKEN = "test-private";
    assert.equal(getBlobToken("public"), "test-public");
    assert.equal(getBlobToken("private"), "test-private");
    assert.equal(isBlobStorageConfigured("public"), true);
    assert.equal(isBlobStorageConfigured("private"), true);
  } finally {
    if (previousPublic === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = previousPublic;
    if (previousPrivate === undefined) delete process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
    else process.env.BLOB_PRIVATE_READ_WRITE_TOKEN = previousPrivate;
  }
});

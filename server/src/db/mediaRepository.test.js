import test from "node:test";
import assert from "node:assert/strict";
import Media from "../models/Media.model.js";
import { mapPostgresCmsRow } from "./cmsRepository.js";
import { buildPostgresMediaUploadPartCount } from "./mediaUploadRepository.js";

test("media metadata maps from PostgreSQL columns into the existing API document shape", () => {
  const row = {
    _id: "507f1f77bcf86cd799439011",
    __v: 0,
    filename: "photo.webp",
    original_name: "Photo.jpg",
    mime_type: "image/webp",
    size: 1234,
    url: "https://example.public.blob.vercel-storage.com/photo.webp",
    path: "services/photo.webp",
    category: "services",
    alt_text: "Photo",
    uploaded_by: null,
    created_at: new Date("2026-01-01T00:00:00Z"),
    updated_at: new Date("2026-01-01T00:00:00Z")
  };
  const media = mapPostgresCmsRow(Media, row);
  assert.equal(media._id, row._id);
  assert.equal(media.originalName, "Photo.jpg");
  assert.equal(media.mimeType, "image/webp");
  assert.equal(media.category, "services");
  assert.equal(media.url, row.url);
});

test("chunk count rounds up and rejects unsafe sizes", () => {
  assert.equal(buildPostgresMediaUploadPartCount(1, 3), 1);
  assert.equal(buildPostgresMediaUploadPartCount(7, 3), 3);
  assert.throws(() => buildPostgresMediaUploadPartCount(0, 3), /positive safe integers/);
  assert.throws(() => buildPostgresMediaUploadPartCount(3, 0), /positive safe integers/);
});

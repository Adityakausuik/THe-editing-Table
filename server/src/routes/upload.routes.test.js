/* global fetch */
import assert from "node:assert/strict";
import test from "node:test";

// Keep this route-only test isolated from Atlas and startup bootstrap writes.
process.env.NODE_ENV = "test";
const { createApp } = await import("../app.js");

test("chunked upload endpoints require authenticated admin access", async () => {
  const server = createApp().listen(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const requests = [
      ["/api/v1/upload/chunked/start", { folder: "weddings", mimeType: "image/jpeg", size: 1 }],
      ["/api/v1/upload/chunked/part", {}],
      ["/api/v1/upload/chunked/finish", {}],
      ["/api/v1/upload/chunked/abort", {}]
    ];
    for (const [path, body] of requests) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      assert.equal(response.status, 401, `${path} should reject an unauthenticated caller`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

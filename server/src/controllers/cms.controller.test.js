import assert from "node:assert/strict";
import test from "node:test";

// Select the isolated Preview PostgreSQL mode before importing the controller.
// These invalid-input cases must stop before any database operation.
process.env.VERCEL_ENV = "preview";
process.env.PREVIEW_DATABASE_URL = "postgresql://preview:unused@localhost/staging";

const { createUser, deleteUser } = await import("./cms.controller.js");

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("PostgreSQL CMS user creation validates input properly", async () => {
  const res = responseRecorder();
  await createUser({ body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /required/i);
});

test("PostgreSQL CMS user deletion validates IDs properly", async () => {
  const res = responseRecorder();
  await deleteUser({ params: { id: "invalid" }, user: { id: "other" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Invalid user ID");
});

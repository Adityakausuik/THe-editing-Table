import assert from "node:assert/strict";
import test from "node:test";
import { createMigrationWriteFreeze } from "./migrationWriteFreeze.js";

function mockResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("migration write freeze blocks all mutating HTTP methods with a retry hint", () => {
  const middleware = createMigrationWriteFreeze({ enabled: true });
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = mockResponse();
    let continued = false;
    middleware({ method }, response, () => { continued = true; });
    assert.equal(continued, false, `${method} must stop before the route handler`);
    assert.equal(response.statusCode, 503);
    assert.equal(response.headers["Retry-After"], "300");
    assert.equal(response.body.code, "MIGRATION_MAINTENANCE");
  }
});

test("migration write freeze preserves read and preflight traffic", () => {
  const middleware = createMigrationWriteFreeze({ enabled: true });
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    const response = mockResponse();
    let continued = false;
    middleware({ method }, response, () => { continued = true; });
    assert.equal(continued, true, `${method} must continue`);
    assert.equal(response.statusCode, null);
  }
});

test("migration write freeze is inert unless explicitly enabled", () => {
  const response = mockResponse();
  let continued = false;
  createMigrationWriteFreeze({ enabled: false })({ method: "POST" }, response, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(response.statusCode, null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildPostgresSecurityAudit } from "./audit.js";

test("PostgreSQL security audit uses bound values and includes request metadata", () => {
  const query = buildPostgresSecurityAudit({
    user: { _id: { toString: () => "user-1" }, email: "admin@example.test", role: "admin" },
    action: "LOGIN_FAILED",
    result: "failure",
    entity: "Security",
    entityId: "user-1",
    details: { reason: "invalid password" },
    ipAddress: "203.0.113.1",
    userAgent: "test-agent",
    metadata: { attempt: 2 }
  });

  assert.match(query.text, /INSERT INTO "auditlogs"/);
  assert.match(query.text, /\$7::jsonb/);
  assert.match(query.text, /\$11::jsonb/);
  assert.equal(query.values[0], "user-1");
  assert.equal(query.values[3], "LOGIN_FAILED");
  assert.equal(query.values[6], JSON.stringify({ reason: "invalid password" }));
  assert.equal(query.values[7], "203.0.113.1");
  assert.equal(query.values[9], "failure");
  assert.equal(query.values[10], JSON.stringify({ attempt: 2 }));
});

test("PostgreSQL system security audit permits a missing user", () => {
  const query = buildPostgresSecurityAudit({
    action: "AUTHENTICATION_UNAVAILABLE",
    result: "info",
    entity: "Security"
  });

  assert.equal(query.values[0], null);
  assert.equal(query.values[1], "system");
  assert.equal(query.values[2], "unknown");
  assert.equal(query.values[5], "");
});

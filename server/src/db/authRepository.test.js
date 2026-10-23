import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPostgresCmsUserDeleteDecision,
  buildPostgresActiveUserLookup,
  buildPostgresAuthSessionLookup,
  collectPostgresAuthUserChanges,
  hydratePostgresAuthUser,
  mapPostgresAuthSession,
  mapPostgresAuthUser,
  mapPostgresCmsUserRow
} from "./authRepository.js";

test("auth session lookup requires matching user, active session and unexpired timestamp", () => {
  const now = new Date("2026-10-19T12:00:00.000Z");
  const query = buildPostgresAuthSessionLookup("session-1", "user-1", now);

  assert.match(query.text, /"_id" = \$1/);
  assert.match(query.text, /"user" = \$2/);
  assert.match(query.text, /"revoked_at" IS NULL/);
  assert.match(query.text, /"expires_at" > \$3/);
  assert.deepEqual(query.values, ["session-1", "user-1", now]);
});

test("active user lookup exposes only the authentication middleware profile fields", () => {
  const query = buildPostgresActiveUserLookup("user-1");

  assert.match(query.text, /"is_active" = TRUE/);
  assert.match(query.text, /"two_factor__enabled"/);
  assert.doesNotMatch(query.text, /password_hash|secret_encrypted|recovery_code/);
  assert.deepEqual(query.values, ["user-1"]);
});

test("PostgreSQL auth rows map to the session and user shapes expected by middleware", () => {
  const session = mapPostgresAuthSession({ _id: "session-1", user: "user-1", expires_at: new Date("2026-11-01"), revoked_at: null });
  const user = mapPostgresAuthUser({ _id: "user-1", name: "Admin", email: "admin@example.test", role: "admin", is_active: true, two_factor__enabled: true, two_factor__required: false });

  assert.equal(session._id, "session-1");
  assert.equal(session.user, "user-1");
  assert.equal(user._id, "user-1");
  assert.equal(user.twoFactor.enabled, true);
  assert.equal(user.twoFactor.required, false);
});

test("CMS PostgreSQL user projection excludes password, TOTP secrets and recovery hashes", () => {
  const user = mapPostgresCmsUserRow({
    _id: "user-1",
    name: "Admin",
    email: "admin@example.test",
    role: "admin",
    is_active: true,
    two_factor__enabled: true,
    two_factor__required: true,
    password_hash: "must-not-leak",
    two_factor__secret_encrypted: "must-not-leak",
    two_factor__pending_secret_encrypted: "must-not-leak",
    two_factor__recovery_code_hashes: ["must-not-leak"]
  });

  assert.equal(user._id, "user-1");
  assert.equal(user.twoFactor.enabled, true);
  assert.equal(user.twoFactor.required, true);
  assert.equal("passwordHash" in user, false);
  assert.equal("secretEncrypted" in user.twoFactor, false);
  assert.equal("pendingSecretEncrypted" in user.twoFactor, false);
  assert.equal("recoveryCodeHashes" in user.twoFactor, false);
});

test("CMS user deletion preserves the final active superadministrator", () => {
  assert.deepEqual(buildPostgresCmsUserDeleteDecision(null, 0), { deleted: false, reason: "not_found" });
  assert.deepEqual(buildPostgresCmsUserDeleteDecision({ role: "superadmin", is_active: true }, 1), {
    deleted: false,
    reason: "last_superadmin"
  });
  assert.deepEqual(buildPostgresCmsUserDeleteDecision({ role: "superadmin", is_active: true }, 2), { deleted: true, reason: null });
  assert.deepEqual(buildPostgresCmsUserDeleteDecision({ role: "superadmin", is_active: false }, 0), { deleted: true, reason: null });
  assert.deepEqual(buildPostgresCmsUserDeleteDecision({ role: "editor", is_active: true }, 1), { deleted: true, reason: null });
});

test("hydrated PostgreSQL auth users preserve Mongoose password behavior and collect nested updates", () => {
  const user = hydratePostgresAuthUser({
    _id: "0123456789abcdef01234567",
    name: "Admin",
    email: "admin@example.test",
    password_hash: "stored-hash",
    is_active: true,
    force_security_setup: false,
    two_factor__enabled: false,
    two_factor__required: false,
    two_factor__failed_attempts: 0,
    two_factor__lock_until: null
  });

  user.twoFactor.failedAttempts = 3;
  user.twoFactor.lockUntil = undefined;
  user.forceSecuritySetup = true;
  const changes = collectPostgresAuthUserChanges(user);

  assert.equal(typeof user.comparePassword, "function");
  assert.equal(changes.twoFactor.failedAttempts, 3);
  assert.equal(changes.twoFactor.lockUntil, null);
  assert.equal(changes.forceSecuritySetup, true);
  assert.equal(changes.passwordHash, undefined);
});

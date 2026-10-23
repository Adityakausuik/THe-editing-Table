import { getPostgresPool } from "./postgres.js";
import User from "../models/User.model.js";
import AuditLog from "../models/AuditLog.model.js";
import { mapPostgresCmsRow, updatePostgresCmsRecord } from "./cmsRepository.js";
import crypto from "node:crypto";
import { hashOtp } from "../utils/security.js";

const AUTH_USER_COLUMNS = [
  '"_id"', '"name"', '"email"', '"role"', '"avatar"', '"is_active"',
  '"last_login_at"', '"last_login_ip"', '"force_security_setup"', '"failed_password_attempts"',
  '"account_lock_until"', '"two_factor__enabled"', '"two_factor__required"', '"two_factor__method"',
  '"two_factor__activated_at"', '"two_factor__last_authenticated_at"', '"two_factor__last_used_counter"',
  '"two_factor__failed_attempts"', '"two_factor__lock_until"', '"two_factor__reset_at"', '"__v"',
  '"created_at"', '"updated_at"'
];
const AUTH_USER_SECRET_COLUMNS = [
  '"pre_auth_nonce_hash"', '"two_factor__secret_encrypted"', '"two_factor__pending_secret_encrypted"',
  '"two_factor__recovery_code_hashes"'
];

function selectAuthUser(where, values, { includeSecrets = false, includePassword = false } = {}) {
  const columns = AUTH_USER_COLUMNS.slice();
  if (includeSecrets) columns.push(...AUTH_USER_SECRET_COLUMNS);
  if (includePassword) columns.push('"password_hash"');
  return { text: `SELECT ${columns.join(", ")} FROM "users" WHERE ${where} LIMIT 1`, values };
}

export function collectPostgresAuthUserChanges(userDocument) {
  const changed = {};
  for (const path of userDocument.modifiedPaths()) {
    const schemaPath = User.schema.path(path);
    if (!schemaPath) continue;
    const value = userDocument.get(path);
    const parts = path.split(".");
    let target = changed;
    for (const part of parts.slice(0, -1)) target = target[part] ||= {};
    target[parts.at(-1)] = value === undefined ? null : value;
  }
  return changed;
}

export function hydratePostgresAuthUser(row) {
  if (!row) return null;
  const doc = User.hydrate(mapPostgresCmsRow(User, row));
  doc.save = async function savePostgresUser() {
    const changed = collectPostgresAuthUserChanges(this);
    if (Object.keys(changed).length) {
      const saved = await updatePostgresCmsRecord(User, String(this._id), changed, { expectedVersion: this.__v });
      if (!saved) throw new Error("Authentication user changed during this request. Reload and retry.");
      this.__v = saved.__v;
      this.$__reset();
    }
    return this;
  };
  return doc;
}

export function buildPostgresAuthUserByEmailQuery(email, options = {}) {
  return selectAuthUser('"email" = $1', [email], options);
}

export function buildPostgresAuthUserByIdQuery(userId, options = {}) {
  return selectAuthUser('"_id" = $1', [String(userId)], options);
}

export async function findPostgresAuthUserByEmail(email, options = {}) {
  const query = buildPostgresAuthUserByEmailQuery(email, options);
  const result = await getPostgresPool().query(query.text, query.values);
  return hydratePostgresAuthUser(result.rows[0]);
}

export async function findPostgresAuthUserById(userId, options = {}) {
  const query = buildPostgresAuthUserByIdQuery(userId, options);
  const result = await getPostgresPool().query(query.text, query.values);
  return hydratePostgresAuthUser(result.rows[0]);
}

export async function listPostgresManagedAuthUsers({ search = "", role = "", status = "", actorRole = "" } = {}) {
  const values = [];
  const filters = [];
  if (role) filters.push(`"role" = $${values.push(role)}`);
  if (status === "enabled") filters.push('"two_factor__enabled" = TRUE');
  if (status === "disabled") filters.push('"two_factor__enabled" IS DISTINCT FROM TRUE');
  if (actorRole !== "superadmin") filters.push('"role" = ANY(ARRAY[\'editor\', \'client\', \'user\']::text[])');
  if (search) {
    const escaped = String(search).replace(/[\\%_]/g, "\\$&");
    const parameter = `$${values.push(`%${escaped}%`)}`;
    filters.push(`("name" ILIKE ${parameter} ESCAPE E'\\\\' OR "email" ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  const result = await getPostgresPool().query(
    `SELECT "_id", "name", "email", "role", "is_active", "two_factor__enabled", "two_factor__required", "two_factor__method", "two_factor__activated_at", "two_factor__last_authenticated_at", "two_factor__failed_attempts", "two_factor__lock_until", "two_factor__recovery_code_hashes", "last_login_at", "last_login_ip", "force_security_setup", "account_lock_until", "created_at" ` +
      `FROM "users"${filters.length ? ` WHERE ${filters.join(" AND ")}` : ""} ORDER BY "created_at" DESC LIMIT 250`,
    values
  );
  return result.rows.map((row) => mapPostgresCmsRow(User, row));
}

export async function findPostgresSuperadmin() {
  const query = selectAuthUser('"role" = $1', ["superadmin"], { includeSecrets: true });
  const result = await getPostgresPool().query(query.text, query.values);
  return hydratePostgresAuthUser(result.rows[0]);
}

export async function createPostgresAuthUser({ name, email, passwordHash, role, isActive = true, forceSecuritySetup = false, twoFactorRequired = false }) {
  const userId = crypto.randomBytes(12).toString("hex");
  const result = await getPostgresPool().query(
    `INSERT INTO "users" ("_id", "name", "email", "password_hash", "role", "is_active", "force_security_setup", "two_factor__required", "created_at", "updated_at") ` +
      `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now()) RETURNING *`,
    [userId, name, String(email).trim().toLowerCase(), passwordHash, role, isActive, forceSecuritySetup, twoFactorRequired]
  );
  return hydratePostgresAuthUser(result.rows[0]);
}

export function mapPostgresCmsUserRow(row) {
  return {
    _id: row._id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    forceSecuritySetup: row.force_security_setup,
    twoFactor: {
      enabled: row.two_factor__enabled,
      required: row.two_factor__required,
      method: row.two_factor__method,
      activatedAt: row.two_factor__activated_at,
      lastAuthenticatedAt: row.two_factor__last_authenticated_at
    },
    failedPasswordAttempts: row.failed_password_attempts,
    accountLockUntil: row.account_lock_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listPostgresCmsUsers() {
  const result = await getPostgresPool().query(
    `SELECT "_id", "name", "email", "role", "avatar", "is_active", "last_login_at", "last_login_ip", ` +
      `"force_security_setup", "two_factor__enabled", "two_factor__required", "two_factor__method", "two_factor__activated_at", ` +
      `"two_factor__last_authenticated_at", "failed_password_attempts", "account_lock_until", "created_at", "updated_at" ` +
      `FROM "users" ORDER BY "created_at" DESC`
  );
  return result.rows.map(mapPostgresCmsUserRow);
}

export function buildPostgresCmsUserDeleteDecision(target, activeSuperadminCount) {
  if (!target) return { deleted: false, reason: "not_found" };
  if (target.role === "superadmin" && target.is_active && activeSuperadminCount <= 1) {
    return { deleted: false, reason: "last_superadmin" };
  }
  return { deleted: true, reason: null };
}

export async function deletePostgresCmsUser(userId) {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const activeAdmins = await client.query(
      `SELECT "_id" FROM "users" WHERE "role" = 'superadmin' AND "is_active" = TRUE ORDER BY "_id" FOR UPDATE`
    );
    const target = await client.query(
      `SELECT "_id", "role", "is_active" FROM "users" WHERE "_id" = $1 FOR UPDATE`,
      [String(userId)]
    );
    if (!target.rowCount) {
      await client.query("ROLLBACK");
      return buildPostgresCmsUserDeleteDecision(null, activeAdmins.rowCount);
    }
    const user = target.rows[0];
    const decision = buildPostgresCmsUserDeleteDecision(user, activeAdmins.rowCount);
    if (!decision.deleted) {
      await client.query("ROLLBACK");
      return decision;
    }
    await client.query(`DELETE FROM "users" WHERE "_id" = $1`, [String(userId)]);
    await client.query("COMMIT");
    return { deleted: true, reason: null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function buildPostgresAuthSessionLookup(sessionId, userId, now = new Date()) {
  return {
    text: `SELECT * FROM "sessions" WHERE "_id" = $1 AND "user" = $2 AND "revoked_at" IS NULL AND "expires_at" > $3 LIMIT 1`,
    values: [sessionId, userId, now]
  };
}

export function buildPostgresActiveUserLookup(userId) {
  return {
    text: `SELECT "_id", "name", "email", "role", "avatar", "force_security_setup", "two_factor__enabled", "two_factor__required" ` +
      `FROM "users" WHERE "_id" = $1 AND "is_active" = TRUE LIMIT 1`,
    values: [String(userId)]
  };
}

export function buildPostgresGlobalSecurityPolicyQuery() {
  return {
    text: `INSERT INTO "securitypolicies" ("key", "require_admin2_fa", "require_user2_fa", "allowed_methods", "trusted_device_days", "max_failed_attempts", "lock_minutes", "session_expiry_hours", "recovery_code_count", "created_at", "updated_at") ` +
      `VALUES ('global', TRUE, FALSE, '["email","totp"]'::jsonb, 30, 5, 15, 24, 10, now(), now()) ` +
      `ON CONFLICT ("key") DO UPDATE SET "key" = EXCLUDED."key" RETURNING *`
  };
}

export function mapPostgresAuthSession(row) {
  if (!row) return null;
  return {
    _id: row._id,
    user: row.user,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokeReason: row.revoke_reason,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    lastSeenAt: row.last_seen_at,
    twoFactorVerified: row.two_factor_verified,
    trustedDeviceUsed: row.trusted_device_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapPostgresAuthUser(row) {
  if (!row) return null;
  return {
    _id: row._id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    forceSecuritySetup: row.force_security_setup,
    twoFactor: {
      enabled: row.two_factor__enabled,
      required: row.two_factor__required
    }
  };
}

export function mapPostgresSecurityPolicy(row) {
  if (!row) return null;
  return {
    _id: row._id,
    key: row.key,
    requireAdmin2FA: row.require_admin2_fa,
    requireUser2FA: row.require_user2_fa,
    allowedMethods: row.allowed_methods || [],
    trustedDeviceDays: row.trusted_device_days,
    maxFailedAttempts: row.max_failed_attempts,
    lockMinutes: row.lock_minutes,
    sessionExpiryHours: row.session_expiry_hours,
    recoveryCodeCount: row.recovery_code_count,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapPostgresTrustedDevice(row) {
  if (!row) return null;
  return {
    _id: row._id,
    user: row.user,
    tokenHash: row.token_hash,
    name: row.name,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findPostgresAuthSession(sessionId, userId, now = new Date()) {
  const query = buildPostgresAuthSessionLookup(sessionId, userId, now);
  const result = await getPostgresPool().query(query.text, query.values);
  return mapPostgresAuthSession(result.rows[0]);
}

export async function findPostgresActiveAuthUser(userId) {
  const result = await getPostgresPool().query(
    `SELECT "_id", "name", "email", "password_hash", "role", "avatar", "is_active", "force_security_setup", "two_factor__enabled", "two_factor__required", "__v", "created_at", "updated_at" ` +
      `FROM "users" WHERE "_id" = $1 AND "is_active" = TRUE LIMIT 1`,
    [String(userId)]
  );
  return hydratePostgresAuthUser(result.rows[0]);
}

export async function getPostgresGlobalSecurityPolicy() {
  const query = buildPostgresGlobalSecurityPolicyQuery();
  const result = await getPostgresPool().query(query.text);
  return mapPostgresSecurityPolicy(result.rows[0]);
}

export async function updatePostgresGlobalSecurityPolicy(fields) {
  const columns = {
    requireAdmin2FA: '"require_admin2_fa"',
    requireUser2FA: '"require_user2_fa"',
    allowedMethods: '"allowed_methods"',
    trustedDeviceDays: '"trusted_device_days"',
    maxFailedAttempts: '"max_failed_attempts"',
    lockMinutes: '"lock_minutes"',
    sessionExpiryHours: '"session_expiry_hours"',
    recoveryCodeCount: '"recovery_code_count"',
    updatedBy: '"updated_by"'
  };
  const entries = Object.entries(fields).filter(([key]) => columns[key]);
  const values = ["global"];
  const assignments = [];
  for (const [key, value] of entries) {
    const normalized = key === "allowedMethods" && Array.isArray(value)
      ? JSON.stringify(value)
      : key === "updatedBy" && value != null
        ? String(value)
        : value;
    const index = values.push(normalized);
    assignments.push(`${columns[key]} = $${index}${key === "allowedMethods" ? "::jsonb" : ""}`);
  }
  if (!assignments.length) return getPostgresGlobalSecurityPolicy();
  await getPostgresGlobalSecurityPolicy();
  assignments.push('"updated_at" = now()', '"__v" = "securitypolicies"."__v" + 1');
  const result = await getPostgresPool().query(
    `UPDATE "securitypolicies" SET ${assignments.join(", ")} WHERE "key" = $1 RETURNING *`,
    values
  );
  return mapPostgresSecurityPolicy(result.rows[0]);
}

export async function touchPostgresAuthSession(sessionId, lastSeenAt = new Date()) {
  await getPostgresPool().query(
    `UPDATE "sessions" SET "last_seen_at" = $1, "updated_at" = now(), "__v" = "__v" + 1 WHERE "_id" = $2 AND "revoked_at" IS NULL`,
    [lastSeenAt, sessionId]
  );
}

export async function createPostgresAuthSession({
  userId,
  expiresAt,
  ipAddress = "",
  userAgent = "",
  twoFactorVerified = false,
  trustedDeviceUsed = false
}) {
  const result = await getPostgresPool().query(
    `INSERT INTO "sessions" ("user", "expires_at", "ip_address", "user_agent", "last_seen_at", "two_factor_verified", "trusted_device_used", "created_at", "updated_at") ` +
      `VALUES ($1, $2, $3, $4, now(), $5, $6, now(), now()) RETURNING *`,
    [String(userId), expiresAt, ipAddress, userAgent, twoFactorVerified, trustedDeviceUsed]
  );
  return mapPostgresAuthSession(result.rows[0]);
}

export async function listPostgresAuthSessions(userId, now = new Date()) {
  const result = await getPostgresPool().query(
    `SELECT * FROM "sessions" WHERE "user" = $1 AND "revoked_at" IS NULL AND "expires_at" > $2 ORDER BY "last_seen_at" DESC NULLS LAST`,
    [String(userId), now]
  );
  return result.rows.map(mapPostgresAuthSession);
}

export async function revokePostgresAuthSession(sessionId, reason = "logout") {
  const result = await getPostgresPool().query(
    `UPDATE "sessions" SET "revoked_at" = now(), "revoke_reason" = $1, "updated_at" = now(), "__v" = "__v" + 1 ` +
      `WHERE "_id" = $2 AND "revoked_at" IS NULL RETURNING *`,
    [reason, sessionId]
  );
  return mapPostgresAuthSession(result.rows[0]);
}

export async function revokePostgresAuthSessionForUser(sessionId, userId, reason = "user_revoked") {
  const result = await getPostgresPool().query(
    `UPDATE "sessions" SET "revoked_at" = now(), "revoke_reason" = $1, "updated_at" = now(), "__v" = "__v" + 1 ` +
      `WHERE "_id" = $2 AND "user" = $3 AND "revoked_at" IS NULL RETURNING *`,
    [reason, String(sessionId), String(userId)]
  );
  return mapPostgresAuthSession(result.rows[0]);
}

export async function revokePostgresAuthSessions({ userId, exceptSessionId, reason = "revoked" } = {}) {
  const values = [reason];
  const filters = ['"revoked_at" IS NULL'];
  if (userId !== undefined) filters.push(`"user" = $${values.push(String(userId))}`);
  if (exceptSessionId !== undefined) filters.push(`"_id" <> $${values.push(String(exceptSessionId))}`);
  const result = await getPostgresPool().query(
    `UPDATE "sessions" SET "revoked_at" = now(), "revoke_reason" = $1, "updated_at" = now(), "__v" = "__v" + 1 WHERE ${filters.join(" AND ")}`,
    values
  );
  return { modifiedCount: result.rowCount };
}

export async function findPostgresActiveTrustedDevice({ id, userId, now = new Date() }) {
  const result = await getPostgresPool().query(
    `SELECT * FROM "trusteddevices" WHERE "_id" = $1 AND "user" = $2 AND "revoked_at" IS NULL AND "expires_at" > $3 LIMIT 1`,
    [String(id), String(userId), now]
  );
  return mapPostgresTrustedDevice(result.rows[0]);
}

export async function listPostgresTrustedDevices(userId, now = new Date()) {
  const result = await getPostgresPool().query(
    `SELECT "_id", "user", "name", "ip_address", "user_agent", "last_used_at", "expires_at", "revoked_at", "created_at", "updated_at" ` +
      `FROM "trusteddevices" WHERE "user" = $1 AND "revoked_at" IS NULL AND "expires_at" > $2 ORDER BY "last_used_at" DESC NULLS LAST`,
    [String(userId), now]
  );
  return result.rows.map((row) => mapPostgresTrustedDevice({ ...row, token_hash: undefined }));
}

export async function createPostgresTrustedDevice({ userId, tokenHash, name, ipAddress = "", userAgent = "", expiresAt }) {
  const result = await getPostgresPool().query(
    `INSERT INTO "trusteddevices" ("user", "token_hash", "name", "ip_address", "user_agent", "last_used_at", "expires_at", "created_at", "updated_at") ` +
      `VALUES ($1, $2, $3, $4, $5, now(), $6, now(), now()) RETURNING *`,
    [String(userId), tokenHash, name, ipAddress, userAgent, expiresAt]
  );
  return mapPostgresTrustedDevice(result.rows[0]);
}

export async function touchPostgresTrustedDevice(id, lastUsedAt = new Date()) {
  await getPostgresPool().query(
    `UPDATE "trusteddevices" SET "last_used_at" = $1, "updated_at" = now(), "__v" = "__v" + 1 WHERE "_id" = $2 AND "revoked_at" IS NULL`,
    [lastUsedAt, String(id)]
  );
}

export async function revokePostgresTrustedDevices({ userId, id } = {}) {
  const values = [];
  const filters = ['"revoked_at" IS NULL'];
  if (userId !== undefined) filters.push(`"user" = $${values.push(String(userId))}`);
  if (id !== undefined) filters.push(`"_id" = $${values.push(String(id))}`);
  const result = await getPostgresPool().query(
    `UPDATE "trusteddevices" SET "revoked_at" = now(), "updated_at" = now(), "__v" = "__v" + 1 WHERE ${filters.join(" AND ")}`,
    values
  );
  return { modifiedCount: result.rowCount };
}

export async function revokePostgresTrustedDevice({ id, userId }) {
  const result = await getPostgresPool().query(
    `UPDATE "trusteddevices" SET "revoked_at" = now(), "updated_at" = now(), "__v" = "__v" + 1 WHERE "_id" = $1 AND "user" = $2 AND "revoked_at" IS NULL RETURNING "_id", "user", "name", "ip_address", "user_agent", "last_used_at", "expires_at", "revoked_at", "created_at", "updated_at"`,
    [String(id), String(userId)]
  );
  return result.rows[0] ? mapPostgresTrustedDevice({ ...result.rows[0], token_hash: undefined }) : null;
}

export async function listPostgresSecurityAuditLogs({ userId, search = "", role = "", action = "", result = "", from = "", to = "", securityEntitiesOnly = false } = {}) {
  const values = [];
  const filters = [];
  if (userId !== undefined) filters.push(`"user" = $${values.push(String(userId))}`);
  if (role) filters.push(`"role" = $${values.push(role)}`);
  if (action) filters.push(`"action" = $${values.push(action)}`);
  if (result) filters.push(`"result" = $${values.push(result)}`);
  if (search) {
    const escaped = String(search).replace(/[\\%_]/g, "\\$&");
    const parameter = `$${values.push(`%${escaped}%`)}`;
    filters.push(`("user_email" ILIKE ${parameter} ESCAPE E'\\\\' OR "action" ILIKE ${parameter} ESCAPE E'\\\\' OR "entity" ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  if (from) filters.push(`"created_at" >= $${values.push(new Date(from))}`);
  if (to) filters.push(`"created_at" <= $${values.push(new Date(`${to}T23:59:59.999Z`))}`);
  if (securityEntitiesOnly) filters.push('"entity" = ANY(ARRAY[\'Security\', \'Session\', \'TrustedDevice\', \'User\']::text[])');
  const query = await getPostgresPool().query(
    `SELECT * FROM "auditlogs"${filters.length ? ` WHERE ${filters.join(" AND ")}` : ""} ORDER BY "created_at" DESC LIMIT ${userId === undefined ? 500 : 20}`,
    values
  );
  return query.rows.map((row) => mapPostgresCmsRow(AuditLog, row));
}

export async function createPostgresEmailOtp({ userId, email, otp, ttlMinutes = 5, cooldownSeconds = 60 }) {
  const pool = getPostgresPool();
  const client = await pool.connect();
  const now = new Date();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtp(otp, salt);
  try {
    await client.query("BEGIN");
    await client.query(`SELECT "_id" FROM "users" WHERE "_id" = $1 FOR UPDATE`, [String(userId)]);
    await client.query(
      `UPDATE "emailotps" SET "consumed_at" = $1, "updated_at" = $1, "__v" = "__v" + 1 WHERE "user" = $2 AND "consumed_at" IS NULL`,
      [now, String(userId)]
    );
    const inserted = await client.query(
      `INSERT INTO "emailotps" ("user", "email", "otp_hash", "salt", "expires_at", "attempts", "max_attempts", "resend_available_at", "consumed_at", "created_at", "updated_at") ` +
        `VALUES ($1, $2, $3, $4, $5, 0, 5, $6, NULL, $7, $7) RETURNING "_id", "user", "email", "expires_at", "attempts", "max_attempts", "resend_available_at", "consumed_at", "created_at"`,
      [String(userId), String(email).toLowerCase().trim(), otpHash, salt, new Date(now.getTime() + ttlMinutes * 60_000), new Date(now.getTime() + cooldownSeconds * 1000), now]
    );
    await client.query("COMMIT");
    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyPostgresEmailOtp(userId, candidateCode) {
  const cleanCode = String(candidateCode || "").trim();
  if (!cleanCode || !/^\d{6}$/.test(cleanCode)) return { valid: false, reason: "malformed" };
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const selected = await client.query(
      `SELECT * FROM "emailotps" WHERE "user" = $1 AND "consumed_at" IS NULL ORDER BY "created_at" DESC LIMIT 1 FOR UPDATE`,
      [String(userId)]
    );
    const record = selected.rows[0];
    if (!record) {
      await client.query("COMMIT");
      return { valid: false, reason: "not_found_or_expired" };
    }

    const now = new Date();
    if (new Date(record.expires_at) < now) {
      await client.query(`UPDATE "emailotps" SET "consumed_at" = $1, "updated_at" = $1 WHERE "_id" = $2`, [now, record._id]);
      await client.query("COMMIT");
      return { valid: false, reason: "expired" };
    }
    if (record.attempts >= record.max_attempts) {
      await client.query("COMMIT");
      return { valid: false, reason: "max_attempts_exceeded" };
    }

    const candidateHash = Buffer.from(hashOtp(cleanCode, record.salt), "utf8");
    const savedHash = Buffer.from(record.otp_hash, "utf8");
    const valid = candidateHash.length === savedHash.length && crypto.timingSafeEqual(candidateHash, savedHash);
    if (!valid) {
      const attempts = Number(record.attempts) + 1;
      await client.query(
        `UPDATE "emailotps" SET "attempts" = $1, "updated_at" = $2, "__v" = "__v" + 1 WHERE "_id" = $3`,
        [attempts, now, record._id]
      );
      await client.query("COMMIT");
      const remaining = Math.max(0, Number(record.max_attempts) - attempts);
      return { valid: false, reason: "invalid_code", attemptsRemaining: remaining, locked: remaining === 0 };
    }

    await client.query(`UPDATE "emailotps" SET "consumed_at" = $1, "updated_at" = $1, "__v" = "__v" + 1 WHERE "_id" = $2`, [now, record._id]);
    await client.query("COMMIT");
    return { valid: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findLatestPostgresEmailOtp(userId) {
  const result = await getPostgresPool().query(
    `SELECT "_id", "resend_available_at", "created_at" FROM "emailotps" WHERE "user" = $1 AND "consumed_at" IS NULL ORDER BY "created_at" DESC LIMIT 1`,
    [String(userId)]
  );
  const row = result.rows[0];
  return row ? { _id: row._id, resendAvailableAt: row.resend_available_at, createdAt: row.created_at } : null;
}

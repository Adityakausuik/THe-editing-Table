/* global fetch */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import AuditLog from "./models/AuditLog.model.js";
import Session from "./models/Session.model.js";
import TrustedDevice from "./models/TrustedDevice.model.js";
import User from "./models/User.model.js";
import { encryptSecret, generateRecoveryCodes, generateTotpCode, hashRecoveryCodes } from "./utils/security.js";

const baseUrl = "http://127.0.0.1:5000/api";
const actorEmail = `security-admin-${crypto.randomUUID()}@example.invalid`;
const targetEmail = `security-target-${crypto.randomUUID()}@example.invalid`;
const actorPassword = `Actor-${crypto.randomUUID()}!`;
const targetPassword = `Target-${crypto.randomUUID()}!`;
const actorSecret = "KRUGS4ZANFZSAYJAORSXG5BANVSSA43J";
const targetSecret = "MFRGGZDFMZTWQ2LKNNWG23TPOI======";
const recoveryCodes = generateRecoveryCodes(3);

function cookie(response, name) {
  const lines = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  return lines.find((value) => value.startsWith(`${name}=`))?.split(";")[0] || "";
}

async function request(path, { method = "POST", body = {}, cookieHeader = "", csrf = "" } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookieHeader ? { cookie: cookieHeader } : {}), ...(csrf ? { "x-csrf-token": csrf } : {}) },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) })
  });
}

async function authenticate(email, password, secret) {
  const login = await request("/v1/auth/login", { body: { email, password } });
  assert.equal(login.status, 202);
  const verify = await request("/v1/auth/2fa/verify", { body: { code: generateTotpCode(secret) }, cookieHeader: cookie(login, "preAuthToken") });
  assert.equal(verify.status, 200);
  const payload = await verify.json();
  return { access: cookie(verify, "accessToken"), csrf: payload.data.csrfToken };
}

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const [actor, target] = await Promise.all([
    User.create({
      name: "Security Test Super Admin",
      email: actorEmail,
      passwordHash: await User.hashPassword(actorPassword),
      role: "superadmin",
      isActive: true,
      "twoFactor.enabled": true,
      "twoFactor.required": true,
      "twoFactor.method": "totp",
      "twoFactor.secretEncrypted": encryptSecret(actorSecret),
      "twoFactor.recoveryCodeHashes": await hashRecoveryCodes(recoveryCodes)
    }),
    User.create({
      name: "Security Lockout Target",
      email: targetEmail,
      passwordHash: await User.hashPassword(targetPassword),
      role: "editor",
      isActive: true,
      "twoFactor.enabled": true,
      "twoFactor.required": true,
      "twoFactor.method": "totp",
      "twoFactor.secretEncrypted": encryptSecret(targetSecret)
    })
  ]);

  try {
    const actorAuth = await authenticate(actorEmail, actorPassword, actorSecret);
    const targetLogin = await request("/v1/auth/login", { body: { email: targetEmail, password: targetPassword } });
    const targetPreAuth = cookie(targetLogin, "preAuthToken");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invalid = await request("/v1/auth/2fa/verify", { body: { code: "000000" }, cookieHeader: targetPreAuth });
      assert.equal(invalid.status, 401);
    }
    const lockedTarget = await User.findById(target._id);
    assert.ok(lockedTarget.twoFactor.lockUntil > new Date());

    const unlock = await request(`/v1/security/admin/users/${target._id}/unlock`, {
      body: { password: actorPassword, code: recoveryCodes[0] },
      cookieHeader: actorAuth.access,
      csrf: actorAuth.csrf
    });
    assert.equal(unlock.status, 200);
    const unlockedTarget = await User.findById(target._id);
    assert.equal(unlockedTarget.twoFactor.failedAttempts, 0);
    assert.equal(Boolean(unlockedTarget.twoFactor.lockUntil), false);

    const reset = await request(`/v1/security/admin/users/${target._id}/reset-2fa`, {
      body: { password: actorPassword, code: recoveryCodes[1] },
      cookieHeader: actorAuth.access,
      csrf: actorAuth.csrf
    });
    assert.equal(reset.status, 200);
    const resetTarget = await User.findById(target._id).select("+twoFactor.secretEncrypted");
    assert.equal(resetTarget.twoFactor.enabled, false);
    assert.equal(resetTarget.twoFactor.secretEncrypted, "");
    assert.equal(resetTarget.forceSecuritySetup, true);

    const auditActions = await AuditLog.distinct("action", { user: actor._id });
    assert.ok(auditActions.includes("ACCOUNT_UNLOCKED"));
    assert.ok(auditActions.includes("TWO_FACTOR_RESET"));
    console.log("Security admin flow passed: lockout, verified unlock, audited 2FA reset, mandatory next-login setup.");
  } finally {
    const ids = [actor._id, target._id];
    await Promise.all([
      Session.deleteMany({ user: { $in: ids } }),
      TrustedDevice.deleteMany({ user: { $in: ids } }),
      AuditLog.deleteMany({ user: { $in: ids } }),
      User.deleteMany({ _id: { $in: ids } })
    ]);
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });

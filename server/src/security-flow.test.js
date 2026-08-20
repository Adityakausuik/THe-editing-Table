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
const email = `security-test-${crypto.randomUUID()}@example.invalid`;
const password = `Security-${crypto.randomUUID()}!`;
const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const [recoveryCode] = generateRecoveryCodes(1);

function cookie(response, name) {
  const lines = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  const line = lines.find((value) => value.startsWith(`${name}=`));
  return line?.split(";")[0] || "";
}

async function post(path, body, cookieHeader = "", csrfToken = "") {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {})
    },
    body: JSON.stringify(body)
  });
}

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const passwordHash = await User.hashPassword(password);
  const recoveryCodeHashes = await hashRecoveryCodes([recoveryCode]);
  const user = await User.create({
    name: "Security Integration Test",
    email,
    passwordHash,
    role: "editor",
    isActive: true,
    "twoFactor.enabled": true,
    "twoFactor.required": true,
    "twoFactor.method": "totp",
    "twoFactor.secretEncrypted": encryptSecret(secret),
    "twoFactor.recoveryCodeHashes": recoveryCodeHashes,
    "twoFactor.activatedAt": new Date()
  });

  try {
    const login = await post("/v1/auth/login", { email, password });
    assert.equal(login.status, 202);
    const loginData = await login.json();
    assert.equal(loginData.data.status, "two_factor_required");
    assert.equal(loginData.data.token, undefined);
    const preAuthCookie = cookie(login, "preAuthToken");
    assert.ok(preAuthCookie);

    const setupBypass = await post("/v1/auth/2fa/setup/begin", {}, preAuthCookie);
    assert.equal(setupBypass.status, 403);

    const otp = generateTotpCode(secret);
    const verify = await post("/v1/auth/2fa/verify", { code: otp, trustDevice: true, deviceName: "Integration browser" }, preAuthCookie);
    assert.equal(verify.status, 200);
    const verifiedData = await verify.json();
    assert.equal(verifiedData.data.status, "authenticated");
    assert.equal(verifiedData.data.token, undefined);
    assert.ok(verifiedData.data.csrfToken);
    const accessCookie = cookie(verify, "accessToken");
    const trustedCookie = cookie(verify, "trustedDevice");
    assert.ok(accessCookie);
    assert.ok(trustedCookie);

    const me = await fetch(`${baseUrl}/v1/auth/me`, { headers: { cookie: accessCookie } });
    assert.equal(me.status, 200);
    const meData = await me.json();
    assert.equal(meData.data.role, "editor");

    const roleCheck = await fetch(`${baseUrl}/v1/cms/stats`, { headers: { cookie: accessCookie } });
    assert.equal(roleCheck.status, 200);

    const csrfRejected = await post("/v1/auth/logout", {}, accessCookie);
    assert.equal(csrfRejected.status, 403);

    const trustedLogin = await post("/v1/auth/login", { email, password }, trustedCookie);
    assert.equal(trustedLogin.status, 200);
    assert.equal((await trustedLogin.json()).data.status, "authenticated");

    const replayLogin = await post("/v1/auth/login", { email, password });
    const replayPreAuth = cookie(replayLogin, "preAuthToken");
    const replay = await post("/v1/auth/2fa/verify", { code: otp }, replayPreAuth);
    assert.equal(replay.status, 401);

    const recoveryLogin = await post("/v1/auth/login", { email, password });
    const recoveryPreAuth = cookie(recoveryLogin, "preAuthToken");
    const recovery = await post("/v1/auth/2fa/verify", { recoveryCode }, recoveryPreAuth);
    assert.equal(recovery.status, 200);
    const recoveredUser = await User.findById(user._id).select("+twoFactor.recoveryCodeHashes");
    assert.equal(recoveredUser.twoFactor.recoveryCodeHashes.length, 0);

    const logout = await post("/v1/auth/logout", {}, accessCookie, verifiedData.data.csrfToken);
    assert.equal(logout.status, 200);
    const revoked = await Session.findOne({ user: user._id, revokeReason: "logout" });
    assert.ok(revoked?.revokedAt);

    console.log("Security integration flow passed: password gate, TOTP, replay rejection, recovery, trusted device, role check, CSRF, session revocation.");
  } finally {
    await Promise.all([
      Session.deleteMany({ user: user._id }),
      TrustedDevice.deleteMany({ user: user._id }),
      AuditLog.deleteMany({ user: user._id }),
      User.deleteOne({ _id: user._id })
    ]);
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

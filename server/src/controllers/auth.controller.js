import mongoose from "mongoose";
import QRCode from "qrcode";
import User from "../models/User.model.js";
import Session from "../models/Session.model.js";
import TrustedDevice from "../models/TrustedDevice.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";
import { signAccessToken, signPreAuthToken, verifyPreAuthToken } from "../lib/jwt.js";
import { env } from "../config/env.js";
import { csrfTokenForSession } from "../middleware/auth.js";
import {
  buildTotpUri,
  decryptSecret,
  encryptSecret,
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCodes,
  randomToken,
  sha256,
  timingSafeEqualText,
  verifyTotp
} from "../utils/security.js";
import { writeSecurityAudit } from "../utils/audit.js";

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function baseCookieOptions() {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/"
  };
}

function setCookie(res, name, value, maxAge) {
  res.cookie(name, value, { ...baseCookieOptions(), maxAge });
}

function clearCookie(res, name) {
  res.clearCookie(name, baseCookieOptions());
}

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    twoFactorEnabled: Boolean(user.twoFactor?.enabled),
    twoFactorRequired: Boolean(user.twoFactor?.required),
    forceSecuritySetup: Boolean(user.forceSecuritySetup)
  };
}

function requiresTwoFactor(user, policy) {
  if (user.twoFactor?.required || user.forceSecuritySetup) return true;
  if (["admin", "superadmin"].includes(user.role)) return policy.requireAdmin2FA;
  return policy.requireUser2FA;
}

function isLocked(user) {
  const now = Date.now();
  return (user.accountLockUntil && user.accountLockUntil.getTime() > now) ||
    (user.twoFactor?.lockUntil && user.twoFactor.lockUntil.getTime() > now);
}

async function issueSession(req, res, user, policy, { twoFactorVerified = false, trustedDeviceUsed = false } = {}) {
  const expiryMs = policy.sessionExpiryHours * 60 * 60 * 1000;
  const session = await Session.create({
    user: user._id,
    expiresAt: new Date(Date.now() + expiryMs),
    ipAddress: req.ip,
    userAgent: String(req.get("user-agent") || "").slice(0, 500),
    twoFactorVerified,
    trustedDeviceUsed
  });
  const token = signAccessToken({
    type: "access",
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    sid: session._id.toString()
  });
  setCookie(res, "accessToken", token, expiryMs);
  clearCookie(res, "preAuthToken");
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;
  user.failedPasswordAttempts = 0;
  user.accountLockUntil = undefined;
  await user.save();
  return { session, csrfToken: csrfTokenForSession(session._id.toString()) };
}

async function setPreAuthChallenge(res, user) {
  const nonce = randomToken(32);
  user.preAuthNonceHash = sha256(nonce);
  await user.save();
  const token = signPreAuthToken({ id: user._id.toString(), nonce });
  setCookie(res, "preAuthToken", token, 10 * 60 * 1000);
}

async function getPreAuthUser(req) {
  const token = req.cookies?.preAuthToken;
  if (!token) return null;
  const payload = verifyPreAuthToken(token);
  const user = await User.findOne({ _id: payload.id, isActive: true }).select(
    "+preAuthNonceHash +twoFactor.secretEncrypted +twoFactor.pendingSecretEncrypted +twoFactor.recoveryCodeHashes"
  );
  if (!user?.preAuthNonceHash || !timingSafeEqualText(user.preAuthNonceHash, sha256(payload.nonce))) return null;
  return user;
}

async function validateTrustedDevice(req, user) {
  const [id, rawToken] = String(req.cookies?.trustedDevice || "").split(".");
  if (!mongoose.Types.ObjectId.isValid(id) || !rawToken) return null;
  const device = await TrustedDevice.findOne({
    _id: id,
    user: user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).select("+tokenHash");
  if (!device || !timingSafeEqualText(device.tokenHash, sha256(rawToken))) return null;
  device.lastUsedAt = new Date();
  await device.save();
  return device;
}

async function addTrustedDevice(req, res, user, policy, name) {
  if (policy.trustedDeviceDays <= 0) return null;
  const rawToken = randomToken(32);
  const duration = policy.trustedDeviceDays * 24 * 60 * 60 * 1000;
  const device = await TrustedDevice.create({
    user: user._id,
    tokenHash: sha256(rawToken),
    name: String(name || "Trusted browser").trim().slice(0, 100),
    ipAddress: req.ip,
    userAgent: String(req.get("user-agent") || "").slice(0, 500),
    expiresAt: new Date(Date.now() + duration)
  });
  setCookie(res, "trustedDevice", `${device._id}.${rawToken}`, duration);
  await writeSecurityAudit({ req, user, action: "TRUSTED_DEVICE_ADDED", entity: "TrustedDevice", entityId: device._id.toString() });
  return device;
}

async function registerFailure(req, user, policy, action) {
  user.twoFactor.failedAttempts = Number(user.twoFactor.failedAttempts || 0) + 1;
  if (user.twoFactor.failedAttempts >= policy.maxFailedAttempts) {
    user.twoFactor.lockUntil = new Date(Date.now() + policy.lockMinutes * 60 * 1000);
    await writeSecurityAudit({ req, user, action: "ACCOUNT_LOCKED", result: "failure", metadata: { reason: "two_factor_failures" } });
  }
  await user.save();
  await writeSecurityAudit({ req, user, action, result: "failure", metadata: { failedAttempts: user.twoFactor.failedAttempts } });
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required", data: null });
    }
    if (!isDbConnected()) {
      return res.status(503).json({ success: false, message: "Authentication service is unavailable.", data: null });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const policy = await SecurityPolicy.getGlobal();
    const user = await User.findOne({ email: cleanEmail }).select("+preAuthNonceHash");

    if (!user || !user.isActive) {
      await writeSecurityAudit({ req, user, action: "LOGIN_FAILURE", result: "failure", metadata: { email: cleanEmail, reason: "invalid_credentials" } });
      return res.status(401).json({ success: false, message: "Invalid credentials or account disabled", data: null });
    }
    if (isLocked(user)) {
      await writeSecurityAudit({ req, user, action: "LOGIN_FAILURE", result: "failure", metadata: { reason: "account_locked" } });
      return res.status(423).json({ success: false, message: "Account temporarily locked. Try again later.", data: null });
    }

    const isMatch = await user.comparePassword(String(password));
    if (!isMatch) {
      user.failedPasswordAttempts = Number(user.failedPasswordAttempts || 0) + 1;
      if (user.failedPasswordAttempts >= policy.maxFailedAttempts) {
        user.accountLockUntil = new Date(Date.now() + policy.lockMinutes * 60 * 1000);
        await writeSecurityAudit({ req, user, action: "ACCOUNT_LOCKED", result: "failure", metadata: { reason: "password_failures" } });
      }
      await user.save();
      await writeSecurityAudit({ req, user, action: "LOGIN_FAILURE", result: "failure", metadata: { reason: "invalid_credentials" } });
      return res.status(401).json({ success: false, message: "Invalid credentials or account disabled", data: null });
    }

    user.failedPasswordAttempts = 0;
    user.accountLockUntil = undefined;

    if (user.twoFactor?.enabled) {
      const trustedDevice = await validateTrustedDevice(req, user);
      if (trustedDevice) {
        const { csrfToken } = await issueSession(req, res, user, policy, { twoFactorVerified: true, trustedDeviceUsed: true });
        await writeSecurityAudit({ req, user, action: "LOGIN_SUCCESS", metadata: { trustedDevice: true } });
        return res.json({ success: true, message: "Logged in successfully", data: { status: "authenticated", user: safeUser(user), csrfToken } });
      }
    }

    const mandatory = requiresTwoFactor(user, policy);
    if (user.twoFactor?.enabled || mandatory) {
      await setPreAuthChallenge(res, user);
      const status = user.twoFactor?.enabled ? "two_factor_required" : "two_factor_setup_required";
      await writeSecurityAudit({ req, user, action: "PASSWORD_VERIFIED", result: "info", metadata: { next: status } });
      return res.status(202).json({ success: true, message: "Additional security verification required", data: { status, user: safeUser(user) } });
    }

    const { csrfToken } = await issueSession(req, res, user, policy);
    await writeSecurityAudit({ req, user, action: "LOGIN_SUCCESS" });
    return res.json({ success: true, message: "Logged in successfully", data: { status: "authenticated", user: safeUser(user), csrfToken } });
  } catch {
    return res.status(500).json({ success: false, message: "Login failed", data: null });
  }
}

export async function beginTwoFactorSetup(req, res) {
  try {
    const fromSession = Boolean(req.userDocument);
    const user = req.userDocument || await getPreAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Security verification expired. Sign in again.", data: null });
    if (!fromSession && user.twoFactor?.enabled) {
      await writeSecurityAudit({ req, user, action: "TWO_FACTOR_SETUP_BLOCKED", result: "failure", metadata: { reason: "existing_2fa_requires_full_session" } });
      return res.status(403).json({ success: false, message: "Verify your existing authenticator before changing two-factor settings.", data: null });
    }
    if (fromSession) {
      const matches = await user.comparePassword(String(req.body?.password || ""));
      if (!matches) return res.status(403).json({ success: false, message: "Password verification failed.", data: null });
    }
    const policy = await SecurityPolicy.getGlobal();
    if (!policy.allowedMethods.includes("totp")) {
      return res.status(409).json({ success: false, message: "Authenticator-app setup is disabled by policy.", data: null });
    }
    const secret = generateTotpSecret();
    user.twoFactor.pendingSecretEncrypted = encryptSecret(secret);
    await user.save();
    const uri = buildTotpUri(secret, user.email);
    const qrCodeDataUrl = await QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 1, width: 240 });
    await writeSecurityAudit({ req, user, action: "TWO_FACTOR_SETUP_STARTED", result: "info" });
    return res.json({ success: true, message: "Authenticator setup started", data: { method: "totp", manualKey: secret, qrCodeDataUrl } });
  } catch {
    return res.status(400).json({ success: false, message: "Unable to start authenticator setup.", data: null });
  }
}

export async function verifyTwoFactorSetup(req, res) {
  try {
    const fromSession = Boolean(req.userDocument);
    const user = req.userDocument || await getPreAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Security verification expired. Sign in again.", data: null });
    if (!fromSession && user.twoFactor?.enabled) {
      await writeSecurityAudit({ req, user, action: "TWO_FACTOR_SETUP_BLOCKED", result: "failure", metadata: { reason: "existing_2fa_requires_full_session" } });
      return res.status(403).json({ success: false, message: "Verify your existing authenticator before changing two-factor settings.", data: null });
    }
    const fullUser = await User.findById(user._id).select("+preAuthNonceHash +twoFactor.pendingSecretEncrypted +twoFactor.recoveryCodeHashes");
    if (!fullUser?.twoFactor?.pendingSecretEncrypted) {
      return res.status(409).json({ success: false, message: "Start authenticator setup first.", data: null });
    }
    const secret = decryptSecret(fullUser.twoFactor.pendingSecretEncrypted);
    const verification = verifyTotp(secret, req.body?.code);
    if (!verification.valid) {
      const policy = await SecurityPolicy.getGlobal();
      await registerFailure(req, fullUser, policy, "INVALID_OTP");
      return res.status(401).json({ success: false, message: "Invalid or expired verification code.", data: null });
    }
    const policy = await SecurityPolicy.getGlobal();
    const recoveryCodes = generateRecoveryCodes(policy.recoveryCodeCount);
    fullUser.twoFactor.enabled = true;
    fullUser.twoFactor.required = Boolean(fullUser.twoFactor.required || fullUser.forceSecuritySetup || requiresTwoFactor(fullUser, policy));
    fullUser.twoFactor.method = "totp";
    fullUser.twoFactor.secretEncrypted = fullUser.twoFactor.pendingSecretEncrypted;
    fullUser.twoFactor.pendingSecretEncrypted = "";
    fullUser.twoFactor.recoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);
    fullUser.twoFactor.activatedAt = new Date();
    fullUser.twoFactor.lastAuthenticatedAt = new Date();
    fullUser.twoFactor.lastUsedCounter = verification.counter;
    fullUser.twoFactor.failedAttempts = 0;
    fullUser.twoFactor.lockUntil = undefined;
    fullUser.forceSecuritySetup = false;
    fullUser.preAuthNonceHash = "";
    await fullUser.save();
    await writeSecurityAudit({ req, user: fullUser, action: "TWO_FACTOR_ENABLED" });

    let authData = {};
    if (!fromSession) {
      const issued = await issueSession(req, res, fullUser, policy, { twoFactorVerified: true });
      authData = { user: safeUser(fullUser), csrfToken: issued.csrfToken, status: "authenticated" };
      await writeSecurityAudit({ req, user: fullUser, action: "LOGIN_SUCCESS", metadata: { afterSetup: true } });
    }
    return res.json({ success: true, message: "Two-factor authentication enabled", data: { ...authData, recoveryCodes } });
  } catch {
    return res.status(400).json({ success: false, message: "Authenticator verification failed.", data: null });
  }
}

export async function verifyLoginTwoFactor(req, res) {
  try {
    const user = await getPreAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Security verification expired. Sign in again.", data: null });
    const policy = await SecurityPolicy.getGlobal();
    if (isLocked(user)) return res.status(423).json({ success: false, message: "Account temporarily locked. Try again later.", data: null });

    let recoveryUsed = false;
    let verificationCounter;
    const recoveryCode = req.body?.recoveryCode;
    if (recoveryCode) {
      const index = await findRecoveryCodeIndex(recoveryCode, user.twoFactor.recoveryCodeHashes || []);
      if (index >= 0) {
        user.twoFactor.recoveryCodeHashes.splice(index, 1);
        recoveryUsed = true;
      }
    } else {
      const secret = decryptSecret(user.twoFactor.secretEncrypted);
      const verified = verifyTotp(secret, req.body?.code, { lastUsedCounter: user.twoFactor.lastUsedCounter });
      if (verified.valid) verificationCounter = verified.counter;
    }
    if (!recoveryUsed && verificationCounter === undefined) {
      await registerFailure(req, user, policy, "INVALID_OTP");
      return res.status(401).json({ success: false, message: "Invalid, expired, or previously used verification code.", data: null });
    }

    if (verificationCounter !== undefined) user.twoFactor.lastUsedCounter = verificationCounter;
    user.twoFactor.failedAttempts = 0;
    user.twoFactor.lockUntil = undefined;
    user.twoFactor.lastAuthenticatedAt = new Date();
    user.preAuthNonceHash = "";
    await user.save();
    if (req.body?.trustDevice) await addTrustedDevice(req, res, user, policy, req.body?.deviceName);
    const { csrfToken } = await issueSession(req, res, user, policy, { twoFactorVerified: true });
    await writeSecurityAudit({ req, user, action: recoveryUsed ? "RECOVERY_CODE_USED" : "TWO_FACTOR_SUCCESS" });
    await writeSecurityAudit({ req, user, action: "LOGIN_SUCCESS" });
    return res.json({ success: true, message: "Security verification successful", data: { status: "authenticated", user: safeUser(user), csrfToken } });
  } catch {
    return res.status(401).json({ success: false, message: "Security verification failed.", data: null });
  }
}

export async function logout(req, res) {
  if (req.authSession) {
    req.authSession.revokedAt = new Date();
    req.authSession.revokeReason = "logout";
    await req.authSession.save();
    await writeSecurityAudit({ req, user: req.userDocument, action: "SESSION_REVOKED", entity: "Session", entityId: req.authSession._id.toString(), metadata: { reason: "logout" } });
  }
  clearCookie(res, "accessToken");
  clearCookie(res, "preAuthToken");
  return res.json({ success: true, message: "Logged out successfully", data: null });
}

export async function getMe(req, res) {
  return res.json({
    success: true,
    message: "Authenticated user retrieved",
    data: { ...safeUser(req.userDocument), csrfToken: csrfTokenForSession(req.authSession._id.toString()) }
  });
}

export async function initializeAdmin(req, res) {
  try {
    const setupToken = req.get("x-setup-token");
    if (!env.ADMIN_SETUP_TOKEN || !setupToken || !timingSafeEqualText(setupToken, env.ADMIN_SETUP_TOKEN)) {
      return res.status(403).json({ success: false, message: "A valid one-time setup token is required.", data: null });
    }
    if (!isDbConnected()) return res.status(503).json({ success: false, message: "Database unavailable.", data: null });
    const existing = await User.findOne({ role: "superadmin" });
    if (existing) return res.status(409).json({ success: false, message: "A Super Admin already exists.", data: null });
    if (!env.ADMIN_PASSWORD) return res.status(503).json({ success: false, message: "ADMIN_PASSWORD is not configured.", data: null });
    const passwordHash = await User.hashPassword(env.ADMIN_PASSWORD);
    const user = await User.create({
      name: "Master Director",
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: "superadmin",
      isActive: true,
      forceSecuritySetup: true,
      "twoFactor.required": true
    });
    await writeSecurityAudit({ req, user, action: "SUPERADMIN_INITIALIZED" });
    return res.status(201).json({ success: true, message: "Super Admin initialized. Two-factor setup is mandatory on first login.", data: { email: user.email } });
  } catch {
    return res.status(500).json({ success: false, message: "Administrator initialization failed.", data: null });
  }
}

export { safeUser, requiresTwoFactor };

import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";
import Session from "../models/Session.model.js";
import TrustedDevice from "../models/TrustedDevice.model.js";
import User from "../models/User.model.js";
import {
  decryptSecret,
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  hashRecoveryCodes,
  verifyTotp
} from "../utils/security.js";
import { writeSecurityAudit } from "../utils/audit.js";

const SECRET_SELECT = "+twoFactor.secretEncrypted +twoFactor.pendingSecretEncrypted +twoFactor.recoveryCodeHashes";

function objectId(value) {
  return mongoose.Types.ObjectId.isValid(value) ? value : null;
}

function roleRequiresTwoFactor(user, policy) {
  if (user.twoFactor?.required || user.forceSecuritySetup) return true;
  return ["admin", "superadmin"].includes(user.role) ? policy.requireAdmin2FA : policy.requireUser2FA;
}

function securityStatus(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    twoFactorEnabled: Boolean(user.twoFactor?.enabled),
    twoFactorRequired: Boolean(user.twoFactor?.required),
    twoFactorMethod: user.twoFactor?.method || "",
    twoFactorActivatedAt: user.twoFactor?.activatedAt,
    lastSuccessfulAuthentication: user.twoFactor?.lastAuthenticatedAt,
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp || "",
    failedVerificationAttempts: user.twoFactor?.failedAttempts || 0,
    lockUntil: user.twoFactor?.lockUntil || user.accountLockUntil,
    isLocked: Boolean(
      (user.twoFactor?.lockUntil && user.twoFactor.lockUntil > new Date()) ||
      (user.accountLockUntil && user.accountLockUntil > new Date())
    ),
    forceSecuritySetup: Boolean(user.forceSecuritySetup),
    recoveryCodesRemaining: user.twoFactor?.recoveryCodeHashes?.length
  };
}

async function verifySecurityCredential(userId, password, code) {
  const user = await User.findById(userId).select(SECRET_SELECT);
  if (!user || !(await user.comparePassword(String(password || "")))) return { valid: false, user };
  if (!user.twoFactor?.enabled) return { valid: true, user };
  const secret = decryptSecret(user.twoFactor.secretEncrypted);
  const verified = verifyTotp(secret, code, { lastUsedCounter: user.twoFactor.lastUsedCounter });
  if (verified.valid) {
    user.twoFactor.lastUsedCounter = verified.counter;
    user.twoFactor.lastAuthenticatedAt = new Date();
    await user.save();
    return { valid: true, user };
  }
  const recoveryIndex = await findRecoveryCodeIndex(code, user.twoFactor.recoveryCodeHashes || []);
  if (recoveryIndex >= 0) {
    user.twoFactor.recoveryCodeHashes.splice(recoveryIndex, 1);
    user.twoFactor.lastAuthenticatedAt = new Date();
    await user.save();
    return { valid: true, user, recoveryUsed: true };
  }
  return { valid: false, user };
}

async function requireCredential(req, res) {
  const verification = await verifySecurityCredential(req.user.id, req.body?.password, req.body?.code);
  if (!verification.valid) {
    await writeSecurityAudit({ req, user: req.userDocument, action: "SECURITY_VERIFICATION_FAILED", result: "failure" });
    res.status(403).json({ success: false, message: "Password or security code verification failed.", data: null });
    return null;
  }
  return verification.user;
}

function canManage(actor, target) {
  if (actor.role === "superadmin") return true;
  return actor.role === "admin" && !["admin", "superadmin"].includes(target.role);
}

export async function getOwnSecurity(req, res) {
  const user = await User.findById(req.user.id).select("+twoFactor.recoveryCodeHashes");
  const policy = await SecurityPolicy.getGlobal();
  const now = new Date();
  const [devices, sessions, activity] = await Promise.all([
    TrustedDevice.find({ user: user._id, revokedAt: null, expiresAt: { $gt: now } }).sort({ lastUsedAt: -1 }),
    Session.find({ user: user._id, revokedAt: null, expiresAt: { $gt: now } }).sort({ lastSeenAt: -1 }),
    AuditLog.find({ user: user._id, entity: { $in: ["Security", "Session", "TrustedDevice", "User"] } }).sort({ createdAt: -1 }).limit(20)
  ]);
  return res.json({
    success: true,
    message: "Security overview retrieved",
    data: {
      account: securityStatus(user),
      policy: {
        twoFactorRequired: roleRequiresTwoFactor(user, policy),
        allowedMethods: policy.allowedMethods,
        trustedDeviceDays: policy.trustedDeviceDays,
        sessionExpiryHours: policy.sessionExpiryHours
      },
      trustedDevices: devices,
      sessions: sessions.map((session) => ({ ...session.toObject(), current: String(session._id) === req.user.sessionId })),
      recentActivity: activity
    }
  });
}

export async function regenerateRecoveryCodes(req, res) {
  const user = await requireCredential(req, res);
  if (!user) return;
  if (!user.twoFactor?.enabled) return res.status(409).json({ success: false, message: "Two-factor authentication is not enabled.", data: null });
  const policy = await SecurityPolicy.getGlobal();
  const codes = generateRecoveryCodes(policy.recoveryCodeCount);
  user.twoFactor.recoveryCodeHashes = await hashRecoveryCodes(codes);
  await user.save();
  await writeSecurityAudit({ req, user, action: "RECOVERY_CODES_REGENERATED" });
  return res.json({ success: true, message: "Recovery codes regenerated. Previous codes are now invalid.", data: { recoveryCodes: codes } });
}

export async function disableOwnTwoFactor(req, res) {
  const user = await requireCredential(req, res);
  if (!user) return;
  const policy = await SecurityPolicy.getGlobal();
  if (roleRequiresTwoFactor(user, policy)) {
    return res.status(409).json({ success: false, message: "Two-factor authentication is mandatory for this account.", data: null });
  }
  user.twoFactor.enabled = false;
  user.twoFactor.method = "";
  user.twoFactor.secretEncrypted = "";
  user.twoFactor.pendingSecretEncrypted = "";
  user.twoFactor.recoveryCodeHashes = [];
  user.twoFactor.lastUsedCounter = -1;
  await user.save();
  await TrustedDevice.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await writeSecurityAudit({ req, user, action: "TWO_FACTOR_DISABLED" });
  return res.json({ success: true, message: "Two-factor authentication disabled", data: null });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (String(newPassword || "").length < 12) {
    return res.status(400).json({ success: false, message: "New password must be at least 12 characters.", data: null });
  }
  const user = await User.findById(req.user.id);
  if (!user || !(await user.comparePassword(String(currentPassword || "")))) {
    return res.status(403).json({ success: false, message: "Current password is incorrect.", data: null });
  }
  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  await Session.updateMany({ user: user._id, _id: { $ne: req.user.sessionId }, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "password_changed" } });
  await writeSecurityAudit({ req, user, action: "PASSWORD_CHANGED" });
  return res.json({ success: true, message: "Password updated. Other sessions were signed out.", data: null });
}

export async function revokeDevice(req, res) {
  const id = objectId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid device ID", data: null });
  const device = await TrustedDevice.findOneAndUpdate({ _id: id, user: req.user.id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { new: true });
  if (!device) return res.status(404).json({ success: false, message: "Trusted device not found", data: null });
  if (String(req.cookies?.trustedDevice || "").startsWith(`${id}.`)) res.clearCookie("trustedDevice", { path: "/" });
  await writeSecurityAudit({ req, user: req.userDocument, action: "TRUSTED_DEVICE_REMOVED", entity: "TrustedDevice", entityId: String(id) });
  return res.json({ success: true, message: "Trusted device removed", data: null });
}

export async function revokeSession(req, res) {
  const id = objectId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid session ID", data: null });
  if (String(id) === req.user.sessionId) return res.status(409).json({ success: false, message: "Use Sign Out to end the current session.", data: null });
  const session = await Session.findOneAndUpdate({ _id: id, user: req.user.id, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "user_revoked" } }, { new: true });
  if (!session) return res.status(404).json({ success: false, message: "Session not found", data: null });
  await writeSecurityAudit({ req, user: req.userDocument, action: "SESSION_REVOKED", entity: "Session", entityId: String(id) });
  return res.json({ success: true, message: "Session revoked", data: null });
}

export async function revokeOtherSessions(req, res) {
  const user = await requireCredential(req, res);
  if (!user) return;
  const result = await Session.updateMany({ user: user._id, _id: { $ne: req.user.sessionId }, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "user_revoked_others" } });
  await writeSecurityAudit({ req, user, action: "SESSIONS_REVOKED", metadata: { count: result.modifiedCount } });
  return res.json({ success: true, message: "Other sessions signed out", data: { revoked: result.modifiedCount } });
}

export async function getManagedUsers(req, res) {
  const { search = "", role = "", status = "" } = req.query;
  const query = {};
  if (role) query.role = role;
  if (status === "enabled") query["twoFactor.enabled"] = true;
  if (status === "disabled") query["twoFactor.enabled"] = { $ne: true };
  if (search) query.$or = [
    { name: { $regex: String(search), $options: "i" } },
    { email: { $regex: String(search), $options: "i" } }
  ];
  if (req.user.role !== "superadmin") query.role = { $in: ["editor", "client", "user"] };
  const users = await User.find(query).select("+twoFactor.recoveryCodeHashes").sort({ createdAt: -1 }).limit(250);
  return res.json({ success: true, message: "Security status retrieved", data: users.map(securityStatus) });
}

async function managedTarget(req, res) {
  const id = objectId(req.params.id);
  const target = id ? await User.findById(id).select(SECRET_SELECT) : null;
  if (!target) {
    res.status(404).json({ success: false, message: "Account not found", data: null });
    return null;
  }
  if (!canManage(req.userDocument, target) || String(target._id) === req.user.id) {
    res.status(403).json({ success: false, message: "You cannot manage this account's security.", data: null });
    return null;
  }
  return target;
}

export async function updateUserSecurityRequirement(req, res) {
  const actor = await requireCredential(req, res);
  if (!actor) return;
  const target = await managedTarget(req, res);
  if (!target) return;
  if (typeof req.body.required === "boolean") target.twoFactor.required = req.body.required;
  if (typeof req.body.forceSetup === "boolean") target.forceSecuritySetup = req.body.forceSetup;
  await target.save();
  await writeSecurityAudit({ req, user: actor, action: "USER_SECURITY_REQUIREMENT_CHANGED", entity: "User", entityId: target._id.toString(), metadata: { targetEmail: target.email, required: target.twoFactor.required, forceSetup: target.forceSecuritySetup } });
  return res.json({ success: true, message: "Security requirement updated", data: securityStatus(target) });
}

export async function resetUserTwoFactor(req, res) {
  const actor = await requireCredential(req, res);
  if (!actor) return;
  const target = await managedTarget(req, res);
  if (!target) return;
  const policy = await SecurityPolicy.getGlobal();
  target.twoFactor.enabled = false;
  target.twoFactor.method = "";
  target.twoFactor.secretEncrypted = "";
  target.twoFactor.pendingSecretEncrypted = "";
  target.twoFactor.recoveryCodeHashes = [];
  target.twoFactor.failedAttempts = 0;
  target.twoFactor.lockUntil = undefined;
  target.twoFactor.lastUsedCounter = -1;
  target.twoFactor.resetAt = new Date();
  target.forceSecuritySetup = roleRequiresTwoFactor(target, policy);
  await target.save();
  await Promise.all([
    Session.updateMany({ user: target._id, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "admin_2fa_reset" } }),
    TrustedDevice.updateMany({ user: target._id, revokedAt: null }, { $set: { revokedAt: new Date() } })
  ]);
  await writeSecurityAudit({ req, user: actor, action: "TWO_FACTOR_RESET", entity: "User", entityId: target._id.toString(), metadata: { targetEmail: target.email, mandatorySetup: target.forceSecuritySetup } });
  return res.json({ success: true, message: target.forceSecuritySetup ? "2FA reset. Mandatory setup will run at next login." : "2FA reset.", data: securityStatus(target) });
}

export async function revokeUserSessions(req, res) {
  const actor = await requireCredential(req, res);
  if (!actor) return;
  const target = await managedTarget(req, res);
  if (!target) return;
  const result = await Session.updateMany({ user: target._id, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "admin_revoked" } });
  await TrustedDevice.updateMany({ user: target._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await writeSecurityAudit({ req, user: actor, action: "SESSIONS_REVOKED", entity: "User", entityId: target._id.toString(), metadata: { targetEmail: target.email, count: result.modifiedCount } });
  return res.json({ success: true, message: "Sessions and trusted devices revoked", data: { revoked: result.modifiedCount } });
}

export async function unlockUser(req, res) {
  const actor = await requireCredential(req, res);
  if (!actor) return;
  const target = await managedTarget(req, res);
  if (!target) return;
  target.failedPasswordAttempts = 0;
  target.accountLockUntil = undefined;
  target.twoFactor.failedAttempts = 0;
  target.twoFactor.lockUntil = undefined;
  await target.save();
  await writeSecurityAudit({ req, user: actor, action: "ACCOUNT_UNLOCKED", entity: "User", entityId: target._id.toString(), metadata: { targetEmail: target.email } });
  return res.json({ success: true, message: "Account unlocked", data: securityStatus(target) });
}

export async function getSecurityPolicy(req, res) {
  const policy = await SecurityPolicy.getGlobal();
  return res.json({ success: true, message: "Security policy retrieved", data: policy });
}

export async function updateSecurityPolicy(req, res) {
  const actor = await requireCredential(req, res);
  if (!actor) return;
  const allowed = ["requireAdmin2FA", "requireUser2FA", "allowedMethods", "trustedDeviceDays", "maxFailedAttempts", "lockMinutes", "sessionExpiryHours", "recoveryCodeCount"];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  updates.updatedBy = actor._id;
  const policy = await SecurityPolicy.findOneAndUpdate({ key: "global" }, { $set: updates }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  let revoked = 0;
  if (req.body.forceLogoutAll === true) {
    const result = await Session.updateMany({ _id: { $ne: req.user.sessionId }, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "global_policy_logout" } });
    revoked = result.modifiedCount;
  }
  await writeSecurityAudit({ req, user: actor, action: "SECURITY_POLICY_CHANGED", entity: "SecurityPolicy", entityId: policy._id.toString(), metadata: { updates: Object.keys(updates), forceLogoutAll: req.body.forceLogoutAll === true, revoked } });
  return res.json({ success: true, message: "Security policy updated", data: { policy, revokedSessions: revoked } });
}

export async function getSecurityAuditLogs(req, res) {
  const { search = "", role = "", action = "", result = "", from = "", to = "" } = req.query;
  const query = {};
  if (role) query.role = role;
  if (action) query.action = action;
  if (result) query.result = result;
  if (search) query.$or = [
    { userEmail: { $regex: String(search), $options: "i" } },
    { action: { $regex: String(search), $options: "i" } },
    { entity: { $regex: String(search), $options: "i" } }
  ];
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(500);
  return res.json({ success: true, message: "Security audit logs retrieved", data: logs });
}

import mongoose from "mongoose";
import crypto from "node:crypto";
import { hashOtp } from "../utils/security.js";

const emailOtpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true,
      select: false
    },
    salt: {
      type: String,
      required: true,
      select: false
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic expiration
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    resendAvailableAt: {
      type: Date,
      required: true
    },
    consumedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

emailOtpSchema.statics.createOtp = async function ({
  userId,
  email,
  otp,
  ttlMinutes = 5,
  cooldownSeconds = 60
}) {
  // Invalidate any previously unconsumed OTPs for this user
  await this.updateMany(
    { user: userId, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtp(otp, salt);
  const now = Date.now();
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000);
  const resendAvailableAt = new Date(now + cooldownSeconds * 1000);

  return this.create({
    user: userId,
    email: String(email).toLowerCase().trim(),
    otpHash,
    salt,
    expiresAt,
    resendAvailableAt,
    attempts: 0,
    maxAttempts: 5,
    consumedAt: null
  });
};

emailOtpSchema.statics.verifyOtp = async function (userId, candidateCode) {
  const cleanCode = String(candidateCode || "").trim();
  if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
    return { valid: false, reason: "malformed" };
  }

  const record = await this.findOne({
    user: userId,
    consumedAt: null
  })
    .sort({ createdAt: -1 })
    .select("+otpHash +salt");

  if (!record) {
    return { valid: false, reason: "not_found_or_expired" };
  }

  if (record.expiresAt < new Date()) {
    record.consumedAt = new Date();
    await record.save();
    return { valid: false, reason: "expired" };
  }

  if (record.attempts >= record.maxAttempts) {
    return { valid: false, reason: "max_attempts_exceeded" };
  }

  const candidateHash = hashOtp(cleanCode, record.salt);
  const candidateBuf = Buffer.from(candidateHash, "utf8");
  const recordBuf = Buffer.from(record.otpHash, "utf8");

  const isMatch =
    candidateBuf.length === recordBuf.length &&
    crypto.timingSafeEqual(candidateBuf, recordBuf);

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const remaining = Math.max(0, record.maxAttempts - record.attempts);
    return {
      valid: false,
      reason: "invalid_code",
      attemptsRemaining: remaining,
      locked: remaining === 0
    };
  }

  // Code is valid! Mark consumed
  record.consumedAt = new Date();
  await record.save();

  return { valid: true };
};

export default mongoose.models.EmailOtp || mongoose.model("EmailOtp", emailOtpSchema);

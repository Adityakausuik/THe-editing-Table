import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "editor", "client", "user"],
      default: "admin",
      index: true
    },
    avatar: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    },
    lastLoginIp: {
      type: String,
      default: ""
    },
    forceSecuritySetup: {
      type: Boolean,
      default: false
    },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      required: { type: Boolean, default: false },
      method: { type: String, enum: ["totp", ""], default: "" },
      secretEncrypted: { type: String, select: false, default: "" },
      pendingSecretEncrypted: { type: String, select: false, default: "" },
      recoveryCodeHashes: { type: [String], select: false, default: [] },
      activatedAt: { type: Date },
      lastAuthenticatedAt: { type: Date },
      lastUsedCounter: { type: Number, default: -1 },
      failedAttempts: { type: Number, default: 0 },
      lockUntil: { type: Date },
      resetAt: { type: Date }
    },
    failedPasswordAttempts: {
      type: Number,
      default: 0
    },
    accountLockUntil: {
      type: Date
    },
    preAuthNonceHash: {
      type: String,
      select: false,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export default mongoose.models.User || mongoose.model("User", userSchema);

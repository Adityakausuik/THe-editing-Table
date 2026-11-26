import { Schema, model } from '../db/modelSchema.js';

const securityPolicySchema = new Schema(
  {
    key: { type: String, default: "global", unique: true, immutable: true },
    requireAdmin2FA: { type: Boolean, default: true },
    requireUser2FA: { type: Boolean, default: false },
    allowedMethods: { type: [String], enum: ["email", "totp"], default: ["email", "totp"] },
    trustedDeviceDays: { type: Number, min: 0, max: 365, default: 30 },
    maxFailedAttempts: { type: Number, min: 3, max: 20, default: 5 },
    lockMinutes: { type: Number, min: 1, max: 1440, default: 15 },
    sessionExpiryHours: { type: Number, min: 1, max: 720, default: 24 },
    recoveryCodeCount: { type: Number, min: 5, max: 20, default: 10 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

securityPolicySchema.statics.getGlobal = function () {
  return this.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export default model("SecurityPolicy", securityPolicySchema, "securitypolicies");

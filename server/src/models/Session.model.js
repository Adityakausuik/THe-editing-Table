import { Schema, model } from '../db/modelSchema.js';

const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date },
    revokeReason: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    twoFactorVerified: { type: Boolean, default: false },
    trustedDeviceUsed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

export default model("Session", sessionSchema);

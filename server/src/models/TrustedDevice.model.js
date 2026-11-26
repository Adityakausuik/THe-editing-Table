import { Schema, model } from '../db/modelSchema.js';

const trustedDeviceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, select: false },
    name: { type: String, default: "Trusted browser" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date }
  },
  { timestamps: true }
);

trustedDeviceSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

export default model("TrustedDevice", trustedDeviceSchema);

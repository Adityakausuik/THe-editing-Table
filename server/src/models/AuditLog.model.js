import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    userEmail: {
      type: String,
      default: "system"
    },
    role: {
      type: String,
      default: "system",
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entity: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      default: ""
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    },
    result: {
      type: String,
      enum: ["success", "failure", "info"],
      default: "success",
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

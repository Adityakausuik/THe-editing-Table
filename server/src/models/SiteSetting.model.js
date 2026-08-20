import mongoose from "mongoose";

const siteSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    group: {
      type: String,
      enum: ["general", "hero", "seo", "footer", "maintenance", "navigation"],
      default: "general",
      index: true
    },
    description: {
      type: String,
      default: ""
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.SiteSetting || mongoose.model("SiteSetting", siteSettingSchema);

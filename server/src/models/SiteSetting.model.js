import { Schema, model } from '../db/modelSchema.js';

const siteSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    value: {
      type: Schema.Types.Mixed,
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
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

export default model("SiteSetting", siteSettingSchema);

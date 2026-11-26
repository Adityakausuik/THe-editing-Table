import { Schema, model } from '../db/modelSchema.js';

const mediaSchema = new Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: "general",
      index: true
    },
    altText: {
      type: String,
      default: ""
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

export default model("Media", mediaSchema);

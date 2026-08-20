import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    fullDescription: {
      type: String,
      default: ""
    },
    category: {
      type: String,
      default: "Post-Production",
      trim: true,
      index: true
    },
    tagline: {
      type: String,
      default: "",
      trim: true
    },
    image: {
      type: String,
      default: ""
    },
    price: {
      type: String,
      default: ""
    },
    turnaround: {
      type: String,
      default: "48-72 Hours"
    },
    features: [{ type: String }],
    deliverables: [{ type: String }],
    icon: {
      type: String,
      default: "Sparkles"
    },
    order: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Service || mongoose.model("Service", serviceSchema);

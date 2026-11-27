import { Schema, model } from '../db/modelSchema.js';

const portfolioItemSchema = new Schema(
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
    category: {
      type: String,
      required: true,
      index: true
    },
    client: {
      type: String,
      default: ""
    },
    date: {
      type: String,
      default: ""
    },
    metadata: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    coverImage: {
      type: String,
      default: ""
    },
    videoUrl: {
      type: String,
      default: ""
    },
    deliverables: [{ type: String }],
    isFeatured: {
      type: Boolean,
      default: false
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

export default model("PortfolioItem", portfolioItemSchema);

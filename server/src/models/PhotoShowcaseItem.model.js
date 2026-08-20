import mongoose from "mongoose";

const photoShowcaseItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Photo title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"]
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    propertyName: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      index: true,
      default: "High-End Photo Retouching"
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    image: {
      publicId: String,
      url: String,
      path: String,
      altText: String
    },
    mobileImage: {
      publicId: String,
      url: String,
      path: String,
      altText: String
    },
    badgeText: {
      type: String,
      trim: true
    },
    ctaText: {
      type: String,
      trim: true
    },
    ctaUrl: {
      type: String,
      trim: true
    },
    openInNewTab: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    publishedAt: Date,
    expiresAt: Date,
    deletedAt: {
      type: Date,
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
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

photoShowcaseItemSchema.index({ isActive: 1, deletedAt: 1, order: 1 });
photoShowcaseItemSchema.index({ category: 1, isActive: 1 });
photoShowcaseItemSchema.index({ isFeatured: 1, isActive: 1 });

const PhotoShowcaseItem =
  mongoose.models.PhotoShowcaseItem ||
  mongoose.model("PhotoShowcaseItem", photoShowcaseItemSchema);

export default PhotoShowcaseItem;

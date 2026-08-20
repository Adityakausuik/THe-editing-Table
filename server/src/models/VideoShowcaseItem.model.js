import mongoose from "mongoose";

const videoShowcaseItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
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
      default: "Real Estate & Architecture"
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    sourceType: {
      type: String,
      enum: ["upload", "youtube", "vimeo", "external", "hls"],
      default: "upload"
    },
    videoUrl: {
      type: String,
      trim: true
    },
    videoFile: {
      publicId: String,
      url: String,
      path: String,
      mimeType: String,
      size: Number,
      originalName: String
    },
    mobileVideoFile: {
      publicId: String,
      url: String,
      path: String,
      mimeType: String,
      size: Number,
      originalName: String
    },
    thumbnail: {
      publicId: String,
      url: String,
      path: String,
      altText: String
    },
    mobileThumbnail: {
      publicId: String,
      url: String,
      path: String,
      altText: String
    },
    captionUrl: {
      type: String,
      trim: true
    },
    duration: {
      type: Number,
      default: 0
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
    autoplay: {
      type: Boolean,
      default: false
    },
    loop: {
      type: Boolean,
      default: true
    },
    muted: {
      type: Boolean,
      default: true
    },
    showControls: {
      type: Boolean,
      default: false
    },
    views: {
      type: Number,
      default: 0
    },
    playClicks: {
      type: Number,
      default: 0
    },
    completedViews: {
      type: Number,
      default: 0
    },
    ctaClicks: {
      type: Number,
      default: 0
    },
    publishedAt: Date,
    expiresAt: Date,
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 160
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 320
    },
    ogImage: {
      publicId: String,
      url: String,
      path: String
    },
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

videoShowcaseItemSchema.index({ isActive: 1, deletedAt: 1, order: 1 });
videoShowcaseItemSchema.index({ category: 1, isActive: 1 });
videoShowcaseItemSchema.index({ isFeatured: 1, isActive: 1 });
videoShowcaseItemSchema.index({ publishedAt: 1, expiresAt: 1 });
videoShowcaseItemSchema.index({ createdAt: -1 });

const VideoShowcaseItem =
  mongoose.models.VideoShowcaseItem ||
  mongoose.model("VideoShowcaseItem", videoShowcaseItemSchema);

export default VideoShowcaseItem;

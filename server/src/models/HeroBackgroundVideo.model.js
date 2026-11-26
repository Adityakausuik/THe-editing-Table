import { Schema, model } from '../db/modelSchema.js';

const heroBackgroundVideoSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "Hero Background Video"
    },
    videoUrl: {
      type: String,
      trim: true,
      default: ""
    },
    mobileVideoUrl: {
      type: String,
      trim: true,
      default: ""
    },
    posterUrl: {
      type: String,
      trim: true,
      default: ""
    },
    videoType: {
      type: String,
      trim: true,
      default: "video/mp4"
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true
    },
    playbackSettings: {
      autoplay: { type: Boolean, default: true },
      muted: { type: Boolean, default: true },
      loop: { type: Boolean, default: true },
      playsInline: { type: Boolean, default: true }
    },
    overlayOpacity: {
      type: Number,
      default: 0.35,
      min: 0,
      max: 1
    },
    videoPosition: {
      type: String,
      trim: true,
      default: "center"
    },
    playbackSpeed: {
      type: Number,
      default: 1.0,
      min: 0.25,
      max: 2.0
    },
    fileMetadata: {
      type: Schema.Types.Mixed,
      default: () => ({})
    },
    version: {
      type: Number,
      default: 1
    },
    versionNotes: {
      type: String,
      trim: true,
      default: ""
    },
    createdBy: {
      type: String,
      default: ""
    },
    updatedBy: {
      type: String,
      default: ""
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default model("HeroBackgroundVideo", heroBackgroundVideoSchema);

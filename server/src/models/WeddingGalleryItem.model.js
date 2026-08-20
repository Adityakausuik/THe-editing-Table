import mongoose from "mongoose";

const weddingGalleryItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: "Portraits",
      trim: true,
      index: true
    },
    location: {
      type: String,
      default: "",
      trim: true
    },
    coupleNames: {
      type: String,
      default: "",
      trim: true
    },
    caption: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      required: true
    },
    coverImage: {
      type: String,
      default: ""
    },
    gallery: [{ type: String }],
    storySummary: {
      type: String,
      default: ""
    },
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

export default mongoose.models.WeddingGalleryItem || mongoose.model("WeddingGalleryItem", weddingGalleryItemSchema);

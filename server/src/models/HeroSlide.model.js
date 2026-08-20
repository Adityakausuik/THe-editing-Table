import mongoose from "mongoose";

const heroSlideSchema = new mongoose.Schema(
  {
    slideNumber: {
      type: Number,
      default: 1
    },
    slideKey: {
      type: String,
      required: [true, "Slide key is required"],
      unique: true,
      trim: true,
      index: true
    },
    slideType: {
      type: String,
      required: [true, "Slide type is required"],
      enum: {
        values: ["ceo", "team", "collaborations"],
        message: "Invalid slide type. Must be 'ceo', 'team', or 'collaborations'."
      },
      default: "ceo"
    },
    layoutType: {
      type: String,
      enum: ["ceo_editorial", "team_layered", "brand_strips"],
      default: "ceo_editorial"
    },
    label: {
      type: String,
      trim: true,
      default: ""
    },
    eyebrow: {
      type: String,
      trim: true,
      default: ""
    },
    headingLines: [{ type: String, trim: true }],
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"]
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [300, "Subtitle cannot exceed 300 characters"],
      default: ""
    },
    tag: {
      type: String,
      trim: true,
      default: ""
    },
    caption: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: ""
    },
    featureItems: [{ type: String, trim: true }],
    quote: {
      type: String,
      trim: true,
      default: ""
    },
    ctaText: {
      type: String,
      trim: true,
      default: ""
    },
    ctaLink: {
      type: String,
      trim: true,
      default: ""
    },
    trustLabel: {
      type: String,
      trim: true,
      default: ""
    },
    mainImage: {
      type: String,
      trim: true,
      default: ""
    },
    images: [{ type: String, trim: true }],
    imageGrid: [{ type: String, trim: true }],
    featuredImageIndex: {
      type: Number,
      default: 0
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    status: {
      type: String,
      enum: ["draft", "published", "inactive"],
      default: "published",
      index: true
    },
    transitionDuration: {
      type: Number,
      default: 5000
    }
  },
  {
    timestamps: true
  }
);

heroSlideSchema.index({ active: 1, order: 1 });

const HeroSlide = mongoose.models.HeroSlide || mongoose.model("HeroSlide", heroSlideSchema);

export { HeroSlide };
export default HeroSlide;

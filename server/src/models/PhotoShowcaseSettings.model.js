import mongoose from "mongoose";

const photoShowcaseSettingsSchema = new mongoose.Schema(
  {
    settingsKey: {
      type: String,
      default: "photo-showcase",
      unique: true
    },
    heading: {
      type: String,
      default: "Masterpiece High-End Photo Retouching & Color Suite"
    },
    subheading: {
      type: String,
      default:
        "Bespoke architectural imagery, high-end editorial photo retouching, and luxury property portfolios crafted with precision."
    },
    showSection: {
      type: Boolean,
      default: true
    },
    showSubheading: {
      type: Boolean,
      default: true
    },
    alignment: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center"
    },
    headingColor: {
      type: String,
      default: "#2F3A2F"
    },
    textColor: {
      type: String,
      default: "#687567"
    },
    backgroundColor: {
      type: String,
      default: "#F8FBF7"
    },
    sectionPaddingTop: {
      type: Number,
      default: 80
    },
    sectionPaddingBottom: {
      type: Number,
      default: 80
    },
    maxWidth: {
      type: Number,
      default: 1440
    },
    autoplay: {
      type: Boolean,
      default: true
    },
    autoplayDelay: {
      type: Number,
      default: 5000
    },
    infiniteLoop: {
      type: Boolean,
      default: true
    },
    pauseOnHover: {
      type: Boolean,
      default: true
    },
    cardRadius: {
      type: Number,
      default: 24
    },
    showArrows: {
      type: Boolean,
      default: true
    },
    showPagination: {
      type: Boolean,
      default: true
    },
    ctaText: {
      type: String,
      default: "Explore Full Gallery"
    },
    ctaUrl: {
      type: String,
      default: "/portfolio"
    },
    ctaVisible: {
      type: Boolean,
      default: true
    },
    ctaNewTab: {
      type: Boolean,
      default: false
    },
    anchorId: {
      type: String,
      default: "photo-showcase"
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

const PhotoShowcaseSettings =
  mongoose.models.PhotoShowcaseSettings ||
  mongoose.model("PhotoShowcaseSettings", photoShowcaseSettingsSchema);

export default PhotoShowcaseSettings;

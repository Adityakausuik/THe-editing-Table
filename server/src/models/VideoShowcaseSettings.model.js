import mongoose from "mongoose";

const videoShowcaseSettingsSchema = new mongoose.Schema(
  {
    settingsKey: {
      type: String,
      default: "video-showcase",
      unique: true
    },
    heading: {
      type: String,
      default: "We Turn Your Raw Footage Into Stories Worth Watching"
    },
    subheading: {
      type: String,
      default:
        "From cinematic wedding films and emotional highlights to brand campaigns, reels, and professional post-production — The Editing Table transforms every frame into a polished visual experience designed to connect, engage, and leave a lasting impression."
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
    hoverPlayback: {
      type: Boolean,
      default: true
    },
    centerAutoplay: {
      type: Boolean,
      default: true
    },
    enableParallax: {
      type: Boolean,
      default: true
    },
    animationDuration: {
      type: Number,
      default: 0.8
    },
    cardRadius: {
      type: Number,
      default: 24
    },
    cardGap: {
      type: Number,
      default: 20
    },
    shadowIntensity: {
      type: Number,
      default: 1
    },
    showArrows: {
      type: Boolean,
      default: true
    },
    showPagination: {
      type: Boolean,
      default: true
    },
    desktopSlides: {
      type: Number,
      default: 5
    },
    tabletSlides: {
      type: Number,
      default: 3
    },
    mobileSlides: {
      type: Number,
      default: 1
    },
    ctaText: {
      type: String,
      default: "Explore Our Portfolio"
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
    seoTitle: {
      type: String,
      default: "Scroll-Stopping Real Estate Videos"
    },
    seoDescription: {
      type: String,
      default: "Cinematic property walkthroughs, drone films and social media videos."
    },
    anchorId: {
      type: String,
      default: "video-showcase"
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

const VideoShowcaseSettings =
  mongoose.models.VideoShowcaseSettings ||
  mongoose.model("VideoShowcaseSettings", videoShowcaseSettingsSchema);

export default VideoShowcaseSettings;

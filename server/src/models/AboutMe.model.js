import mongoose from "mongoose";

const whatIDoItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    tag: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const philosophyPillarSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const aboutMeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "about_me_content",
      unique: true,
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      trim: true,
      default: "Akshay Chhabra"
    },
    designation: {
      type: String,
      trim: true,
      default: "Founder & Creative Director"
    },
    location: {
      type: String,
      trim: true,
      default: "Mohali, Punjab • Global Remote"
    },
    profileImage: {
      type: String,
      trim: true,
      default: "/assets/akshay-chhabra-founder.jpg"
    },
    quote: {
      type: String,
      trim: true,
      default: "Every frame matters. Every story deserves its own visual language."
    },
    introBadge: {
      type: String,
      trim: true,
      default: "FOUNDER & CREATIVE DIRECTOR"
    },
    introTitle: {
      type: String,
      trim: true,
      default: "Akshay Chhabra"
    },
    introSubtitle: {
      type: String,
      trim: true,
      default:
        "Founder and creative force behind The Editing Table — crafting bespoke visual language and cinematic color science for premier storytellers worldwide."
    },
    aboutHeading: {
      type: String,
      trim: true,
      default: "Crafting Stories Beyond The Frame"
    },
    aboutParagraphs: {
      type: [String],
      default: [
        "Founded by Akshay Chhabra, The Editing Table was established with a singular conviction: every filmmaker, photographer, and creative brand deserves post-production that elevates their visual storytelling to cinematic perfection.",
        "Over the past decade, Akshay has overseen hundreds of luxury wedding films, high-fashion editorial campaigns, and commercial master deliveries across India, the UK, Europe, and North America.",
        "Working at the intersection of raw human emotion and technical color science, Akshay personally directs the studio's workflow to preserve each client's signature aesthetic while applying calibrated 35mm analog emulation and precision color grading."
      ]
    },
    visionHeading: {
      type: String,
      trim: true,
      default: "A Vision for Global Cinematic Post-Production"
    },
    visionText: {
      type: String,
      trim: true,
      default:
        "To build an artist-first post-production house that bridges the gap between raw footage capture and theatrical-grade master delivery. By combining calibrated color-managed pipelines (ACES / DaVinci YRGB) with artisanal retouching, we empower filmmakers and photographers to scale their output without compromising on bespoke craftsmanship."
    },
    experienceYears: {
      type: String,
      trim: true,
      default: "10+ Years"
    },
    experienceHeading: {
      type: String,
      trim: true,
      default: "A Decade of Specialized Film & Editorial Craft"
    },
    experienceText: {
      type: String,
      trim: true,
      default:
        "A journey rooted in the editing room, evolving from independent documentary and film assembly into leading one of the premier post-production teams in the region. Akshay has refined precision grading workflows for ARRI, RED, Sony Venice, and Canon Cinema RAW systems."
    },
    skills: {
      type: [String],
      default: [
        "DaVinci Resolve Studio",
        "ACES Color Management",
        "35mm / 65mm Film Stock Emulation",
        "Dolby Vision HDR Mastering",
        "High-Fashion Frequency Separation",
        "Micro Dodge & Burn",
        "RAW Footage Assembly",
        "Audio Mastering & Sound Design"
      ]
    },
    whatIDo: {
      type: [whatIDoItemSchema],
      default: [
        {
          title: "Creative Direction & Color Science",
          description:
            "Architecting custom project color palettes, developing bespoke LUTs, and supervising calibrated color grading from RAW ingest to final delivery.",
          tag: "COLOR & LOOK DEV"
        },
        {
          title: "Narrative Assembly & Editorial Pacing",
          description:
            "Crafting emotional rhythm, story structure, and seamless scene transitions for cinematic wedding films and commercial reels.",
          tag: "EDITORIAL"
        },
        {
          title: "Luxury Photo Retouching",
          description:
            "Overseeing fine-art portrait retouching, natural skin-texture preservation, and frequency separation for high-fashion and luxury editorial clients.",
          tag: "RETOUCHING"
        },
        {
          title: "Studio Oversight & Quality Assurance",
          description:
            "Enforcing a rigorous 100% personal quality review gate on every deliverable before client presentation to ensure flawless execution.",
          tag: "QUALITY GATE"
        }
      ]
    },
    companyRoleHeading: {
      type: String,
      trim: true,
      default: "The Editing Table — Full-Service Studio Capabilities"
    },
    companyRoleText: {
      type: String,
      trim: true,
      default:
        "The Editing Table operates as a dedicated creative extension of your production team. We handle end-to-end post-production logistics: footage proxying, editorial assembly, DaVinci Resolve color grading, frequency separation retouching, sound mastering, and secure cloud delivery with fast 48–72h turnaround cycles."
    },
    philosophyPillars: {
      type: [philosophyPillarSchema],
      default: [
        {
          title: "Uncompromising Precision",
          description:
            "Every frame is inspected at pixel and waveform level. We never rely on automated shortcuts or generic presets."
        },
        {
          title: "Filmic Authenticity",
          description:
            "Honoring the rich, organic texture of analog film stocks over synthetic digital gloss, creating visuals that stand the test of time."
        },
        {
          title: "Bespoke Partnership",
          description:
            "We adapt to your unique signature style rather than imposing ours, ensuring your brand identity remains distinct and celebrated."
        }
      ]
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

const AboutMe = mongoose.models.AboutMe || mongoose.model("AboutMe", aboutMeSchema);

export { AboutMe };
export default AboutMe;

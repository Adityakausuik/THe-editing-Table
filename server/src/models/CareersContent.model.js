import mongoose from "mongoose";

const whyJoinUsCardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    icon: { type: String, default: "Sparkles" },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const careersContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "careers_page_content",
      unique: true,
      index: true
    },
    hero: {
      heading: {
        type: String,
        default: "Build Your Career With Us"
      },
      description: {
        type: String,
        default: "Join our passionate team of visionary colorists, editors, retouching artists, and creative technologists crafting timeless visual stories for premier studios worldwide."
      },
      badge: {
        type: String,
        default: "JOIN OUR CREATIVE STUDIO"
      }
    },
    whyJoinUs: {
      type: [whyJoinUsCardSchema],
      default: [
        {
          id: "card-1",
          title: "Creative & Collaborative Environment",
          description: "Work alongside senior filmmakers, colorists, and post-production leads who respect and nurture artistic vision.",
          icon: "Users",
          active: true,
          order: 0
        },
        {
          id: "card-2",
          title: "Work on Exciting Projects",
          description: "From luxury destination weddings to high-fashion campaigns and cinematic documentaries with global reach.",
          icon: "Film",
          active: true,
          order: 1
        },
        {
          id: "card-3",
          title: "Learn & Grow",
          description: "Continuous mentorship in advanced DaVinci Resolve color science, 35mm film emulation, and high-fashion retouching.",
          icon: "Sparkles",
          active: true,
          order: 2
        },
        {
          id: "card-4",
          title: "Flexible & Supportive Culture",
          description: "Healthy work-life balance, studio flexibility, and dedicated post-production suites designed for artistic focus.",
          icon: "Heart",
          active: true,
          order: 3
        },
        {
          id: "card-5",
          title: "Be Part of a Growing Team",
          description: "Shape the trajectory of our rapidly expanding studio as we pioneer bespoke editorial post-production worldwide.",
          icon: "TrendingUp",
          active: true,
          order: 4
        }
      ]
    },
    cta: {
      heading: {
        type: String,
        default: "Don't See the Right Opening?"
      },
      description: {
        type: String,
        default: "We are always on the lookout for exceptional talent. Submit your portfolio and resume to join our talent roster."
      },
      buttonText: {
        type: String,
        default: "Send Your Resume"
      }
    }
  },
  { timestamps: true }
);

const CareersContent = mongoose.models.CareersContent || mongoose.model("CareersContent", careersContentSchema);
export { CareersContent };
export default CareersContent;

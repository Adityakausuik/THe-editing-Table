import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    designation: { type: String, required: true, trim: true },
    category: { type: String, default: "Editorial Artist", trim: true },
    shortBio: { type: String, required: true, trim: true },
    fullBio: { type: String, default: "" },
    profileImage: { type: String, required: true },
    skills: [{ type: String, trim: true }],
    experience: { type: String, default: "5+ Years" },
    socialLinks: {
      instagram: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      vimeo: { type: String, default: "" }
    },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const TeamMember = mongoose.models.TeamMember || mongoose.model("TeamMember", teamMemberSchema);
export { TeamMember };
export default TeamMember;

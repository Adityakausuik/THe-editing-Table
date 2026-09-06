import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    location: {
      type: String,
      trim: true,
      default: "Mohali, Punjab • Studio / Hybrid"
    },
    employmentType: {
      type: String,
      enum: ["Full Time", "Part Time", "Internship", "Contract", "Freelance"],
      default: "Full Time"
    },
    experience: {
      type: String,
      trim: true,
      default: "2+ Years"
    },
    salary: {
      type: String,
      trim: true,
      default: "Competitive / Based on Portfolio"
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    responsibilities: {
      type: [String],
      default: []
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    preferredSkills: {
      type: [String],
      default: []
    },
    benefits: {
      type: [String],
      default: []
    },
    deadline: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["Active", "Draft", "Closed", "Inactive"],
      default: "Active",
      index: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, order: 1, createdAt: -1 });

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);
export { Job };
export default Job;

import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true
    },
    positionTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    portfolio: {
      type: String,
      trim: true,
      default: ""
    },
    linkedin: {
      type: String,
      trim: true,
      default: ""
    },
    resume: {
      url: { type: String, required: true },
      filename: { type: String, required: true },
      originalName: { type: String, default: "" },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: "application/pdf" }
    },
    coverLetter: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["New", "Reviewing", "Shortlisted", "Interview", "Selected", "Rejected"],
      default: "New",
      index: true
    },
    adminNotes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

jobApplicationSchema.index({ status: 1, createdAt: -1 });

const JobApplication = mongoose.models.JobApplication || mongoose.model("JobApplication", jobApplicationSchema);
export { JobApplication };
export default JobApplication;

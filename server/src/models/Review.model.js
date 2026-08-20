import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: [120, "Email cannot exceed 120 characters"]
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters"],
      default: ""
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
      default: ""
    },
    projectType: {
      type: String,
      required: [true, "Project type is required"],
      trim: true,
      maxlength: [100, "Project type cannot exceed 100 characters"],
      index: true
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer from 1 to 5"
      },
      index: true
    },
    title: {
      type: String,
      required: [true, "Review title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"]
    },
    message: {
      type: String,
      required: [true, "Review message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"]
    },
    profileImage: {
      type: String,
      trim: true,
      default: ""
    },
    projectImage: {
      type: String,
      trim: true,
      default: ""
    },
    country: {
      type: String,
      trim: true,
      maxlength: [50, "Country cannot exceed 50 characters"],
      default: ""
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, "City cannot exceed 50 characters"],
      default: ""
    },
    verified: {
      type: Boolean,
      default: false,
      index: true
    },
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "hidden"],
      default: "pending",
      index: true
    },
    adminReply: {
      message: { type: String, trim: true, default: "" },
      repliedAt: { type: Date },
      repliedBy: { type: String, default: "" }
    },
    ipAddress: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, featured: 1, createdAt: -1 });
reviewSchema.index({ email: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export { Review };
export default Review;

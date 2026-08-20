import mongoose from "mongoose";

const contactEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true
    },
    label: {
      type: String,
      trim: true
    },
    primary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

contactEmailSchema.index({ status: 1, deletedAt: 1, order: 1 });

const ContactEmail =
  mongoose.models.ContactEmail ||
  mongoose.model("ContactEmail", contactEmailSchema);

export default ContactEmail;

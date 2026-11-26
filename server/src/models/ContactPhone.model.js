import { Schema, model } from '../db/modelSchema.js';

const contactPhoneSchema = new Schema(
  {
    country: {
      type: String,
      default: "India",
      trim: true
    },
    countryCode: {
      type: String,
      default: "IN",
      trim: true,
      uppercase: true
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    displayPhone: {
      type: String,
      trim: true
    },
    label: {
      type: String,
      trim: true
    },
    whatsappEnabled: {
      type: Boolean,
      default: false
    },
    callEnabled: {
      type: Boolean,
      default: true
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
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

contactPhoneSchema.index({ status: 1, deletedAt: 1, order: 1 });

const ContactPhone =
  model("ContactPhone", contactPhoneSchema);

export default ContactPhone;

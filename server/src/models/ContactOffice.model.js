import { Schema, model } from '../db/modelSchema.js';

const contactOfficeSchema = new Schema(
  {
    officeName: {
      type: String,
      default: "Headquarters",
      trim: true
    },
    companyName: {
      type: String,
      default: "NHK INFOTECH",
      trim: true
    },
    addressLine1: {
      type: String,
      default: "A-28, Industrial Area, Sector 73",
      trim: true
    },
    addressLine2: {
      type: String,
      default: "Mohali, Punjab 160055",
      trim: true
    },
    city: {
      type: String,
      default: "Mohali",
      trim: true
    },
    state: {
      type: String,
      default: "Punjab",
      trim: true
    },
    country: {
      type: String,
      default: "India",
      trim: true
    },
    postalCode: {
      type: String,
      default: "160055",
      trim: true
    },
    googleMapUrl: {
      type: String,
      trim: true
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
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

contactOfficeSchema.index({ status: 1, deletedAt: 1, order: 1 });

const ContactOffice =
  model("ContactOffice", contactOfficeSchema);

export default ContactOffice;

import mongoose from "mongoose";

const contactSettingsSchema = new mongoose.Schema(
  {
    settingsKey: {
      type: String,
      default: "contact-settings",
      unique: true
    },
    sectionTitle: {
      type: String,
      default: "CONTACT US"
    },
    phoneHeading: {
      type: String,
      default: "PHONE"
    },
    emailHeading: {
      type: String,
      default: "EMAIL"
    },
    officeHeading: {
      type: String,
      default: "OFFICE"
    },
    workingHoursHeading: {
      type: String,
      default: "WORKING HOURS"
    },
    ctaText: {
      type: String,
      default: "Let's Work Together"
    },
    ctaLink: {
      type: String,
      default: "/contactus"
    },
    ctaNewTab: {
      type: Boolean,
      default: false
    },
    sectionEnabled: {
      type: Boolean,
      default: true
    },
    phoneEnabled: {
      type: Boolean,
      default: true
    },
    emailEnabled: {
      type: Boolean,
      default: true
    },
    officeEnabled: {
      type: Boolean,
      default: true
    },
    workingHoursEnabled: {
      type: Boolean,
      default: true
    },
    ctaEnabled: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

const ContactSettings =
  mongoose.models.ContactSettings ||
  mongoose.model("ContactSettings", contactSettingsSchema);

export default ContactSettings;

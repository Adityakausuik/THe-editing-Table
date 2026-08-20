import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Partner name is required"],
      trim: true
    },
    category: {
      type: String,
      default: "Production House",
      trim: true
    },
    locationTag: {
      type: String,
      default: "Global",
      trim: true
    },
    logo: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    website: {
      type: String,
      default: "https://theeditingtable.com",
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

partnerSchema.index({ active: 1, order: 1 });

const Partner = mongoose.models.Partner || mongoose.model("Partner", partnerSchema);

export default Partner;

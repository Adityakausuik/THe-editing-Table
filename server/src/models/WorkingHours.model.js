import { Schema, model } from '../db/modelSchema.js';

const workingHoursSchema = new Schema(
  {
    dayFrom: {
      type: String,
      default: "Mon",
      trim: true
    },
    dayTo: {
      type: String,
      default: "Sat",
      trim: true
    },
    openingTime: {
      type: String,
      default: "10:00 AM",
      trim: true
    },
    closingTime: {
      type: String,
      default: "7:00 PM",
      trim: true
    },
    customText: {
      type: String,
      trim: true
    },
    closed: {
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

workingHoursSchema.index({ status: 1, deletedAt: 1, order: 1 });

const WorkingHours =
  model("WorkingHours", workingHoursSchema);

export default WorkingHours;

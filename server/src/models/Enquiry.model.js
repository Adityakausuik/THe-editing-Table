import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    service: { type: String, required: true, trim: true },
    budget: { type: String, trim: true, default: "Discuss after scope" },
    deliveryDate: { type: String, trim: true, default: "" },
    referenceUrl: { type: String, trim: true, default: "" },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["pending", "contacted", "in_progress", "completed", "archived"], default: "pending" },
    source: { type: String, default: "website_contact_form" },
    assignedTo: { type: String, default: "" },
    internalNotes: { type: String, default: "" }
  },
  { timestamps: true }
);

enquirySchema.index({ createdAt: -1 });

const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);
export { Enquiry };
export default Enquiry;

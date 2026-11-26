import { Schema, model } from '../db/modelSchema.js';

const brandCollaborationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    brandName: { type: String, required: true, trim: true },
    brandLogo: { type: String, default: "" },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, required: true },
    category: { type: String, required: true, index: true },
    services: [{ type: String, trim: true }],
    coverImage: { type: String, required: true },
    gallery: [{ type: String }],
    videoUrl: { type: String, default: "" },
    projectDate: { type: String, default: "2026" },
    featured: { type: Boolean, default: false, index: true },
    published: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const BrandCollaboration =
  model("BrandCollaboration", brandCollaborationSchema);
export { BrandCollaboration };
export default BrandCollaboration;

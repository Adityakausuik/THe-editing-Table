import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    coverImage: { type: String, required: true },
    author: {
      name: { type: String, required: true },
      role: { type: String, default: "Senior Editor" },
      avatar: { type: String, default: "" }
    },
    category: { type: String, required: true, index: true },
    tags: [{ type: String, trim: true }],
    readTime: { type: String, default: "5 min read" },
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },
    featured: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true },
    publishedAt: { type: Date, default: Date.now },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" }
  },
  { timestamps: true }
);

blogPostSchema.index({ publishedAt: -1 });

const BlogPost = mongoose.models.BlogPost || mongoose.model("BlogPost", blogPostSchema);
export { BlogPost };
export default BlogPost;

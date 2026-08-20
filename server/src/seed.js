import mongoose from "mongoose";
import { env } from "./config/env.js";
import SiteSetting from "./models/SiteSetting.model.js";
import User from "./models/User.model.js";

const adminEmail = env.ADMIN_EMAIL;
const adminPassword = env.ADMIN_PASSWORD;

const defaultSettings = [
  {
    key: "siteName",
    value: "The Editing Table",
    group: "general",
    description: "Public website name"
  },
  {
    key: "contactEmail",
    value: "hello@theeditingtable.com",
    group: "general",
    description: "Primary public contact email"
  },
  {
    key: "metaTitle",
    value: "The Editing Table | High-End Post Production Studio",
    group: "seo",
    description: "Default SEO title"
  },
  {
    key: "metaDescription",
    value:
      "Bespoke color grading, photo retouching, and film editing for wedding filmmakers and commercial studios worldwide.",
    group: "seo",
    description: "Default SEO description"
  }
];

async function upsertAdmin() {
  if (!adminPassword) {
    console.log("ADMIN_PASSWORD is not configured; administrator creation was skipped.");
    return;
  }
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: existing.name,
          role: existing.role,
          isActive: true
        }
      }
    );
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await User.hashPassword(adminPassword);
  await User.create({
    name: "Administrator",
    email: adminEmail,
    passwordHash,
    role: "superadmin",
    isActive: true
  });
  console.log(`Admin user created: ${adminEmail}`);
}

async function upsertSettings() {
  for (const setting of defaultSettings) {
    await SiteSetting.updateOne(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true }
    );
  }
  console.log(`Site settings ensured: ${defaultSettings.length}`);
}

async function seedDatabase() {
  const mongoUri = env.MONGODB_URI || "mongodb://127.0.0.1:27017/the_editing_table";
  console.log("Initializing required database records.");
  console.log(`Connecting to MongoDB: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await upsertAdmin();
    await upsertSettings();

    console.log("Initialization complete. CMS content collections were not modified.");
    console.log(`Admin Email: ${adminEmail}`);
    console.log("Administrator credentials are sourced from environment variables.");
  } catch (error) {
    console.error("Database seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();

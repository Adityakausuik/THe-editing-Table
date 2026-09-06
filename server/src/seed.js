import mongoose from "mongoose";
import { env } from "./config/env.js";
import SiteSetting from "./models/SiteSetting.model.js";
import User from "./models/User.model.js";
import Job from "./models/Job.model.js";
import CareersContent from "./models/CareersContent.model.js";

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

async function upsertCareers() {
  const existingContent = await CareersContent.findOne({ key: "careers_page_content" });
  if (!existingContent) {
    await CareersContent.create({ key: "careers_page_content" });
    console.log("Default Careers page content initialized.");
  }

  const jobCount = await Job.countDocuments();
  if (jobCount === 0) {
    const defaultJobs = [
      {
        title: "Senior Colorist & DaVinci Resolve Artist",
        department: "Post-Production",
        location: "Mohali, Punjab • Studio / Hybrid",
        employmentType: "Full Time",
        experience: "3+ Years",
        salary: "Competitive / Based on Portfolio",
        description: "We are seeking a master colorist with an extraordinary eye for tone, texture, and analog film emulation. You will lead color grading on high-fashion commercial projects, luxury international weddings, and cinematic short films.",
        responsibilities: [
          "Lead color grading sessions on DaVinci Resolve Studio utilizing calibrated ACES and DaVinci YRGB Color Managed pipelines.",
          "Develop custom film print emulation (FPE) looks and proprietary studio LUTs.",
          "Collaborate directly with directors of photography, filmmakers, and senior editors to establish project color palettes.",
          "Conduct final quality control on SDR and HDR deliverables across REC.709 and DCI-P3 color spaces."
        ],
        requiredSkills: [
          "DaVinci Resolve Studio",
          "ACES & Color Management",
          "Film Emulation",
          "Shot Matching",
          "HDR / SDR Mastering"
        ],
        preferredSkills: [
          "Tangent Control Surfaces",
          "Node-based OFX Workflows",
          "Kodak/Fuji Stock Chemistry Knowledge"
        ],
        benefits: [
          "Dedicated calibrated reference suite (Apple XDR / Flanders Scientific).",
          "Collaborative, artist-first studio environment with high creative freedom.",
          "Health benefits, performance bonuses, and annual equipment stipend.",
          "Flexible hybrid working options."
        ],
        deadline: "Open until filled",
        status: "Active",
        order: 0
      },
      {
        title: "Editorial Video Editor (Cinematic & Fashion)",
        department: "Editorial Suite",
        location: "Mohali, Punjab • Studio / Hybrid",
        employmentType: "Full Time",
        experience: "2+ Years",
        salary: "Competitive",
        description: "Looking for a rhythmic, detail-oriented story editor passionate about pacing, sound design, and emotional resonance. You will craft bespoke wedding films, commercial fashion reels, and documentary narratives.",
        responsibilities: [
          "Cut dynamic, emotionally engaging long-form wedding films, teasers, and fashion editorial reels.",
          "Curate soundtrack selections, perform Foley, sound design, and audio master sweetening.",
          "Work closely with our creative director and color team to execute polished, client-ready edits.",
          "Manage media ingestion, multicam syncing, proxy workflows, and archive management."
        ],
        requiredSkills: [
          "Premiere Pro / Final Cut / DaVinci Resolve",
          "Pacing & Story Architecture",
          "Sound Design & Audio Sweetening",
          "Multi-camera Ingestion",
          "Proxy Workflows"
        ],
        preferredSkills: [
          "After Effects Motion Graphics",
          "Music Composition Awareness"
        ],
        benefits: [
          "High-performance editing workstations with ultra-fast NVMe RAID storage.",
          "Exposure to elite celebrity weddings and luxury global brands.",
          "Mentorship from veteran industry film editors.",
          "Performance-based annual bonuses."
        ],
        deadline: "Open until filled",
        status: "Active",
        order: 1
      },
      {
        title: "High-Fashion & Wedding Photo Retoucher",
        department: "Retouching Suite",
        location: "Mohali, Punjab • Studio / Hybrid",
        employmentType: "Full Time",
        experience: "2+ Years",
        salary: "Competitive",
        description: "Join our luxury stills department retouching world-class wedding portraiture, editorial fashion shoots, and commercial campaigns. High sensitivity to natural skin texture and color grading is essential.",
        responsibilities: [
          "Execute non-destructive high-end skin retouching (frequency separation, dodge & burn) retaining realistic pores and natural skin texture.",
          "Clean backgrounds, reconstruct wardrobe details, and perform composite adjustments seamlessly.",
          "Color grade batches in Capture One and Lightroom maintaining signature editorial aesthetics.",
          "Deliver calibrated print-ready TIFFs and web-optimized deliverables under deadlines."
        ],
        requiredSkills: [
          "Adobe Photoshop Master",
          "Capture One Pro / Lightroom",
          "Dodge & Burn Technique",
          "Frequency Separation",
          "Color Matching"
        ],
        preferredSkills: [
          "Wacom Tablet Mastery",
          "CMYK Pre-press knowledge"
        ],
        benefits: [
          "Dual EIZO color-accurate monitoring setup.",
          "Continuous skill workshops and industry masterclasses.",
          "Supportive, low-stress studio atmosphere.",
          "Paid time off and health coverage."
        ],
        deadline: "Open until filled",
        status: "Active",
        order: 2
      }
    ];

    await Job.insertMany(defaultJobs);
    console.log(`Default career vacancies seeded: ${defaultJobs.length}`);
  }
}

async function seedDatabase() {
  const mongoUri = env.MONGODB_URI || "mongodb://127.0.0.1:27017/the_editing_table";
  console.log("Initializing required database records.");
  console.log(`Connecting to MongoDB: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await upsertAdmin();
    await upsertSettings();
    await upsertCareers();

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

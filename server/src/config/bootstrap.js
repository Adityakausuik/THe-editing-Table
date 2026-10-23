import User from "../models/User.model.js";
import SiteSetting from "../models/SiteSetting.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";
import { resolveUploadsDirectory } from "../utils/fileUtils.js";
import { syncLocalUploadsToGridFS } from "../utils/gridfs.js";
import { env } from "./env.js";

let hasBootstrapped = false;

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
    value: "The Editing Table | High-End Post-Production",
    group: "seo",
    description: "Default SEO title"
  },
  {
    key: "metaDescription",
    value: "Bespoke color grading, photo retouching, and film editing for wedding filmmakers and commercial creators worldwide.",
    group: "seo",
    description: "Default SEO description"
  },
  {
    key: "publicContent",
    value: {
      footer: {
        instagram: "https://www.instagram.com/the.editingtable?stkn=MWdrdHZlY21tMmYzcw==",
        linkedin: "https://www.linkedin.com/company/the-editing-table/"
      }
    },
    group: "footer",
    description: "Default public website content and social links"
  }
];

export async function bootstrapDatabase() {
  if (hasBootstrapped) return;
  hasBootstrapped = true;

  try {
    const adminEmail = (env.ADMIN_EMAIL || "").trim().toLowerCase();
    const targetPassword = env.ADMIN_PASSWORD;
    if (!adminEmail || !targetPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured before bootstrap can create an administrator.");
    }
    const passwordHash = await User.hashPassword(targetPassword);

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: "Administrator",
        email: adminEmail,
        passwordHash,
        role: "superadmin",
        isActive: true,
        failedPasswordAttempts: 0,
        accountLockUntil: undefined,
        twoFactor: { enabled: false, required: false }
      });
      console.log(`[BOOTSTRAP] Administrator created: ${adminEmail}`);
    }

    // Seed policy defaults only for a new database. Existing production policy is source data.
    await SecurityPolicy.updateOne(
      { key: "global" },
      {
        $setOnInsert: {
          requireAdmin2FA: true,
          requireUser2FA: false
        }
      },
      { upsert: true }
    );

    // Ensure baseline settings exist
    for (const setting of defaultSettings) {
      await SiteSetting.updateOne(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true }
      );
    }

    // Sync any local asset files into GridFS (non-blocking)
    syncLocalUploadsToGridFS(resolveUploadsDirectory()).catch((err) => {
      console.warn(`[BOOTSTRAP] GridFS initial sync note: ${err.message}`);
    });
  } catch (error) {
    console.error(`[BOOTSTRAP] Database bootstrap notice: ${error.message}`);
    hasBootstrapped = false; // Allow retry on next request if DB wasn't ready
  }
}

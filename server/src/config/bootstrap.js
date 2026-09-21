import User from "../models/User.model.js";
import SiteSetting from "../models/SiteSetting.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";
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
    const adminEmail = (env.ADMIN_EMAIL || "admin@theeditingtable.com").trim().toLowerCase();
    const targetPassword = env.ADMIN_PASSWORD || "AdminPassword123!";
    const passwordHash = await User.hashPassword(targetPassword);

    let user = await User.findOne({ email: adminEmail });

    if (!user) {
      user = await User.create({
        name: "Administrator",
        email: adminEmail,
        passwordHash,
        role: "superadmin",
        isActive: true,
        twoFactor: { enabled: false, required: false }
      });
      console.log(`[BOOTSTRAP] Default Super Admin account created: ${adminEmail}`);
    } else {
      user.passwordHash = passwordHash;
      user.isActive = true;
      user.failedPasswordAttempts = 0;
      user.accountLockUntil = undefined;
      user.twoFactor = {
        enabled: false,
        required: false,
        method: "",
        secretEncrypted: "",
        pendingSecretEncrypted: "",
        recoveryCodeHashes: []
      };
      user.forceSecuritySetup = false;
      await user.save();
      console.log(`[BOOTSTRAP] Super Admin account synced and unlocked: ${adminEmail}`);
    }

    // Ensure 2FA is globally disabled in security policy
    await SecurityPolicy.updateOne(
      { key: "global" },
      {
        $set: {
          requireAdmin2FA: false,
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
  } catch (error) {
    console.error(`[BOOTSTRAP] Database bootstrap notice: ${error.message}`);
    hasBootstrapped = false; // Allow retry on next request if DB wasn't ready
  }
}

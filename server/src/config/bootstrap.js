import User from "../models/User.model.js";
import SiteSetting from "../models/SiteSetting.model.js";
import SecurityPolicy from "../models/SecurityPolicy.model.js";
import { env } from "./env.js";
import { isPostgresSelected } from "./databaseMode.js";

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

export async function bootstrapPostgresDatabase() {
  try {
    const { getPostgresPool, ensurePostgresSchema } = await import("../db/postgres.js");
    await ensurePostgresSchema();
    const pool = getPostgresPool();

    const adminEmail = (env.ADMIN_EMAIL || "admin@theeditingtable.com").trim().toLowerCase();
    const targetPassword = env.ADMIN_PASSWORD || "Admin@EditingTable2026";
    const passwordHash = await User.hashPassword(targetPassword);

    const existing = await pool.query('SELECT "_id" FROM "users" WHERE email = $1', [adminEmail]);
    if (!existing.rows.length) {
      await pool.query(
        `INSERT INTO "users" (name, email, password_hash, role, is_active, force_security_setup, two_factor__enabled, two_factor__required)
         VALUES ($1, $2, $3, 'superadmin', true, false, false, false)
         ON CONFLICT (email) DO NOTHING`,
        ["Master Director", adminEmail, passwordHash]
      );
      console.log(`[BOOTSTRAP-PG] Administrator created: ${adminEmail}`);
    }

    await pool.query(
      `INSERT INTO "securitypolicies" (key, require_admin2_fa, require_user2_fa)
       VALUES ('global', false, false)
       ON CONFLICT (key) DO UPDATE SET require_admin2_fa = false, require_user2_fa = false`
    );
    await pool.query(
      `UPDATE "users" SET two_factor__enabled = false, two_factor__required = false, force_security_setup = false WHERE email = $1`,
      [adminEmail]
    );

    for (const setting of defaultSettings) {
      await pool.query(
        `INSERT INTO "sitesettings" (key, value, "group", description)
         VALUES ($1, $2::jsonb, $3, $4)
         ON CONFLICT (key) DO NOTHING`,
        [setting.key, JSON.stringify(setting.value), setting.group, setting.description]
      );
    }
    console.log("[BOOTSTRAP-PG] PostgreSQL baseline bootstrap complete.");
  } catch (error) {
    console.error(`[BOOTSTRAP-PG] Database bootstrap notice: ${error.message}`);
  }
}

export async function bootstrapDatabase() {
  if (hasBootstrapped) return;
  hasBootstrapped = true;

  if (isPostgresSelected()) {
    return bootstrapPostgresDatabase();
  }

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

  } catch (error) {
    console.error(`[BOOTSTRAP] Database bootstrap notice: ${error.message}`);
    hasBootstrapped = false; // Allow retry on next request if DB wasn't ready
  }
}

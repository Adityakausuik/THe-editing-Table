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
  },
  {
    key: "globalReach",
    value: {
      enabled: true,
      heading: "TRUSTED BY PREMIERE PRODUCTION HOUSES & CREATIVE AGENCIES",
      description: "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
      speed: 35,
      direction: "left",
      pauseOnHover: true,
      countries: [
        { id: "US", code: "US", name: "United States", flag: "🇺🇸", active: true, order: 1 },
        { id: "GB", code: "GB", name: "United Kingdom", flag: "🇬🇧", active: true, order: 2 },
        { id: "FR", code: "FR", name: "France", flag: "🇫🇷", active: true, order: 3 },
        { id: "IT", code: "IT", name: "Italy", flag: "🇮🇹", active: true, order: 4 },
        { id: "AE", code: "AE", name: "UAE", flag: "🇦🇪", active: true, order: 5 },
        { id: "CH", code: "CH", name: "Switzerland", flag: "🇨🇭", active: true, order: 6 },
        { id: "JP", code: "JP", name: "Japan", flag: "🇯🇵", active: true, order: 7 },
        { id: "AU", code: "AU", name: "Australia", flag: "🇦🇺", active: true, order: 8 },
        { id: "IN", code: "IN", name: "India", flag: "🇮🇳", active: true, order: 9 },
        { id: "MC", code: "MC", name: "Monaco", flag: "🇲🇨", active: true, order: 10 }
      ]
    },
    group: "general",
    description: "Global Reach Country Marquee configuration and international presence settings"
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
  return bootstrapPostgresDatabase();
}


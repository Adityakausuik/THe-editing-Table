import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not configured.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function run() {
  console.log("Starting cleanup of obsolete modules (partners, weddinggalleryitems, photoshowcaseitems, photoshowcasesettings)...");

  const tablesToCleanup = [
    "photoshowcasesettings",
    "photoshowcaseitems",
    "weddinggalleryitems",
    "partners"
  ];

  const backupDir = path.resolve(__dirname, "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (const table of tablesToCleanup) {
    try {
      const checkRes = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = current_schema() 
          AND table_name = $1
        );`,
        [table]
      );

      const exists = checkRes.rows[0]?.exists;
      if (exists) {
        console.log(`Table "${table}" found. Exporting backup...`);
        const rowsRes = await pool.query(`SELECT * FROM "${table}";`);
        const backupPath = path.join(backupDir, `${table}_backup_${timestamp}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(rowsRes.rows, null, 2), "utf8");
        console.log(`Backed up ${rowsRes.rows.length} rows from "${table}" to ${backupPath}`);

        console.log(`Dropping table "${table}" with CASCADE...`);
        await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`Dropped table "${table}".`);
      } else {
        console.log(`Table "${table}" does not exist in database. Skipping drop.`);
      }
    } catch (err) {
      console.error(`Error processing table "${table}":`, err.message);
    }
  }

  // Verify
  const verifyRes = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name;`
  );
  console.log("Current active tables:", verifyRes.rows.map(r => r.table_name));

  await pool.end();
  console.log("Database cleanup completed successfully.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

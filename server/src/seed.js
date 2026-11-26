import { bootstrapPostgresDatabase } from "./config/bootstrap.js";
import { closePostgresPool } from "./db/postgres.js";

async function seedDatabase() {
  console.log("Initializing PostgreSQL database baseline records...");
  try {
    await bootstrapPostgresDatabase();
    console.log("PostgreSQL database baseline seeding complete.");
  } catch (error) {
    console.error("Database seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await closePostgresPool().catch(() => {});
  }
}

seedDatabase();

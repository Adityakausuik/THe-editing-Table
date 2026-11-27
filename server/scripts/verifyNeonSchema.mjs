import { getPostgresPool, inspectPostgresSchema, closePostgresPool, REQUIRED_POSTGRES_TABLES } from "../src/db/postgres.js";

async function verifyNeonSchema() {
  console.log("==================================================================");
  console.log("NEON POSTGRESQL CONNECTION & SCHEMA INTEGRITY VERIFICATION");
  console.log("==================================================================");

  const pool = getPostgresPool();
  const startTime = Date.now();

  try {
    const connRes = await pool.query("SELECT current_database() as db, current_user as user, version(), now() as server_time");
    const latency = Date.now() - startTime;
    console.log(`[1] CONNECTION SUCCESS: Connected in ${latency}ms`);
    console.log("    Database:", connRes.rows[0].db);
    console.log("    User:", connRes.rows[0].user);
    console.log("    PostgreSQL Version:", connRes.rows[0].version);
    console.log("    Server Time:", connRes.rows[0].server_time);

    // Schema inspection
    const schema = await inspectPostgresSchema();
    console.log(`\n[2] SCHEMA STATUS: ${schema.status.toUpperCase()}`);
    console.log(`    Total Required Tables: ${REQUIRED_POSTGRES_TABLES.length}`);
    console.log(`    Missing Tables: ${schema.missingTables.length === 0 ? "NONE (All present)" : schema.missingTables.join(", ")}`);

    // Verify each table row count and presence
    const tableChecks = [];
    for (const table of REQUIRED_POSTGRES_TABLES) {
      try {
        const countRes = await pool.query(`SELECT count(*)::int as count FROM "${table}"`);
        tableChecks.push({ table, status: "PRESENT", rows: countRes.rows[0].count });
      } catch (err) {
        tableChecks.push({ table, status: "ERROR: " + err.message, rows: 0 });
      }
    }
    console.log("\n[3] TABLE INVENTORY:");
    console.table(tableChecks);

    // Check indexes
    const idxRes = await pool.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = current_schema()
      ORDER BY tablename, indexname
    `);
    console.log(`\n[4] TOTAL INDEXES FOUND: ${idxRes.rows.length}`);

    // Check schema migrations
    const migRes = await pool.query(`SELECT version, applied_at FROM schema_migrations ORDER BY applied_at ASC`);
    console.log("\n[5] APPLIED MIGRATIONS:");
    console.table(migRes.rows);

    // Check admin user in users table
    const adminRes = await pool.query(`SELECT _id, name, email, role, is_active, two_factor__enabled FROM users WHERE email = 'admin@theeditingtable.com'`);
    console.log("\n[6] ADMIN USER RECORD:");
    console.table(adminRes.rows);

  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await closePostgresPool();
  }
}

verifyNeonSchema();

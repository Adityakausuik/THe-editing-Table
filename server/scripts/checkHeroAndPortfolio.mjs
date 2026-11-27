import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";

async function inspectColumns() {
  const pool = getPostgresPool();
  try {
    const bgCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'herobackgroundvideos'
    `);
    console.log("=== herobackgroundvideos columns ===");
    console.log(bgCols.rows.map(r => r.column_name));

    const pCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'portfolioitems'
    `);
    console.log("\n=== portfolioitems columns ===");
    console.log(pCols.rows.map(r => r.column_name));

    const sCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'heroslides'
    `);
    console.log("\n=== heroslides columns ===");
    console.log(sCols.rows.map(r => r.column_name));

    const bgData = await pool.query(`SELECT * FROM "herobackgroundvideos"`);
    console.log("\n=== herobackgroundvideos data ===");
    console.log(JSON.stringify(bgData.rows, null, 2));

    const portData = await pool.query(`SELECT * FROM "portfolioitems"`);
    console.log("\n=== portfolioitems data ===");
    console.log(JSON.stringify(portData.rows, null, 2));

  } catch (err) {
    console.error("Inspect error:", err);
  } finally {
    await closePostgresPool();
  }
}

inspectColumns();

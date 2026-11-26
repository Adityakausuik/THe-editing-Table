import { getPostgresPool, closePostgresPool } from "../src/db/postgres.js";

async function run() {
  const pool = getPostgresPool();
  try {
    const tables = [
      "portfolioitems", "services", "teammembers", "brandcollaborations", 
      "blogposts", "reviews", "jobs", "jobapplications", "enquiries", 
      "heroslides", "users", "media", "contactemails", "contactphones", 
      "contactoffices", "workinghours"
    ];
    for (const t of tables) {
      const res = await pool.query(`SELECT "_id" FROM "${t}" LIMIT 5`);
      console.log(t, res.rows.map(r => ({ id: r._id, len: String(r._id).length })));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await closePostgresPool();
  }
}

run();

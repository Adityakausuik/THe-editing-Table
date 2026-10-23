import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "../config/env.js";

let pool;
let database;

function requireDatabaseUrl() {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) {
    const error = new Error("DATABASE_URL is not configured.");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }
  return connectionString;
}

/** Lazily create one pooled Neon connection per warm serverless instance. */
export function getPostgresPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000
    });
    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error.message);
    });
  }
  return pool;
}

/** Shared Drizzle facade for request-scoped, parameterized SQL operations. */
export function getPostgresDatabase() {
  if (!database) database = drizzle(getPostgresPool());
  return database;
}

export async function checkPostgresConnection() {
  const result = await getPostgresPool().query("SELECT 1 AS connected");
  return result.rows[0]?.connected === 1;
}

export async function closePostgresPool() {
  if (!pool) return;
  const closingPool = pool;
  pool = undefined;
  database = undefined;
  await closingPool.end();
}

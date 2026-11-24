import { env } from "./env.js";

export function isPostgresSelected(config = env) {
  if (config.DATABASE_URL) return true;
  if (config.VERCEL_ENV === "preview") return true;
  return config.DATABASE_BACKEND === "postgres";
}

export function isPostgresAuthEnabled(config = env) {
  if (!isPostgresSelected(config)) return false;
  return true;
}

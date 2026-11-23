import { env } from "./env.js";

export function isPostgresSelected(config = env) {
  if (config.VERCEL_ENV === "preview") return true;
  return config.DATABASE_BACKEND === "postgres";
}

export function isPostgresAuthEnabled(config = env) {
  if (!isPostgresSelected(config)) return false;
  return config.VERCEL_ENV === "preview"
    ? Boolean(config.PREVIEW_POSTGRES_AUTH_ENABLED)
    : Boolean(config.POSTGRES_AUTH_ENABLED);
}

import { env } from "./env.js";

export function isPostgresSelected(_config = env) {
  return true;
}

export function isPostgresAuthEnabled(config = env) {
  if (process.env.POSTGRES_AUTH_ENABLED === "false" || config.POSTGRES_AUTH_ENABLED === false) return false;
  return true;
}

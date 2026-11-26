import { randomBytes } from "node:crypto";

const LEGACY_HEX_24 = /^[a-f\d]{24}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_32 = /^[a-f\d]{32}$/i;

/**
 * Validate the opaque 24-character IDs retained from existing records,
 * as well as standard 36-char UUIDs and 32-char hex strings in PostgreSQL.
 */
export function isValidId(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "[object Object]") {
    return false;
  }
  return LEGACY_HEX_24.test(trimmed) || UUID_PATTERN.test(trimmed) || HEX_32.test(trimmed);
}

/** Create a collision-resistant ID in the existing text ID format. */
export function createId() {
  return randomBytes(12).toString("hex");
}

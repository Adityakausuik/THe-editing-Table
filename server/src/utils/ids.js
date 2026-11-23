import { randomBytes } from "node:crypto";

const TEXT_ID_PATTERN = /^[a-f\d]{24}$/i;

/** Validate the opaque 24-character IDs retained from existing records. */
export function isValidId(value) {
  return typeof value === "string" && TEXT_ID_PATTERN.test(value);
}

/** Create a collision-resistant ID in the existing text ID format. */
export function createId() {
  return randomBytes(12).toString("hex");
}

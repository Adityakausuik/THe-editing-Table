import crypto from "node:crypto";

export function isAuthorizedCronRequest(authorizationHeader, secret) {
  if (typeof secret !== "string" || secret.length < 16) return false;
  if (typeof authorizationHeader !== "string") return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorizationHeader);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

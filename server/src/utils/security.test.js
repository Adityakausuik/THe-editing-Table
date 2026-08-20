import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptSecret,
  encryptSecret,
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCodes,
  normalizeRecoveryCode,
  verifyTotp
} from "./security.js";

test("encrypts 2FA secrets with randomized authenticated encryption", () => {
  const secret = generateTotpSecret();
  const first = encryptSecret(secret);
  const second = encryptSecret(secret);
  assert.notEqual(first, secret);
  assert.notEqual(first, second);
  assert.equal(decryptSecret(first), secret);
});

test("rejects malformed, expired, and replayed OTP values", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const now = 59_000;
  const accepted = verifyTotp(secret, "287082", { window: 0, now });
  assert.equal(accepted.valid, true);
  assert.equal(verifyTotp(secret, "287082", { window: 0, now, lastUsedCounter: accepted.counter }).valid, false);
  assert.equal(verifyTotp(secret, "12345", { now }).valid, false);
  assert.equal(verifyTotp(secret, "287082", { window: 0, now: now + 60_000 }).valid, false);
});

test("recovery codes are normalized, hashed, matched, and single-use ready", async () => {
  const codes = generateRecoveryCodes(10);
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  const hashes = await hashRecoveryCodes(codes);
  assert.equal(hashes.some((hash) => hash.includes(normalizeRecoveryCode(codes[0]))), false);
  const index = await findRecoveryCodeIndex(codes[0].toLowerCase(), hashes);
  assert.equal(index, 0);
  hashes.splice(index, 1);
  assert.equal(await findRecoveryCodeIndex(codes[0], hashes), -1);
});

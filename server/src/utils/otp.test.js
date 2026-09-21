import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { generateNumericOtp, hashOtp, maskEmail } from "./security.js";

test("generateNumericOtp generates high-entropy 6-digit codes", () => {
  const samples = new Set();
  for (let i = 0; i < 1000; i++) {
    const code = generateNumericOtp(6);
    assert.equal(code.length, 6);
    assert.match(code, /^[1-9]\d{5}$/);
    samples.add(code);
  }
  // With 1000 random 6-digit numbers, unique count should be very close to 1000 (>950)
  assert.ok(samples.size > 950, `Expected >950 unique samples, got ${samples.size}`);
});

test("hashOtp produces consistent SHA-256 output and is salt-dependent", () => {
  const code = "489210";
  const saltA = "salt_alpha";
  const saltB = "salt_beta";

  const hashA1 = hashOtp(code, saltA);
  const hashA2 = hashOtp(code, saltA);
  const hashB = hashOtp(code, saltB);

  assert.equal(hashA1, hashA2);
  assert.notEqual(hashA1, hashB);
  assert.equal(hashA1.length, 64);
  assert.equal(hashB.length, 64);
});

test("constant-time verification of OTP hashes works correctly", () => {
  const correctCode = "345678";
  const incorrectCode = "345679";
  const salt = crypto.randomBytes(16).toString("hex");

  const storedHash = hashOtp(correctCode, salt);
  const candidateHashMatch = hashOtp(correctCode, salt);
  const candidateHashFail = hashOtp(incorrectCode, salt);

  const matchBufA = Buffer.from(candidateHashMatch, "utf8");
  const storedBuf = Buffer.from(storedHash, "utf8");
  const failBuf = Buffer.from(candidateHashFail, "utf8");

  assert.ok(crypto.timingSafeEqual(matchBufA, storedBuf));
  assert.ok(!crypto.timingSafeEqual(failBuf, storedBuf));
});

test("maskEmail correctly protects email addresses across various lengths", () => {
  assert.equal(maskEmail("a@example.com"), "a@example.com");
  assert.equal(maskEmail("ab@example.com"), "a*@example.com");
  assert.equal(maskEmail("abc@example.com"), "a*c@example.com");
  assert.equal(maskEmail("admin@theeditingtable.com"), "ad**n@theeditingtable.com");
  assert.equal(maskEmail("adityakaushik@gmail.com"), "ad*****k@gmail.com");
  assert.equal(maskEmail("user.name+tag@sub.domain.co.uk"), "us*****g@sub.domain.co.uk");
});

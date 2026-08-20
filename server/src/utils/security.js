import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const encryptionKey = crypto.createHash("sha256").update(env.TWO_FACTOR_ENCRYPTION_KEY || env.JWT_SECRET).digest();

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function timingSafeEqualText(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSecret(payload) {
  const [version, iv, tag, ciphertext] = String(payload || "").split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Invalid encrypted secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(value) {
  let bits = 0;
  let current = 0;
  const bytes = [];
  for (const char of String(value).replace(/=+$/g, "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) continue;
    current = (current << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return encodeBase32(crypto.randomBytes(20));
}

function hotp(secret, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function generateTotpCode(secret, now = Date.now()) {
  return hotp(secret, Math.floor(now / 30000));
}

export function verifyTotp(secret, code, { window = 1, lastUsedCounter = -1, now = Date.now() } = {}) {
  if (!/^\d{6}$/.test(String(code || ""))) return { valid: false };
  const currentCounter = Math.floor(now / 30000);
  for (let offset = -window; offset <= window; offset += 1) {
    const counter = currentCounter + offset;
    if (counter <= lastUsedCounter) continue;
    if (timingSafeEqualText(hotp(secret, counter), code)) return { valid: true, counter };
  }
  return { valid: false };
}

export function buildTotpUri(secret, email) {
  const issuer = "The Editing Table";
  const label = `${issuer}:${email}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

export async function hashRecoveryCodes(codes) {
  return Promise.all(codes.map((code) => bcrypt.hash(normalizeRecoveryCode(code), 12)));
}

export function normalizeRecoveryCode(code) {
  return String(code || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export async function findRecoveryCodeIndex(code, hashes = []) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) return -1;
  for (let index = 0; index < hashes.length; index += 1) {
    if (await bcrypt.compare(normalized, hashes[index])) return index;
  }
  return -1;
}

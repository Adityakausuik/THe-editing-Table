import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "the-editing-table",
    audience: "admin-suite"
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "the-editing-table",
    audience: "admin-suite"
  });
}

export function signPreAuthToken(payload) {
  return jwt.sign({ ...payload, type: "preauth" }, env.JWT_SECRET, {
    expiresIn: "10m",
    issuer: "the-editing-table",
    audience: "two-factor-challenge"
  });
}

export function verifyPreAuthToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    issuer: "the-editing-table",
    audience: "two-factor-challenge"
  });
  if (payload.type !== "preauth") throw new Error("Invalid pre-authentication token");
  return payload;
}

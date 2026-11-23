import mongoose from "mongoose";
import { verifyAccessToken } from "../lib/jwt.js";
import Session from "../models/Session.model.js";
import User from "../models/User.model.js";
import { env } from "../config/env.js";
import { sha256, timingSafeEqualText } from "../utils/security.js";
import { isPostgresAuthEnabled, isPostgresSelected } from "../config/databaseMode.js";
import { findPostgresActiveAuthUser, findPostgresAuthSession, touchPostgresAuthSession } from "../db/authRepository.js";

export function csrfTokenForSession(sessionId) {
  return sha256(`${sessionId}:${env.JWT_SECRET}`);
}

export async function authenticate(req, res, next) {
  const header = req.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required", data: null });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access" || !payload.sid || payload.sid.startsWith("fallback-")) {
      throw new Error("Invalid session token");
    }
    if (!isPostgresSelected() && mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: "Authentication service is unavailable.", data: null });
    }

    let session;
    let user;
    if (isPostgresSelected()) {
      if (!isPostgresAuthEnabled()) {
        return res.status(503).json({ success: false, message: "Authentication service is unavailable.", data: null });
      }
      try {
        [session, user] = await Promise.all([
          findPostgresAuthSession(payload.sid, payload.id),
          findPostgresActiveAuthUser(payload.id)
        ]);
      } catch {
        return res.status(503).json({ success: false, message: "Authentication service is unavailable.", data: null });
      }
    } else {
      session = await Session.findOne({
        _id: payload.sid,
        user: payload.id,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      });
      user = await User.findOne({ _id: payload.id, isActive: true });
    }
    if (!session) throw new Error("Session revoked or expired");
    if (!user) throw new Error("Account unavailable");

    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const received = req.get("x-csrf-token") || "";
      const expected = csrfTokenForSession(session._id.toString());
      if (!received || !timingSafeEqualText(received, expected)) {
        return res.status(403).json({ success: false, message: "Invalid security token. Refresh and try again.", data: null });
      }
    }

    if (isPostgresSelected()) {
      touchPostgresAuthSession(session._id).catch(() => null);
    } else {
      Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).catch(() => null);
    }
    req.authSession = session;
    req.userDocument = user;
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      sessionId: session._id.toString()
    };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token", data: null });
  }
}

import { verifyAccessToken } from "../lib/jwt.js";
import { env } from "../config/env.js";
import { sha256, timingSafeEqualText } from "../utils/security.js";
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

    let session;
    let user;
    try {
      [session, user] = await Promise.all([
        findPostgresAuthSession(payload.sid, payload.id),
        findPostgresActiveAuthUser(payload.id)
      ]);
    } catch {
      return res.status(503).json({ success: false, message: "Authentication service is unavailable.", data: null });
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

    touchPostgresAuthSession(session._id).catch(() => null);
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

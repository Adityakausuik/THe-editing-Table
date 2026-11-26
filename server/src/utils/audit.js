import { getPostgresPool } from "../db/postgres.js";

/**
 * Robust User Agent parser for admin and security audit logs.
 * Extracts browser, operating system, and device type without heavy dependencies.
 */
export function parseUserAgent(ua = "") {
  const str = String(ua || "").toLowerCase();
  let browser = "Unknown Browser";
  if (str.includes("edg/")) browser = "Microsoft Edge";
  else if (str.includes("chrome/") && !str.includes("edg/")) browser = "Google Chrome";
  else if (str.includes("safari/") && !str.includes("chrome")) browser = "Apple Safari";
  else if (str.includes("firefox/")) browser = "Mozilla Firefox";
  else if (str.includes("playwright")) browser = "Playwright Test Runner";
  else if (str.includes("curl")) browser = "cURL";

  let os = "Unknown OS";
  if (str.includes("windows")) os = "Windows";
  else if (str.includes("macintosh") || str.includes("mac os")) os = "macOS";
  else if (str.includes("linux") && !str.includes("android")) os = "Linux";
  else if (str.includes("iphone") || str.includes("ipad")) os = "iOS";
  else if (str.includes("android")) os = "Android";

  let device = "Desktop";
  if (str.includes("mobile") || str.includes("iphone") || str.includes("android")) device = "Mobile";
  else if (str.includes("ipad") || str.includes("tablet")) device = "Tablet";

  return { browser, os, device };
}

/**
 * Extracts trusted client IP according to reverse-proxy and deployment headers.
 */
export function extractClientIp(req) {
  if (!req) return "127.0.0.1";
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp && !firstIp.startsWith("unknown")) return firstIp;
  }
  const realIp = req.headers?.["x-real-ip"];
  if (realIp && typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }
  const rawIp = req.ip || req.socket?.remoteAddress || "";
  if (rawIp === "::1" || rawIp === "::ffff:127.0.0.1") return "127.0.0.1";
  return rawIp.replace(/^::ffff:/, "") || "127.0.0.1";
}

export function buildPostgresSecurityAudit({ user, action, result, entity, entityId, details, ipAddress, userAgent, metadata }) {
  return {
    text: `INSERT INTO "auditlogs" ("user", "user_email", "role", "action", "entity", "entity_id", "details", "ip_address", "user_agent", "result", "metadata", "created_at", "updated_at") ` +
      `VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb, now(), now())`,
    values: [
      user?._id?.toString?.() || user?.id?.toString?.() || null,
      user?.email || "system",
      user?.role || "unknown",
      action,
      entity,
      entityId || user?._id?.toString?.() || user?.id?.toString?.() || "",
      JSON.stringify(details ?? {}),
      ipAddress || "",
      userAgent || "",
      result,
      JSON.stringify(metadata ?? {})
    ]
  };
}

export async function writeSecurityAudit({ req, user, action, result = "success", entity = "Security", entityId = "", metadata = {}, details = {} }) {
  const uaString = String(req?.get?.("user-agent") || "").slice(0, 500);
  const clientIp = extractClientIp(req);
  const parsedUa = parseUserAgent(uaString);

  const enrichedDetails = {
    ...details,
    device: details.device || parsedUa.device,
    os: details.os || parsedUa.os,
    browser: details.browser || parsedUa.browser
  };

  const query = buildPostgresSecurityAudit({
    user,
    action,
    result,
    entity,
    entityId,
    details: enrichedDetails,
    ipAddress: clientIp,
    userAgent: uaString,
    metadata
  });
  try {
    await getPostgresPool().query(query.text, query.values);
  } catch {
    // Security auditing remains best-effort
  }
}

/* global BroadcastChannel, CustomEvent, FormData, Headers, fetch, sessionStorage */

import fallbackMedia from "../assets/the-editing-table-logo.png";
import { sanitizeStudio } from "./sanitizeStudio.js";

const configuredApiRoot = import.meta.env.VITE_API_URL;

export const API_ROOT = (() => {
  const configured = typeof configuredApiRoot === "string" ? configuredApiRoot.trim() : "";

  // If running in browser and the host is a known deployment (vercel.app, theeditingtable.com) or localhost,
  // always use same-origin /api to avoid cross-domain CORS, PSL cookie drops, and stale separated backends.
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host.endsWith(".vercel.app") || host.includes("theeditingtable") || host === "localhost" || host === "127.0.0.1") {
      // If configured points to an external vercel app (like t-he-editing-table-server), localhost, or empty, always use /api
      if (!configured || configured.includes(".vercel.app") || configured.includes("localhost") || configured.includes("127.0.0.1")) {
        return "/api";
      }
    }
  }

  if (import.meta.env.PROD) {
    // In production, never allow localhost/127.0.0.1 or stale separated Vercel server deployments
    if (
      configured &&
      !configured.includes("localhost") &&
      !configured.includes("127.0.0.1") &&
      !configured.includes("t-he-editing-table-server") &&
      !configured.includes(".vercel.app")
    ) {
      return configured.replace(/\/+$/, "");
    }
    return "/api";
  }

  // In development, default to /api so Vite proxy forwards to port 5000 smoothly
  // for localhost, 127.0.0.1, and mobile/LAN IP testing
  if (
    !configured ||
    configured.includes("localhost") ||
    configured.includes("127.0.0.1") ||
    configured.includes("t-he-editing-table-server") ||
    configured.includes(".vercel.app")
  ) {
    return "/api";
  }
  return configured;
})();

export const API_ORIGIN = (() => {
  if (/^https?:\/\//i.test(API_ROOT)) {
    try {
      return new URL(API_ROOT).origin;
    } catch {
      // fallback
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
})();
const cmsChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel("editing-table-cms") : null;
export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";
export const FALLBACK_MEDIA_URL = fallbackMedia;

function notifyAuthSessionExpired(path) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
    detail: { path, at: Date.now() }
  }));
}

function cmsEventKey(rawUrl = "") {
  if (rawUrl.includes("/hero-slides")) return "hero-slides";
  if (rawUrl.includes("/partners")) return "partners";
  if (rawUrl.includes("/services")) return "services";
  if (rawUrl.includes("/portfolio")) return "portfolio";
  if (rawUrl.includes("/video-showcase")) return "video-showcase";
  if (rawUrl.includes("/photo-showcase")) return "photo-showcase";
  if (rawUrl.includes("/careers")) return "careers";
  if (rawUrl.includes("/contact")) return "contact";
  if (rawUrl.includes("/wedding-gallery")) return "weddings";
  if (rawUrl.includes("/collaborations")) return "collaborations";
  if (rawUrl.includes("/blog")) return "blogs";
  if (rawUrl.includes("/about-me")) return "about-me";
  if (rawUrl.includes("/team")) return "team";
  if (rawUrl.includes("/settings")) return "settings";
  if (rawUrl.includes("/reviews")) return "reviews";
  return "";
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // If API_ROOT ends with /api (e.g. "/api" or "https://domain.com/api")
  if (API_ROOT.endsWith("/api")) {
    // If path also starts with /api/, strip one /api to prevent /api/api/
    if (normalizedPath.startsWith("/api/")) {
      normalizedPath = normalizedPath.slice(4);
    }
    return `${API_ROOT}${normalizedPath}`;
  }

  // If API_ROOT does not end with /api (e.g. "https://domain.com")
  if (!normalizedPath.startsWith("/api/") && normalizedPath !== "/api" && !normalizedPath.startsWith("/uploads")) {
    normalizedPath = `/api${normalizedPath}`;
  }
  return `${API_ROOT}${normalizedPath}`;
}

export function mediaUrl(src) {
  if (!src) return FALLBACK_MEDIA_URL;
  const normalizedSrc = String(src).replace(/\\/g, "/");
  if (normalizedSrc.startsWith("data:") || normalizedSrc.startsWith("blob:") || normalizedSrc.startsWith("/assets/") || normalizedSrc.startsWith("/src/")) return normalizedSrc;
  if (/^https?:\/\//i.test(normalizedSrc)) {
    try {
      const parsed = new URL(normalizedSrc);
      if (parsed.pathname.startsWith("/api/uploads/")) {
        return `${parsed.origin}${parsed.pathname.slice(4)}${parsed.search}`;
      }
      return normalizedSrc;
    } catch {
      return FALLBACK_MEDIA_URL;
    }
  }
  const cleaned = normalizedSrc.startsWith("/api/uploads/") ? normalizedSrc.slice(4) : normalizedSrc;
  const path = cleaned.startsWith("/uploads/") ? cleaned : `/uploads/${cleaned.replace(/^\/+/, "")}`;
  return `${API_ORIGIN}${path}`;
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = String(options.method || "GET").toUpperCase();
  const csrfToken = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("csrfToken") : null;
  const authToken = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("accessToken") : null;

  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const url = apiUrl(path);
  let response;
  try {
    response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...options,
      headers
    });
  } catch (netErr) {
    const isNetworkError =
      netErr instanceof TypeError ||
      netErr.name === "TypeError" ||
      /failed to fetch/i.test(netErr.message) ||
      /network\s?error/i.test(netErr.message);

    const err = new Error(
      isNetworkError
        ? `Unable to connect to the backend server (${netErr.message}). Please verify the server is running and accessible at ${url}.`
        : (netErr.message || "Network request failed")
    );
    err.isNetworkError = isNetworkError;
    err.originalError = netErr;
    throw err;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok || !payload || payload?.success === false) {
    if (response.status === 401) notifyAuthSessionExpired(path);
    let errMsg = payload?.message;
    if (!errMsg) {
      if (!isJson) {
        errMsg = `API endpoint returned non-JSON (${contentType || "text/html"}). The backend API is not accessible at ${url}.`;
      } else {
        errMsg = `API request failed with status ${response.status}`;
      }
    }
    const error = new Error(errMsg);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const result = sanitizeStudio(payload);
  if (method !== "GET" && method !== "HEAD") {
    const key = cmsEventKey(path);
    if (key) notifyCmsChanged(key);
  }
  return result;
}

export async function getCmsData(path) {
  try {
    const payload = await apiFetch(path);
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}

export async function apiFetchBlob(path) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store"
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 401) notifyAuthSessionExpired(path);
    const error = new Error(payload?.message || `Download failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return response.blob();
}

export function notifyCmsChanged(key) {
  const detail = { key, at: Date.now() };
  window.dispatchEvent(new CustomEvent("cms:changed", { detail }));
  cmsChannel?.postMessage(detail);
}

export function subscribeToCmsChanges(listener) {
  const handleWindow = (event) => listener(event.detail);
  const handleBroadcast = (event) => listener(event.data);
  window.addEventListener("cms:changed", handleWindow);
  cmsChannel?.addEventListener("message", handleBroadcast);
  return () => {
    window.removeEventListener("cms:changed", handleWindow);
    cmsChannel?.removeEventListener("message", handleBroadcast);
  };
}

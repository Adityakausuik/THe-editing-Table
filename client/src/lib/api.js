/* global BroadcastChannel, CustomEvent, FormData, Headers, fetch, sessionStorage */

import fallbackMedia from "../assets/the-editing-table-logo.png";

const configuredApiRoot = import.meta.env.VITE_API_URL;
if (import.meta.env.PROD && !configuredApiRoot) {
  throw new Error("VITE_API_URL must be configured for production builds.");
}
export const API_ROOT = (configuredApiRoot || "http://127.0.0.1:5000/api").replace(/\/$/, "");
const API_ORIGIN = new URL(API_ROOT).origin;
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
  if (rawUrl.includes("/wedding-gallery")) return "weddings";
  if (rawUrl.includes("/collaborations")) return "collaborations";
  if (rawUrl.includes("/blog")) return "blogs";
  if (rawUrl.includes("/team")) return "team";
  if (rawUrl.includes("/settings")) return "settings";
  if (rawUrl.includes("/reviews")) return "reviews";
  return "";
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_ROOT.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${API_ROOT}${normalizedPath.slice(4)}`;
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
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    if (response.status === 401) notifyAuthSessionExpired(path);
    const error = new Error(payload?.message || `API request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const result = payload || { success: true, message: "Operation completed successfully", data: null };
  if (method !== "GET" && method !== "HEAD") {
    const key = cmsEventKey(path);
    if (key) notifyCmsChanged(key);
  }
  return result;
}

export async function getCmsData(path) {
  const payload = await apiFetch(path);
  return Array.isArray(payload.data) ? payload.data : [];
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

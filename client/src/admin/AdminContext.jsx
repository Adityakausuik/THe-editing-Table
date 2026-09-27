/* global AbortController, clearTimeout, sessionStorage */
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, AUTH_SESSION_EXPIRED_EVENT } from "../lib/api.js";

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState({});

  useEffect(() => {
    let active = true;

    const expireSession = () => {
      if (!active) return;
      sessionStorage.removeItem("csrfToken");
      sessionStorage.removeItem("accessToken");
      setUser(null);
      setAuthLoading(false);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);

    apiFetch("/api/v1/auth/me")
      .then((response) => {
        if (active) {
          if (response.data?.csrfToken) sessionStorage.setItem("csrfToken", response.data.csrfToken);
          if (response.data?.token) sessionStorage.setItem("accessToken", response.data.token);
          setUser(response.data || null);
        }
      })
      .catch(() => {
        if (active) {
          sessionStorage.removeItem("csrfToken");
          sessionStorage.removeItem("accessToken");
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
    };
  }, []);

  const loginUser = (userData, csrfToken, token) => {
    if (csrfToken) sessionStorage.setItem("csrfToken", csrfToken);
    if (token) sessionStorage.setItem("accessToken", token);
    setUser(userData);
    setAuthLoading(false);
  };

  const logoutUser = async () => {
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
      try {
        await apiFetch("/api/v1/auth/logout", {
          method: "POST",
          signal: controller?.signal
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch {
      // Non-blocking: ensure client state is cleared even if network or server fails
    } finally {
      sessionStorage.removeItem("csrfToken");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("admin_login_stage");
      setUser(null);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        user,
        authLoading,
        siteSettings,
        setSiteSettings,
        loginUser,
        logoutUser,
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
}

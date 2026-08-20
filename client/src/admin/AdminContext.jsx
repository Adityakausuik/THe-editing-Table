/* global sessionStorage */
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
      setUser(null);
      setAuthLoading(false);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);

    apiFetch("/api/v1/auth/me")
      .then((response) => {
        if (active) {
          if (response.data?.csrfToken) sessionStorage.setItem("csrfToken", response.data.csrfToken);
          setUser(response.data || null);
        }
      })
      .catch(() => {
        if (active) {
          sessionStorage.removeItem("csrfToken");
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

  const loginUser = (userData, csrfToken) => {
    if (csrfToken) sessionStorage.setItem("csrfToken", csrfToken);
    setUser(userData);
    setAuthLoading(false);
  };

  const logoutUser = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem("csrfToken");
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

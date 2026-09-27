import { useCallback, useEffect, useState } from "react";
import { apiFetch, subscribeToCmsChanges } from "./api.js";

const CLIENT_DEFAULT_SETTINGS = {
  siteName: "THE EDITING TABLE",
  metaTitle: "The Editing Table | High-End Film & Video Post-Production",
  metaDescription: "Bespoke color grading, video editing, and visual post-production for commercials, weddings, and cinema.",
  maintenanceMode: false,
  publicContent: {
    hero: {
      tagline: "WE CRAFT VISUAL STORIES",
      subtitle: "Bespoke color grading, video editing, and visual post-production for luxury weddings, brands, and cinema."
    },
    footer: {
      instagram: "https://www.instagram.com/the.editingtable?stkn=MWdrdHZlY21tMmYzcw==",
      linkedin: "https://www.linkedin.com/company/the-editing-table/",
      email: "hello@theeditingtable.com",
      address: "Mumbai & New Delhi, India"
    }
  }
};

let settingsCache = CLIENT_DEFAULT_SETTINGS;
let settingsRequest = null;

async function fetchSettings(force = false) {
  if (settingsRequest) return settingsRequest;
  if (!force && settingsCache && settingsCache !== CLIENT_DEFAULT_SETTINGS) return settingsCache;

  settingsRequest = apiFetch("/api/v1/cms/settings")
    .then((response) => {
      settingsCache = { ...CLIENT_DEFAULT_SETTINGS, ...(response.data || {}) };
      return settingsCache;
    })
    .catch(() => {
      return settingsCache || CLIENT_DEFAULT_SETTINGS;
    })
    .finally(() => {
      settingsRequest = null;
    });

  return settingsRequest;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(settingsCache || CLIENT_DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (force = false) => {
    setError("");
    try {
      setSettings(await fetchSettings(force));
    } catch (requestError) {
      setSettings((current) => current || CLIENT_DEFAULT_SETTINGS);
      setError(requestError.message || "Website settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);

    const refreshVisibleSettings = () => {
      if (document.visibilityState === "visible") load(true);
    };

    window.addEventListener("focus", refreshVisibleSettings);
    document.addEventListener("visibilitychange", refreshVisibleSettings);

    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (detail?.key === "settings") {
        settingsCache = null;
        load(true);
      }
    });

    return () => {
      window.removeEventListener("focus", refreshVisibleSettings);
      document.removeEventListener("visibilitychange", refreshVisibleSettings);
      unsubscribe();
    };
  }, [load]);

  return { settings, loading, error, reload: () => load(true) };
}

import { useCallback, useEffect, useState } from "react";
import { apiFetch, subscribeToCmsChanges } from "./api.js";

let settingsCache = null;
let settingsRequest = null;

async function fetchSettings(force = false) {
  if (settingsRequest) return settingsRequest;
  if (!force && settingsCache) return settingsCache;

  settingsRequest = apiFetch("/api/v1/cms/settings")
    .then((response) => {
      settingsCache = response.data || {};
      return settingsCache;
    })
    .finally(() => {
      settingsRequest = null;
    });

  return settingsRequest;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(settingsCache || {});
  const [loading, setLoading] = useState(!settingsCache);
  const [error, setError] = useState("");

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      setSettings(await fetchSettings(force));
    } catch (requestError) {
      setSettings({});
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

import { useCallback, useEffect, useRef, useState } from "react";
import { getCmsData, subscribeToCmsChanges } from "./api.js";

export function useCmsCollection(path, eventKey) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const records = await getCmsData(path);
      if (currentRequest === requestId.current) setItems(records);
    } catch (err) {
      if (currentRequest === requestId.current) {
        setItems([]);
        setError(err.message || "Content could not be loaded.");
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (!eventKey || detail?.key === eventKey) load();
    });
    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      unsubscribe();
    };
  }, [eventKey, load]);

  return { items, loading, error, reload: load };
}

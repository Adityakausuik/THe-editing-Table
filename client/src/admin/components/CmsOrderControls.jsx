import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "../../lib/api.js";

export default function CmsOrderControls({
  collection,
  setCollection,
  itemId,
  endpoint,
  onError
}) {
  const [saving, setSaving] = useState(false);
  const index = collection.findIndex((item) => item._id === itemId);

  const move = async (direction) => {
    const targetIndex = index + direction;
    if (saving || index < 0 || targetIndex < 0 || targetIndex >= collection.length) return;

    const previous = collection;
    const reordered = [...collection];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const normalized = reordered.map((item, orderIndex) => ({ ...item, order: orderIndex + 1 }));

    setCollection(normalized);
    setSaving(true);
    try {
      const response = await apiFetch(`${endpoint}/reorder`, {
        method: "PUT",
        body: JSON.stringify({
          items: normalized.map((item, orderIndex) => ({
            id: item._id,
            order: orderIndex + 1
          }))
        })
      });
      setCollection(Array.isArray(response.data) ? response.data : normalized);
    } catch (error) {
      setCollection(previous);
      onError?.(error.message || "Order could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={saving || index <= 0}
        className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] disabled:opacity-30 transition cursor-pointer"
        title="Move up"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        disabled={saving || index < 0 || index >= collection.length - 1}
        className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] disabled:opacity-30 transition cursor-pointer"
        title="Move down"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </>
  );
}

/* global console */
import { CheckCircle2, RefreshCw, Save, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";

export default function SettingsCMS() {
  const [siteName, setSiteName] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [publicContentJson, setPublicContentJson] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/v1/cms/settings/admin");
      if (data?.data) {
        if (data.data.siteName) setSiteName(data.data.siteName);
        if (data.data.metaTitle) setMetaTitle(data.data.metaTitle);
        if (data.data.metaDescription) setMetaDescription(data.data.metaDescription);
        if (data.data.maintenanceMode !== undefined) setMaintenanceMode(data.data.maintenanceMode === "true" || data.data.maintenanceMode === true);
        setPublicContentJson(JSON.stringify(data.data.publicContent || {}, null, 2));
      }
    } catch (err) {
      console.error("Fetch settings error:", err);
      setError(err.message || "Website settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettingKey = async (key, value, description) => {
    await apiFetch("/api/v1/cms/settings", {
      method: "POST",
      body: JSON.stringify({ key, value, group: "general", description })
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let publicContent;
      try {
        publicContent = JSON.parse(publicContentJson);
      } catch {
        throw new Error("Public content must be valid JSON.");
      }

      await Promise.all([
        handleSaveSettingKey("siteName", siteName, "Website Brand Name"),
        handleSaveSettingKey("metaTitle", metaTitle, "Website Meta Title"),
        handleSaveSettingKey("metaDescription", metaDescription, "Website Meta Description"),
        handleSaveSettingKey("maintenanceMode", String(maintenanceMode), "Maintenance Mode Toggle"),
        handleSaveSettingKey("publicContent", publicContent, "Navigation and public page content")
      ]);
      setSavedMsg("Settings saved successfully to MongoDB!");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      console.error("Save settings failed:", err);
      setError(err.message || "Website settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">System Settings</span>
          <h1 className="font-serif text-3xl text-forest">Website Settings & SEO</h1>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading}
          className="p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
          title="Refresh Settings"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} />
        </button>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-900 shadow-soft">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-sage-border bg-sage-card p-6 sm:p-8 shadow-soft">
        {/* Maintenance Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-sage-secondary/40 border border-sage-border/60">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-forest flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-site" /> Maintenance Mode
            </h3>
            <p className="text-xs text-sage-muted">
              When enabled, public visitors see a maintenance screen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMaintenanceMode((v) => !v)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
              maintenanceMode ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {maintenanceMode ? "ACTIVE (Maintenance)" : "OFF (Live)"}
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1.5">
            Website Brand Name
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="field-luxury text-sm font-serif"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1.5">
            Meta Title (SEO)
          </label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="field-luxury text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1.5">
            Meta Description (SEO)
          </label>
          <textarea
            rows={3}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="field-luxury text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1.5">
            Public Website Content (JSON)
          </label>
          <textarea
            rows={16}
            value={publicContentJson}
            onChange={(event) => setPublicContentJson(event.target.value)}
            className="field-luxury min-h-80 resize-y text-xs font-mono leading-relaxed py-3"
            spellCheck={false}
            disabled={loading || saving}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving Settings..." : "Save Settings to DB"}
        </button>
      </form>
    </div>
  );
}

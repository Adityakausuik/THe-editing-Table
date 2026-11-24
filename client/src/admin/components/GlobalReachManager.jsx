/* global confirm */
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  GripVertical,
  MoveLeft,
  MoveRight,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sliders,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import { WORLD_COUNTRIES, getCountryByCode, getFlagEmoji } from "../data/countries.js";

export default function GlobalReachManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    enabled: true,
    heading: "TRUSTED BY PREMIERE PRODUCTION HOUSES & CREATIVE AGENCIES",
    description: "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
    speed: 35,
    direction: "left",
    pauseOnHover: true,
    countries: []
  });

  // Country Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null = new, number = edit index
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCode, setSelectedCode] = useState("US");
  const [displayName, setDisplayName] = useState("United States");
  const [isActive, setIsActive] = useState(true);

  // Fetch from API
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/cms/collaborations/global-reach");
      if (res?.data) {
        setSettings({
          enabled: res.data.enabled !== false,
          heading: res.data.heading || "TRUSTED BY PREMIERE PRODUCTION HOUSES & CREATIVE AGENCIES",
          description: res.data.description || "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
          speed: Number(res.data.speed) || 35,
          direction: res.data.direction === "right" ? "right" : "left",
          pauseOnHover: res.data.pauseOnHover !== false,
          countries: Array.isArray(res.data.countries) ? res.data.countries : []
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load global reach settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...settings,
        countries: settings.countries.map((c, idx) => ({
          ...c,
          order: idx + 1
        }))
      };

      await apiFetch("/api/v1/cms/collaborations/global-reach", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setSavedMsg("Global Reach published successfully! Changes are live on the homepage.");
      setTimeout(() => setSavedMsg(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to save global reach settings.");
    } finally {
      setSaving(false);
    }
  };

  // Open Country Modal
  const openAddModal = () => {
    setEditingIndex(null);
    setSelectedCode("US");
    setDisplayName("United States");
    setIsActive(true);
    setCountrySearch("");
    setIsModalOpen(true);
  };

  const openEditModal = (idx) => {
    const item = settings.countries[idx];
    if (!item) return;
    setEditingIndex(idx);
    setSelectedCode(item.code || "US");
    setDisplayName(item.name || item.code);
    setIsActive(item.active !== false);
    setCountrySearch("");
    setIsModalOpen(true);
  };

  const handleSelectCountry = (country) => {
    setSelectedCode(country.code);
    setDisplayName(country.name);
  };

  const handleSaveCountry = (e) => {
    e.preventDefault();
    if (!selectedCode || !displayName.trim()) return;

    const flag = getFlagEmoji(selectedCode);
    const newCountry = {
      id: selectedCode,
      code: selectedCode,
      name: displayName.trim(),
      flag,
      active: isActive,
      order: editingIndex !== null ? settings.countries[editingIndex].order : settings.countries.length + 1
    };

    if (editingIndex !== null) {
      // Edit existing
      const updated = [...settings.countries];
      updated[editingIndex] = newCountry;
      setSettings({ ...settings, countries: updated });
    } else {
      // Check duplicate
      const exists = settings.countries.some((c) => c.code === selectedCode);
      if (exists) {
        if (!confirm(`Country with code "${selectedCode}" already exists. Add anyway?`)) {
          return;
        }
      }
      setSettings({ ...settings, countries: [...settings.countries, newCountry] });
    }

    setIsModalOpen(false);
  };

  // Delete Country
  const handleDeleteCountry = (idx) => {
    const country = settings.countries[idx];
    if (confirm(`Remove "${country?.name || country?.code}" from the Global Reach ticker?`)) {
      const updated = settings.countries.filter((_, i) => i !== idx);
      setSettings({ ...settings, countries: updated });
    }
  };

  // Toggle Country Active Status
  const handleToggleActive = (idx) => {
    const updated = [...settings.countries];
    updated[idx] = { ...updated[idx], active: !updated[idx].active };
    setSettings({ ...settings, countries: updated });
  };

  // Reorder Up
  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const updated = [...settings.countries];
    const temp = updated[idx - 1];
    updated[idx - 1] = updated[idx];
    updated[idx] = temp;
    setSettings({ ...settings, countries: updated });
  };

  // Reorder Down
  const handleMoveDown = (idx) => {
    if (idx === settings.countries.length - 1) return;
    const updated = [...settings.countries];
    const temp = updated[idx + 1];
    updated[idx + 1] = updated[idx];
    updated[idx] = temp;
    setSettings({ ...settings, countries: updated });
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...settings.countries];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setSettings({ ...settings, countries: updated });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Filter countries for searchable picker
  const filteredCountries = WORLD_COUNTRIES.filter((c) => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return true;
    return c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sage-muted">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading Global Reach configurations...
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {savedMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{savedMsg}</span>
        </div>
      )}

      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-sage-border/80 bg-sage-card/90 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sage-border bg-sage-secondary/80 text-site">
            <Globe2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-forest font-semibold">
              Global Reach Country Marquee
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Manage international country flags, names, speed, direction and section visibility.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchSettings}
            className="p-2.5 rounded-full border border-sage-border text-sage-muted hover:text-forest hover:bg-sage-secondary transition cursor-pointer"
            title="Refresh from database"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save & Publish Changes"}
          </button>
        </div>
      </div>

      {/* Section Settings Card */}
      <div className="p-6 rounded-3xl border border-sage-border/80 bg-sage-card/80 space-y-6">
        <div className="flex items-center justify-between border-b border-sage-border/60 pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-forest uppercase tracking-wider">
            <Sliders className="h-4 w-4 text-site" />
            Section Visibility &amp; Display Controls
          </div>

          {/* Visibility Switch */}
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-sage-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[rgb(72,125,72)]"></div>
            <span className="ml-3 text-xs font-medium text-charcoal-700">
              {settings.enabled ? "Section Visible" : "Section Hidden"}
            </span>
          </label>
        </div>

        {/* Heading & Description */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-sage-muted mb-1.5 uppercase tracking-wider">
              Section Heading
            </label>
            <input
              type="text"
              value={settings.heading}
              onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
              className="field-luxury text-sm font-serif"
              placeholder="e.g. TRUSTED BY PREMIERE PRODUCTION HOUSES & CREATIVE AGENCIES"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sage-muted mb-1.5 uppercase tracking-wider">
              Supporting Description
            </label>
            <textarea
              rows={2}
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="field-luxury text-xs"
              placeholder="Collaborating with creative teams, production houses..."
            />
          </div>
        </div>

        {/* Marquee Motion Controls */}
        <div className="grid gap-5 sm:grid-cols-3 pt-2">
          {/* Speed Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-sage-muted uppercase tracking-wider">
              <span>Scrolling Speed</span>
              <span className="text-site font-mono font-bold">{settings.speed}s per cycle</span>
            </div>
            <input
              type="range"
              min="15"
              max="75"
              step="5"
              value={settings.speed}
              onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })}
              className="w-full accent-[rgb(72,125,72)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-sage-muted font-medium">
              <span>Fast (15s)</span>
              <span>Balanced (35s)</span>
              <span>Relaxed (75s)</span>
            </div>
          </div>

          {/* Direction Toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-sage-muted uppercase tracking-wider">
              Scrolling Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, direction: "left" })}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  settings.direction === "left"
                    ? "border-[rgb(72,125,72)] bg-[rgb(72,125,72)] text-white shadow-xs"
                    : "border-sage-border bg-sage-card text-charcoal-700 hover:border-site/50"
                }`}
              >
                <MoveLeft className="h-3.5 w-3.5" />
                Right to Left
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, direction: "right" })}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  settings.direction === "right"
                    ? "border-[rgb(72,125,72)] bg-[rgb(72,125,72)] text-white shadow-xs"
                    : "border-sage-border bg-sage-card text-charcoal-700 hover:border-site/50"
                }`}
              >
                <MoveRight className="h-3.5 w-3.5" />
                Left to Right
              </button>
            </div>
          </div>

          {/* Pause on Hover */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-sage-muted uppercase tracking-wider">
              Hover Interaction
            </label>
            <label className="flex items-center gap-2 p-2 rounded-xl border border-sage-border bg-sage-card/60 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pauseOnHover}
                onChange={(e) => setSettings({ ...settings, pauseOnHover: e.target.checked })}
                className="h-4 w-4 rounded accent-[rgb(72,125,72)] cursor-pointer"
              />
              <span className="text-xs text-charcoal-700">Pause marquee on mouse hover</span>
            </label>
          </div>
        </div>

        {/* Live Admin Preview Ticker */}
        <div className="pt-2">
          <div className="text-[11px] font-semibold text-sage-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Motion Preview
          </div>
          <div className="relative w-full overflow-hidden rounded-2xl border border-sage-border/80 bg-sage-secondary/40 py-4 px-2">
            <div
              className={`flex w-max items-center gap-6 ${
                settings.pauseOnHover ? "hover:[animation-play-state:paused]" : ""
              }`}
              style={{
                animation: `${
                  settings.direction === "right" ? "marquee-scroll-right" : "marquee-scroll-left"
                } ${settings.speed}s linear infinite`
              }}
            >
              {[...settings.countries, ...settings.countries].filter((c) => c.active !== false).map((c, i) => (
                <div key={`preview-${c.code}-${i}`} className="flex items-center gap-2 shrink-0">
                  <span className="text-base">{c.flag || "🌐"}</span>
                  <span className="text-xs font-semibold text-forest">{c.name}</span>
                  <span className="text-[10px] text-site/60 ml-2">✦</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Country List & Management */}
      <div className="p-6 rounded-3xl border border-sage-border/80 bg-sage-card/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage-border/60 pb-4">
          <div>
            <h3 className="font-serif text-lg text-forest font-semibold">
              Configured Countries ({settings.countries.length})
            </h3>
            <p className="text-xs text-charcoal-500">
              Drag cards or use arrows to reorder. Toggle eye icon to enable or disable countries on the live site.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgb(72,125,72)] text-[rgb(72,125,72)] text-xs font-semibold hover:bg-[rgb(72,125,72)] hover:text-white transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Country
          </button>
        </div>

        {/* Countries Grid / List */}
        {settings.countries.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-sage-border rounded-2xl text-sage-muted text-xs">
            No countries configured yet. Click &quot;Add Country&quot; to begin building your international marquee.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {settings.countries.map((country, idx) => {
              const code = (country.code || "").toLowerCase();
              return (
                <div
                  key={`country-item-${country.code}-${idx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-move select-none ${
                    country.active !== false
                      ? "border-sage-border/80 bg-sage-card hover:border-site/50 hover:shadow-soft"
                      : "border-dashed border-sage-border/50 bg-sage-secondary/30 opacity-60"
                  } ${draggedIndex === idx ? "scale-98 ring-2 ring-[rgb(72,125,72)] shadow-lg" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GripVertical className="h-4 w-4 text-sage-muted/60 shrink-0 group-hover:text-forest transition" />
                    
                    {/* Flag Preview */}
                    <div className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-sage-border shadow-2xs bg-white">
                      {code && code.length === 2 ? (
                        <img
                          src={`https://flagcdn.com/w40/${code}.png`}
                          alt={country.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-xs">{country.flag || "🌐"}</span>
                      )}
                    </div>

                    {/* Country Details */}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-forest truncate flex items-center gap-1.5">
                        {country.name}
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sage-secondary text-sage-muted border border-sage-border/60">
                          {country.code}
                        </span>
                      </div>
                      <span className="text-[10px] text-charcoal-400">
                        {country.active !== false ? "Active on marquee" : "Disabled (Hidden)"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      title="Move up"
                      className="p-1 rounded-lg text-sage-muted hover:text-forest hover:bg-sage-secondary transition disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === settings.countries.length - 1}
                      title="Move down"
                      className="p-1 rounded-lg text-sage-muted hover:text-forest hover:bg-sage-secondary transition disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(idx)}
                      title={country.active !== false ? "Disable" : "Enable"}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        country.active !== false
                          ? "border-sage-border text-site hover:bg-sage-secondary"
                          : "border-dashed border-sage-border text-sage-muted hover:text-forest"
                      }`}
                    >
                      {country.active !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(idx)}
                      title="Edit"
                      className="p-1.5 rounded-lg border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCountry(idx)}
                      title="Remove"
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Country Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-3 sm:p-6 backdrop-blur-md">
          <div className="relative max-w-lg w-full rounded-3xl border border-sage-light/40 bg-sage-card shadow-deep flex flex-col overflow-hidden my-auto max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-sage-border/60 bg-sage-card shrink-0">
              <h3 className="font-serif text-xl text-forest font-semibold">
                {editingIndex !== null ? "Edit Country Information" : "Add Country to Marquee"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sage-muted hover:text-forest p-1.5 rounded-full hover:bg-sage-secondary transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCountry} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar bg-sage-card text-left">
                {/* Searchable Country Picker */}
                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Select Country from World Registry
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage-muted" />
                    <input
                      type="text"
                      placeholder="Type country name or 2-letter code to search..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="field-luxury pl-8 text-xs"
                    />
                  </div>

                  {/* Dropdown Options List */}
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-sage-border/80 bg-sage-bg/60 p-1.5 space-y-1">
                    {filteredCountries.slice(0, 30).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                          selectedCode === c.code
                            ? "bg-[rgb(72,125,72)] text-white font-semibold"
                            : "hover:bg-sage-secondary/80 text-forest"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{c.flag}</span>
                          <span>{c.name}</span>
                        </div>
                        <span className="font-mono text-[10px] opacity-80">{c.code}</span>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <div className="text-center py-3 text-sage-muted text-xs">
                        No matching countries found.
                      </div>
                    )}
                  </div>
                </div>

                {/* Country Details Input */}
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Selected Code (ISO 2)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      required
                      value={selectedCode}
                      onChange={(e) => setSelectedCode(e.target.value.toUpperCase())}
                      className="field-luxury text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Display Name on Website *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="field-luxury text-xs"
                    />
                  </div>
                </div>

                {/* Preview Selected Flag */}
                <div className="p-3 rounded-xl border border-sage-border bg-sage-secondary/30 flex items-center justify-between">
                  <span className="text-xs text-charcoal-600 font-medium">Selected Flag Preview:</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://flagcdn.com/w40/${selectedCode.toLowerCase()}.png`}
                      alt={displayName}
                      className="h-4 w-6 rounded-[2px] object-cover border border-sage-border shadow-2xs"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <span className="text-sm">{getFlagEmoji(selectedCode)}</span>
                    <span className="text-xs font-semibold text-forest">{displayName}</span>
                  </div>
                </div>

                {/* Active Status Checkbox */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-[rgb(72,125,72)] cursor-pointer"
                  />
                  <span className="text-xs text-charcoal-700">Display this country in public scrolling marquee</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-sage-border/60 bg-sage-card shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-sage-border text-xs font-semibold text-forest hover:bg-sage-secondary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer"
                >
                  {editingIndex !== null ? "Update Country" : "Add to Marquee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* global confirm */
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  GripVertical,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import { WORLD_COUNTRIES, getFlagEmoji } from "../data/countries.js";

const DEFAULT_LOCATIONS = [
  {
    id: "uae-dubai",
    country: "UAE",
    city: "Dubai",
    label: "Dubai, UAE",
    countryCode: "AE",
    flag: "🇦🇪",
    lat: 25.2048,
    lon: 55.2708,
    active: true,
    featured: true,
    order: 1
  },
  {
    id: "ch-zurich",
    country: "Switzerland",
    city: "Zurich",
    label: "Zurich, Switzerland",
    countryCode: "CH",
    flag: "🇨🇭",
    lat: 47.3769,
    lon: 8.5417,
    active: true,
    featured: true,
    order: 2
  },
  {
    id: "gb-london",
    country: "United Kingdom",
    city: "London",
    label: "London, UK",
    countryCode: "GB",
    flag: "🇬🇧",
    lat: 51.5074,
    lon: -0.1278,
    active: true,
    featured: true,
    order: 3
  },
  {
    id: "in-chandigarh",
    country: "India",
    city: "Chandigarh",
    label: "Chandigarh, India",
    countryCode: "IN",
    flag: "🇮🇳",
    lat: 30.7333,
    lon: 76.7794,
    active: true,
    featured: true,
    order: 4
  }
];

const CITY_COORDINATE_PRESETS = {
  AE: { city: "Dubai", lat: 25.2048, lon: 55.2708 },
  CH: { city: "Zurich", lat: 47.3769, lon: 8.5417 },
  GB: { city: "London", lat: 51.5074, lon: -0.1278 },
  IN: { city: "Chandigarh", lat: 30.7333, lon: 76.7794 },
  FR: { city: "Paris", lat: 48.8566, lon: 2.3522 },
  US: { city: "New York", lat: 40.7128, lon: -74.0060 },
  IT: { city: "Milan", lat: 45.4642, lon: 9.1900 },
  JP: { city: "Tokyo", lat: 35.6762, lon: 139.6503 },
  AU: { city: "Sydney", lat: -33.8688, lon: 151.2093 },
  MC: { city: "Monaco", lat: 43.7384, lon: 7.4246 },
  SG: { city: "Singapore", lat: 1.3521, lon: 103.8198 },
  CA: { city: "Toronto", lat: 43.6532, lon: -79.3832 },
  DE: { city: "Berlin", lat: 52.5200, lon: 13.4050 }
};

export default function GlobalReachManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    enabled: true,
    heading: "Trusted by Premiere Production Houses & Creative Agencies",
    description: "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
    speed: 35,
    locations: DEFAULT_LOCATIONS,
    countries: []
  });

  // Location Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = new, string = editing ID
  const [countrySearch, setCountrySearch] = useState("");
  const [formCountry, setFormCountry] = useState("UAE");
  const [formCity, setFormCity] = useState("Dubai");
  const [formLabel, setFormLabel] = useState("Dubai, UAE");
  const [formCode, setFormCode] = useState("AE");
  const [formFlag, setFormFlag] = useState("🇦🇪");
  const [formFlagUrl, setFormFlagUrl] = useState("");
  const [formLat, setFormLat] = useState("25.2048");
  const [formLon, setFormLon] = useState("55.2708");
  const [formActive, setFormActive] = useState(true);
  const [formFeatured, setFormFeatured] = useState(true);

  // Fetch Settings from API
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/cms/collaborations/global-reach");
      if (res?.data) {
        const incomingLocations = Array.isArray(res.data.locations) && res.data.locations.length > 0
          ? res.data.locations
          : DEFAULT_LOCATIONS;

        setSettings({
          enabled: res.data.enabled !== false,
          heading: res.data.heading || "Trusted by Premiere Production Houses & Creative Agencies",
          description: res.data.description || "Collaborating with creative teams, production houses and businesses across the globe to bring visual stories to life.",
          speed: Number(res.data.speed) || 35,
          locations: incomingLocations,
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

  // Save Settings to Backend API / PostgreSQL
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...settings,
        locations: settings.locations.map((loc, idx) => ({
          ...loc,
          order: idx + 1
        }))
      };

      await apiFetch("/api/v1/cms/collaborations/global-reach", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      // Broadcast change to public pages
      if (typeof BroadcastChannel === "function") {
        try {
          const ch = new BroadcastChannel("editing-table-cms");
          ch.postMessage({ key: "globalReach", timestamp: Date.now() });
          ch.close();
        } catch {
          // ignore
        }
      }

      setSavedMsg("Global locations and 3D globe settings published successfully to PostgreSQL!");
      setTimeout(() => setSavedMsg(""), 4500);
    } catch (err) {
      setError(err.message || "Failed to save global reach settings.");
    } finally {
      setSaving(false);
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingId(null);
    setCountrySearch("");
    setFormCountry("United States");
    setFormCity("New York");
    setFormLabel("New York, USA");
    setFormCode("US");
    setFormFlag("🇺🇸");
    setFormFlagUrl("");
    setFormLat("40.7128");
    setFormLon("-74.0060");
    setFormActive(true);
    setFormFeatured(settings.locations.filter((l) => l.featured).length < 4);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (loc) => {
    setEditingId(loc.id);
    setCountrySearch("");
    setFormCountry(loc.country || "");
    setFormCity(loc.city || "");
    setFormLabel(loc.label || `${loc.city}, ${loc.country}`);
    setFormCode((loc.countryCode || "").toUpperCase());
    setFormFlag(loc.flag || getFlagEmoji(loc.countryCode) || "🌐");
    setFormFlagUrl(loc.flagUrl || "");
    setFormLat(String(loc.lat ?? ""));
    setFormLon(String(loc.lon ?? ""));
    setFormActive(loc.active !== false);
    setFormFeatured(Boolean(loc.featured));
    setIsModalOpen(true);
  };

  // Auto-fill coordinates from preset when country is picked
  const handleSelectCountry = (country) => {
    setFormCountry(country.name);
    setFormCode(country.code);
    setFormFlag(country.flag || getFlagEmoji(country.code));
    const preset = CITY_COORDINATE_PRESETS[country.code];
    if (preset) {
      setFormCity(preset.city);
      setFormLabel(`${preset.city}, ${country.name}`);
      setFormLat(String(preset.lat));
      setFormLon(String(preset.lon));
    } else {
      setFormLabel(`${formCity || country.name}, ${country.name}`);
    }
  };

  // Save Location from Modal
  const handleSaveLocation = (e) => {
    e.preventDefault();
    if (!formCountry.trim() || !formCity.trim()) {
      alert("Please enter both country and city name.");
      return;
    }

    const latNum = parseFloat(formLat);
    const lonNum = parseFloat(formLon);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      alert("Please enter a valid latitude between -90 and 90.");
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      alert("Please enter a valid longitude between -180 and 180.");
      return;
    }

    const cleanCode = (formCode || "").trim().toUpperCase();
    const cleanFlag = formFlag.trim() || getFlagEmoji(cleanCode) || "🌐";

    const updatedLocation = {
      id: editingId || `loc-${Date.now()}`,
      country: formCountry.trim(),
      city: formCity.trim(),
      label: formLabel.trim() || `${formCity.trim()}, ${formCountry.trim()}`,
      countryCode: cleanCode,
      flag: cleanFlag,
      flagUrl: formFlagUrl.trim(),
      lat: latNum,
      lon: lonNum,
      active: formActive,
      featured: formFeatured,
      order: editingId
        ? settings.locations.find((l) => l.id === editingId)?.order || settings.locations.length
        : settings.locations.length + 1
    };

    if (editingId) {
      setSettings((prev) => ({
        ...prev,
        locations: prev.locations.map((l) => (l.id === editingId ? updatedLocation : l))
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        locations: [...prev.locations, updatedLocation]
      }));
    }

    setIsModalOpen(false);
  };

  // Delete Location
  const handleDeleteLocation = (id, name) => {
    if (confirm(`Remove "${name}" from the global locations database?`)) {
      setSettings((prev) => ({
        ...prev,
        locations: prev.locations.filter((l) => l.id !== id)
      }));
    }
  };

  // Toggle Active
  const handleToggleActive = (id) => {
    setSettings((prev) => ({
      ...prev,
      locations: prev.locations.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    }));
  };

  // Toggle Featured
  const handleToggleFeatured = (id) => {
    setSettings((prev) => ({
      ...prev,
      locations: prev.locations.map((l) => (l.id === id ? { ...l, featured: !l.featured } : l))
    }));
  };

  // Reorder Up
  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const updated = [...settings.locations];
    const temp = updated[idx - 1];
    updated[idx - 1] = updated[idx];
    updated[idx] = temp;
    setSettings((prev) => ({ ...prev, locations: updated }));
  };

  // Reorder Down
  const handleMoveDown = (idx) => {
    if (idx === settings.locations.length - 1) return;
    const updated = [...settings.locations];
    const temp = updated[idx + 1];
    updated[idx + 1] = updated[idx];
    updated[idx] = temp;
    setSettings((prev) => ({ ...prev, locations: updated }));
  };

  // Drag and Drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...settings.locations];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setSettings((prev) => ({ ...prev, locations: updated }));
  };

  const featuredCount = settings.locations.filter((l) => l.featured && l.active !== false).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center space-x-3 text-sage-muted">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading global locations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header & Publish Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sage-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Globe2 className="h-5 w-5 text-site" />
            <h2 className="font-heading text-xl sm:text-2xl font-normal text-forest">
              Global Reach &amp; 3D Globe Manager
            </h2>
          </div>
          <p className="text-xs text-sage-muted mt-1">
            Manage international suites, 3D Earth coordinates, and the 4 featured public location cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-full border border-sage-border bg-white px-4 py-2 text-xs font-semibold text-forest hover:bg-sage-secondary transition shadow-2xs"
          >
            <Plus className="h-4 w-4 text-site" />
            <span>Add Location</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2 text-xs font-semibold shadow-sage hover:bg-[#3B693B] transition disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Publishing..." : "Save & Publish"}</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-900 shadow-soft">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 shadow-soft">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Featured Locations Status Banner */}
      <div className="rounded-2xl border border-sage-border bg-[#F8FBF7] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-sage-border text-site font-bold text-base shadow-2xs">
            {featuredCount}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-forest">
              Featured Cards Display: {featuredCount} of 4 Locations Active
            </p>
            <p className="text-[11px] text-sage-muted mt-0.5">
              The 4 featured active locations are displayed in the 2×2 grid alongside the 3D globe.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white border border-sage-border text-site shadow-2xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Live 3D Sync</span>
        </div>
      </div>

      {/* Section Content Configuration */}
      <div className="rounded-2xl border border-sage-border bg-white p-5 sm:p-6 space-y-4 shadow-xs">
        <h3 className="font-heading text-lg font-normal text-forest flex items-center gap-2">
          <Sliders className="h-4 w-4 text-site" /> Section Typography &amp; Content
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1.5">
              Section Heading
            </label>
            <input
              type="text"
              value={settings.heading}
              onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
              className="field-luxury text-xs py-2"
              placeholder="Trusted by Premiere Production Houses & Creative Agencies"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1.5">
              Section Subtitle
            </label>
            <input
              type="text"
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="field-luxury text-xs py-2"
              placeholder="Collaborating with creative teams across the globe..."
            />
          </div>
        </div>
      </div>

      {/* Locations List Table / Cards */}
      <div className="rounded-2xl border border-sage-border bg-white overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-sage-border flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-normal text-forest">
              Configured Locations ({settings.locations.length})
            </h3>
            <p className="text-xs text-sage-muted mt-0.5">
              Drag rows or use arrows to change display and rotation sequence.
            </p>
          </div>
        </div>

        <div className="divide-y divide-sage-border/70">
          {settings.locations.map((loc, idx) => {
            const flagCode = (loc.countryCode || "").toLowerCase();

            return (
              <div
                key={loc.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-colors gap-3 ${
                  loc.active === false ? "bg-sage-secondary/30 opacity-60" : "hover:bg-[#F9FBF8]"
                }`}
              >
                {/* Drag handle & Flag info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="cursor-grab active:cursor-grabbing text-sage-muted hover:text-forest p-1">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <span className="relative flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-sage-border bg-sage-secondary shadow-2xs">
                    {flagCode ? (
                      <img
                        src={`https://flagcdn.com/w80/${flagCode}.png`}
                        alt={loc.country}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <span className="text-sm select-none" aria-hidden="true">
                      {loc.flag || "🌐"}
                    </span>
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-base font-medium text-forest truncate">
                        {loc.country}
                      </p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-site px-2 py-0.5 rounded-full bg-sage-secondary border border-sage-border">
                        {loc.city}
                      </span>
                      {loc.featured && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Star className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" /> Featured
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-sage-muted flex items-center gap-2 mt-0.5">
                      <MapPin className="h-3 w-3 text-site shrink-0" />
                      <span>{loc.label}</span>
                      <span className="font-mono text-[10px] text-sage-muted/80">
                        ({loc.lat.toFixed(4)}, {loc.lon.toFixed(4)})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Controls & Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 text-sage-muted hover:text-forest disabled:opacity-30 rounded-lg hover:bg-sage-secondary"
                    title="Move Up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === settings.locations.length - 1}
                    className="p-1.5 text-sage-muted hover:text-forest disabled:opacity-30 rounded-lg hover:bg-sage-secondary"
                    title="Move Down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>

                  {/* Featured Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(loc.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                      loc.featured
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-white border-sage-border text-sage-muted hover:text-forest"
                    }`}
                    title="Toggle featured on public cards"
                  >
                    {loc.featured ? "★ Featured" : "☆ Feature"}
                  </button>

                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(loc.id)}
                    className={`p-1.5 rounded-lg border transition ${
                      loc.active !== false
                        ? "bg-white border-sage-border text-site hover:bg-sage-secondary"
                        : "bg-sage-secondary border-sage-border text-sage-muted"
                    }`}
                    title={loc.active !== false ? "Disable location" : "Enable location"}
                  >
                    {loc.active !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => openEditModal(loc)}
                    className="p-1.5 rounded-lg border border-sage-border bg-white text-forest hover:bg-sage-secondary transition"
                    title="Edit location"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(loc.id, loc.label)}
                    className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition"
                    title="Delete location"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-sage-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sage-border pb-3">
              <h3 className="font-heading text-lg font-medium text-forest flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-site" />
                {editingId ? "Edit Location & Coordinates" : "Add New Global Hub"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sage-muted hover:text-forest p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              {/* Quick Country Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                  Pick Country / Preset
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage-muted" />
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    style={{ paddingLeft: "2.25rem" }}
                    className="field-luxury text-xs py-1.5"
                  />
                </div>
                <div className="max-h-28 overflow-y-auto border border-sage-border rounded-xl p-1 grid grid-cols-2 gap-1 bg-[#FAFBF8]">
                  {WORLD_COUNTRIES.filter(
                    (c) =>
                      !countrySearch ||
                      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                      c.code.toLowerCase().includes(countrySearch.toLowerCase())
                  ).map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition ${
                        formCode === c.code
                          ? "bg-[rgb(72,125,72)] text-white"
                          : "hover:bg-white text-forest"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields: Country & City */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Country Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="field-luxury text-xs py-2"
                    placeholder="e.g. UAE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    City Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={(e) => {
                      setFormCity(e.target.value);
                      setFormLabel(`${e.target.value}, ${formCountry}`);
                    }}
                    className="field-luxury text-xs py-2"
                    placeholder="e.g. Dubai"
                  />
                </div>
              </div>

              {/* Label & Country Code */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Pill Display Label
                  </label>
                  <input
                    type="text"
                    required
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="field-luxury text-xs py-2"
                    placeholder="e.g. Dubai, UAE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Country Code (2-Letter ISO)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="field-luxury text-xs py-2 font-mono uppercase"
                    placeholder="AE"
                  />
                </div>
              </div>

              {/* Coordinates (Lat / Lon) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Latitude (-90 to +90)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="field-luxury text-xs py-2 font-mono"
                    placeholder="25.2048"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-site mb-1">
                    Longitude (-180 to +180)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formLon}
                    onChange={(e) => setFormLon(e.target.value)}
                    className="field-luxury text-xs py-2 font-mono"
                    placeholder="55.2708"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-sage-border">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-4 w-4 rounded border-sage-border text-site focus:ring-site"
                  />
                  <span className="text-xs font-semibold text-forest">Active Status</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-sage-border text-site focus:ring-site"
                  />
                  <span className="text-xs font-semibold text-forest">
                    Featured (Display on 2×2 Cards Grid)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-sage-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-sage-muted hover:text-forest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-full bg-[rgb(72,125,72)] text-white hover:bg-[#3B693B] shadow-sage transition"
                >
                  {editingId ? "Update Location" : "Add Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

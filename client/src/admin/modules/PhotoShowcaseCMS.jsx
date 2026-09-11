/* global confirm, console */
import {
  AlertCircle,
  BarChart2,
  Camera,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Star,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import { useAdmin } from "../AdminContext.jsx";
import CmsOrderControls from "../components/CmsOrderControls.jsx";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";

const DEFAULT_SETTINGS = {
  heading: "Masterpiece High-End Photo Retouching & Color Suite",
  subheading:
    "Bespoke architectural imagery, high-end editorial photo retouching, and luxury property portfolios crafted with precision.",
  showSection: true,
  showSubheading: true,
  alignment: "center",
  headingColor: "rgb(72,125,72)",
  textColor: "rgb(72,125,72)",
  backgroundColor: "#F8FBF7",
  sectionPaddingTop: 80,
  sectionPaddingBottom: 80,
  maxWidth: 1440,
  autoplay: true,
  autoplayDelay: 5000,
  infiniteLoop: true,
  pauseOnHover: true,
  cardRadius: 24,
  showArrows: true,
  showPagination: true,
  ctaText: "Explore Full Gallery",
  ctaUrl: "/portfolio",
  ctaVisible: true,
  ctaNewTab: false,
  anchorId: "photo-showcase"
};

export default function PhotoShowcaseCMS() {
  const { user } = useAdmin();
  const isSuperAdmin = user?.role === "superadmin";

  const [activeTab, setActiveTab] = useState("all"); // 'all', 'settings', 'analytics', 'trash', 'logs'
  const [photos, setPhotos] = useState([]);
  const [trashPhotos, setTrashPhotos] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    propertyName: "",
    location: "",
    category: "High-End Photo Retouching",
    tags: "Architecture, Sunset, Retouching",
    imageUrl: "",
    mobileImageUrl: "",
    badgeText: "Editorial Retouching",
    ctaText: "View Retouching Details",
    ctaUrl: "/contactus",
    openInNewTab: false,
    order: 0,
    isFeatured: false,
    isActive: true
  });

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/admin/photo-showcase");
      setPhotos(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch photo showcase items.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/photo-showcase?isTrash=true");
      setTrashPhotos(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Fetch trash error:", err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/photo-showcase/settings");
      if (data.data) setSettings({ ...DEFAULT_SETTINGS, ...data.data });
    } catch (err) {
      console.error("Fetch settings error:", err);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/photo-showcase/analytics");
      if (data.data) setAnalytics(data.data);
    } catch (err) {
      console.error("Fetch analytics error:", err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/photo-showcase/logs");
      if (Array.isArray(data.data)) setLogs(data.data);
    } catch (err) {
      console.error("Fetch logs error:", err);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
    fetchSettings();
  }, [fetchPhotos, fetchSettings]);

  useEffect(() => {
    if (activeTab === "trash") fetchTrash();
    if (activeTab === "analytics") fetchAnalytics();
    if (activeTab === "logs") fetchLogs();
  }, [activeTab, fetchTrash, fetchAnalytics, fetchLogs]);

  const openModal = (photo = null) => {
    setEditingItem(photo);
    if (photo) {
      setFormData({
        title: photo.title || "",
        slug: photo.slug || "",
        description: photo.description || "",
        propertyName: photo.propertyName || "",
        location: photo.location || "",
        category: photo.category || "High-End Photo Retouching",
        tags: Array.isArray(photo.tags) ? photo.tags.join(", ") : photo.tags || "",
        imageUrl: photo.image?.url || photo.image || "",
        mobileImageUrl: photo.mobileImage?.url || "",
        badgeText: photo.badgeText || "Editorial Retouching",
        ctaText: photo.ctaText || "View Retouching Details",
        ctaUrl: photo.ctaUrl || "/contactus",
        openInNewTab: Boolean(photo.openInNewTab),
        order: photo.order ?? 0,
        isFeatured: Boolean(photo.isFeatured),
        isActive: photo.isActive !== undefined ? photo.isActive : true
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        description: "",
        propertyName: "",
        location: "",
        category: "High-End Photo Retouching",
        tags: "Architecture, Sunset, Retouching",
        imageUrl: "",
        mobileImageUrl: "",
        badgeText: "Editorial Retouching",
        ctaText: "View Retouching Details",
        ctaUrl: "/contactus",
        openInNewTab: false,
        order: photos.length + 1,
        isFeatured: false,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitPhoto = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const isNew = !editingItem;
      const url = isNew
        ? "/api/v1/admin/photo-showcase"
        : `/api/v1/admin/photo-showcase/${editingItem._id}`;
      const method = isNew ? "POST" : "PUT";

      const tagsArray = typeof formData.tags === "string"
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : formData.tags;

      const payload = {
        ...formData,
        tags: tagsArray,
        image: formData.imageUrl ? { url: formData.imageUrl } : undefined,
        mobileImage: formData.mobileImageUrl ? { url: formData.mobileImageUrl } : undefined
      };

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      setSavedMsg(`Photo showcase ${isNew ? "created" : "updated"} successfully!`);
      setTimeout(() => setSavedMsg(""), 3000);
      setIsModalOpen(false);
      fetchPhotos();
    } catch (err) {
      setError(err.message || "Failed to save photo item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await apiFetch(`/api/v1/admin/photo-showcase/${id}/duplicate`, { method: "POST" });
      setSavedMsg("Photo showcase item duplicated.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchPhotos();
    } catch (err) {
      setError(err.message || "Duplicate failed.");
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/admin/photo-showcase/settings", {
        method: "PUT",
        body: JSON.stringify(settings)
      });
      setSavedMsg("Section settings saved successfully!");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (photo) => {
    try {
      await apiFetch(`/api/v1/admin/photo-showcase/${photo._id}/status`, {
        method: "PATCH"
      });
      fetchPhotos();
    } catch (err) {
      setError(err.message || "Status update failed.");
    }
  };

  const handleToggleFeatured = async (photo) => {
    try {
      await apiFetch(`/api/v1/admin/photo-showcase/${photo._id}/featured`, {
        method: "PATCH"
      });
      fetchPhotos();
    } catch (err) {
      setError(err.message || "Featured status update failed.");
    }
  };

  const handleSoftDelete = async (id) => {
    if (!confirm("Move this photo to trash?")) return;
    try {
      await apiFetch(`/api/v1/admin/photo-showcase/${id}`, { method: "DELETE" });
      setSavedMsg("Photo moved to trash.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchPhotos();
    } catch (err) {
      setError(err.message || "Delete failed.");
    }
  };

  const handleRestore = async (id) => {
    try {
      await apiFetch(`/api/v1/admin/photo-showcase/${id}/restore`, { method: "PATCH" });
      setSavedMsg("Photo restored from trash.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchTrash();
      fetchPhotos();
    } catch (err) {
      setError(err.message || "Restore failed.");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm("Permanently delete this photo? This action cannot be undone.")) return;
    try {
      await apiFetch(`/api/v1/admin/photo-showcase/${id}/permanent`, { method: "DELETE" });
      setSavedMsg("Photo permanently deleted.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchTrash();
    } catch (err) {
      setError(err.message || "Permanent delete failed.");
    }
  };

  const filteredPhotos = photos.filter((p) => {
    const matchesSearch =
      !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.propertyName?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active" ? p.isActive : !p.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-forest">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">
            Interactive Showcase Module
          </span>
          <h1 className="font-heading text-3xl text-forest">Photo Showcase CMS</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchPhotos}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
            title="Refresh Showcase Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Showcase Photo
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

      {/* 5 Sub-Tabs matching Video Showcase CMS */}
      <div className="flex items-center gap-2 border-b border-sage-border pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "all"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Camera className="h-3.5 w-3.5" /> All Photos ({photos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "settings"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Settings className="h-3.5 w-3.5" /> Section Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "analytics"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <BarChart2 className="h-3.5 w-3.5" /> Analytics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("trash")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "trash"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Trash ({trashPhotos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
            activeTab === "logs"
              ? "bg-[rgb(72,125,72)] text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Activity Logs
        </button>
      </div>

      {/* TAB 1: ALL PHOTOS */}
      {activeTab === "all" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search photos, property name, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "2.75rem" }}
                className="field-luxury text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="field-luxury text-xs py-2 px-3"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPhotos.map((photo) => {
              const imageSrc = mediaUrl(photo.image?.url || photo.image);

              return (
                <div
                  key={photo._id}
                  className={`rounded-3xl border bg-sage-card p-5 shadow-soft transition-all space-y-4 relative flex flex-col justify-between ${
                    photo.isActive ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <CmsOrderControls
                        collection={photos}
                        setCollection={setPhotos}
                        itemId={photo._id}
                        endpoint="/api/v1/admin/photo-showcase"
                        onError={setError}
                      />

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(photo)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            photo.isFeatured
                              ? "border-amber-300 text-amber-600 bg-amber-50"
                              : "border-sage-border text-sage-muted hover:text-forest"
                          }`}
                        >
                          <Star className={`h-3.5 w-3.5 ${photo.isFeatured ? "fill-amber-400" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(photo)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            photo.isActive
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : "border-rose-200 text-rose-700 bg-rose-50"
                          }`}
                        >
                          {photo.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="relative h-44 w-full rounded-2xl border border-sage-border overflow-hidden bg-forest flex items-center justify-center">
                      <img src={imageSrc} alt="" className="h-full w-full object-cover" />
                      {photo.badgeText && (
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-forest/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white border border-white/20">
                          {photo.badgeText}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-site">
                        {photo.category}
                      </span>
                      <h3 className="font-serif text-xl font-semibold text-forest leading-tight mt-0.5">
                        {photo.title}
                      </h3>
                      <p className="text-xs text-sage-muted mt-1">{photo.propertyName} • {photo.location}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-sage-border/60 flex items-center justify-between text-xs text-sage-muted">
                    <span className="text-[11px] font-medium">{photo.views || 0} views</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(photo._id)}
                        className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                        title="Duplicate Photo"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal(photo)}
                        className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSoftDelete(photo._id)}
                        className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SETTINGS */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 bg-sage-card p-6 rounded-3xl border border-sage-border shadow-soft">
          <h2 className="font-serif text-2xl text-forest pb-2 border-b border-sage-border">
            Public Photo Showcase Settings
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Section Heading
              </label>
              <input
                type="text"
                value={settings.heading}
                onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
                className="field-luxury text-sm font-serif"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Section Subheading
              </label>
              <input
                type="text"
                value={settings.subheading}
                onChange={(e) => setSettings({ ...settings, subheading: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                CTA Button Text
              </label>
              <input
                type="text"
                value={settings.ctaText}
                onChange={(e) => setSettings({ ...settings, ctaText: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                CTA URL
              </label>
              <input
                type="text"
                value={settings.ctaUrl}
                onChange={(e) => setSettings({ ...settings, ctaUrl: e.target.value })}
                className="field-luxury text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Autoplay Delay (ms)
              </label>
              <input
                type="number"
                value={settings.autoplayDelay}
                onChange={(e) => setSettings({ ...settings, autoplayDelay: Number(e.target.value) })}
                className="field-luxury text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <span className="text-xs uppercase tracking-wider text-sage-muted">Total Showcase Photos</span>
              <p className="font-serif text-3xl text-forest font-semibold mt-1">{analytics?.totalPhotos || photos.length}</p>
            </div>
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <span className="text-xs uppercase tracking-wider text-sage-muted">Total Views</span>
              <p className="font-serif text-3xl text-forest font-semibold mt-1">{analytics?.totalViews || 0}</p>
            </div>
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <span className="text-xs uppercase tracking-wider text-sage-muted">Total Lightbox Clicks</span>
              <p className="font-serif text-3xl text-forest font-semibold mt-1">{analytics?.totalClicks || 0}</p>
            </div>
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <span className="text-xs uppercase tracking-wider text-sage-muted">Click-Through Rate (CTR)</span>
              <p className="font-serif text-3xl text-site font-semibold mt-1">{analytics?.ctr || "0.0%"}</p>
            </div>
          </div>

          {analytics?.topPhotos && analytics.topPhotos.length > 0 && (
            <div className="rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft space-y-4">
              <h3 className="font-serif text-xl text-forest">Top Performing Photos</h3>
              <div className="space-y-3">
                {analytics.topPhotos.map((item) => (
                  <div key={item._id} className="flex items-center justify-between border-b border-sage-border/60 pb-3">
                    <div>
                      <p className="font-medium text-forest text-sm">{item.title}</p>
                      <p className="text-xs text-sage-muted">{item.category}</p>
                    </div>
                    <span className="text-xs font-bold text-site">{item.views || 0} views</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TRASH */}
      {activeTab === "trash" && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-forest">Trash Bin</h2>

          {trashPhotos.length === 0 ? (
            <div className="rounded-3xl border border-sage-border bg-sage-card p-8 text-center text-sage-muted text-sm">
              No photos currently in trash.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trashPhotos.map((photo) => (
                <div key={photo._id} className="rounded-3xl border border-rose-200 bg-rose-50/30 p-5 space-y-3">
                  <h3 className="font-serif text-lg text-forest font-semibold">{photo.title}</h3>
                  <p className="text-xs text-sage-muted">{photo.propertyName}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-rose-200">
                    <button
                      type="button"
                      onClick={() => handleRestore(photo._id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(photo._id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Permanently
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ACTIVITY LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4 rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft">
          <h2 className="font-serif text-2xl text-forest">Admin Activity Logs</h2>

          {logs.length === 0 ? (
            <p className="text-xs text-sage-muted">No activity logs recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log._id} className="flex items-center justify-between border-b border-sage-border/60 pb-3 text-xs">
                  <div>
                    <span className="font-semibold text-forest">{log.adminId?.name || "Admin"}</span>{" "}
                    <span className="text-sage-muted">performed</span>{" "}
                    <span className="font-bold text-site">{log.action}</span>
                  </div>
                  <span className="text-[11px] text-sage-muted">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-3 sm:p-6 backdrop-blur-md">
          <div className="relative max-w-3xl w-full rounded-3xl border border-sage-light/40 bg-sage-card p-6 shadow-deep space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage-border">
              <h2 className="font-serif text-2xl text-forest">
                {editingItem ? "Edit Showcase Photo" : "Add New Showcase Photo"}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-sage-muted hover:text-forest">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPhoto} className="space-y-4">
              <MediaUploadDropzone
                folder="photo-showcase"
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                label="High-Res Showcase Photo (JPEG/WebP)"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-sage-muted mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="field-luxury text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-sage-muted mb-1">Property Name</label>
                  <input
                    type="text"
                    value={formData.propertyName}
                    onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                    className="field-luxury text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-sage-muted mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="field-luxury text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-sage-muted mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    className="field-luxury text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-sage-muted mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="field-luxury text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-sage-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-full border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69]"
                >
                  {saving ? "Saving..." : "Save Photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

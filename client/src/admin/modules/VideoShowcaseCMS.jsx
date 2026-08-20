/* global confirm, alert, console */
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Film,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Star,
  Trash2,
  Video,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import { useAdmin } from "../AdminContext.jsx";
import CmsOrderControls from "../components/CmsOrderControls.jsx";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";

const DEFAULT_SETTINGS = {
  heading: "We Turn Your Raw Footage Into Stories Worth Watching",
  subheading:
    "From cinematic wedding films and emotional highlights to brand campaigns, reels, and professional post-production — The Editing Table transforms every frame into a polished visual experience designed to connect, engage, and leave a lasting impression.",
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
  hoverPlayback: true,
  centerAutoplay: true,
  enableParallax: true,
  animationDuration: 0.8,
  cardRadius: 24,
  cardGap: 20,
  shadowIntensity: 1,
  showArrows: true,
  showPagination: true,
  ctaText: "Explore Our Portfolio",
  ctaUrl: "/portfolio",
  ctaVisible: true,
  ctaNewTab: false,
  anchorId: "video-showcase"
};

export default function VideoShowcaseCMS() {
  const { user } = useAdmin();
  const isSuperAdmin = user?.role === "superadmin";

  const [activeTab, setActiveTab] = useState("all"); // 'all', 'settings', 'analytics', 'trash', 'logs'
  const [videos, setVideos] = useState([]);
  const [trashVideos, setTrashVideos] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    propertyName: "",
    location: "",
    category: "Real Estate & Architecture",
    tags: "Real Estate, Luxury, Walkthrough",
    sourceType: "upload",
    videoUrl: "",
    videoFileUrl: "",
    mobileVideoUrl: "",
    thumbnailUrl: "",
    mobileThumbnailUrl: "",
    captionUrl: "",
    duration: 30,
    badgeText: "Featured Luxury Estate",
    ctaText: "Inquire Property Film",
    ctaUrl: "/contactus",
    openInNewTab: false,
    order: 0,
    isFeatured: false,
    isActive: true,
    autoplay: false,
    loop: true,
    muted: true,
    showControls: false,
    seoTitle: "",
    seoDescription: ""
  });

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/admin/video-showcase");
      setVideos(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch video showcase items.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/video-showcase?isTrash=true");
      setTrashVideos(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Fetch trash error:", err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/video-showcase/settings");
      if (data.data) setSettings({ ...DEFAULT_SETTINGS, ...data.data });
    } catch (err) {
      console.error("Fetch settings error:", err);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/video-showcase/analytics");
      setAnalytics(data.data);
    } catch (err) {
      console.error("Fetch analytics error:", err);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/admin/video-showcase/activity-logs");
      setLogs(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Fetch activity logs error:", err);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchSettings();
  }, [fetchVideos, fetchSettings]);

  useEffect(() => {
    if (activeTab === "trash") fetchTrash();
    if (activeTab === "analytics") fetchAnalytics();
    if (activeTab === "logs") fetchActivityLogs();
  }, [activeTab, fetchTrash, fetchAnalytics, fetchActivityLogs]);

  const openModal = (video = null) => {
    setEditingItem(video);
    if (video) {
      setFormData({
        title: video.title || "",
        slug: video.slug || "",
        description: video.description || "",
        propertyName: video.propertyName || "",
        location: video.location || "",
        category: video.category || "Real Estate & Architecture",
        tags: Array.isArray(video.tags) ? video.tags.join(", ") : video.tags || "",
        sourceType: video.sourceType || "upload",
        videoUrl: video.videoUrl || "",
        videoFileUrl: video.videoFile?.url || "",
        mobileVideoUrl: video.mobileVideoFile?.url || "",
        thumbnailUrl: video.thumbnail?.url || video.thumbnail || "",
        mobileThumbnailUrl: video.mobileThumbnail?.url || "",
        captionUrl: video.captionUrl || "",
        duration: video.duration || 30,
        badgeText: video.badgeText || "Featured Luxury Estate",
        ctaText: video.ctaText || "Inquire Property Film",
        ctaUrl: video.ctaUrl || "/contactus",
        openInNewTab: Boolean(video.openInNewTab),
        order: video.order ?? 0,
        isFeatured: Boolean(video.isFeatured),
        isActive: video.isActive !== undefined ? video.isActive : true,
        autoplay: Boolean(video.autoplay),
        loop: video.loop !== undefined ? video.loop : true,
        muted: video.muted !== undefined ? video.muted : true,
        showControls: Boolean(video.showControls),
        seoTitle: video.seoTitle || "",
        seoDescription: video.seoDescription || ""
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        description: "",
        propertyName: "",
        location: "",
        category: "Real Estate & Architecture",
        tags: "Real Estate, Luxury, Walkthrough",
        sourceType: "upload",
        videoUrl: "",
        videoFileUrl: "",
        mobileVideoUrl: "",
        thumbnailUrl: "",
        mobileThumbnailUrl: "",
        captionUrl: "",
        duration: 30,
        badgeText: "Featured Luxury Estate",
        ctaText: "Inquire Property Film",
        ctaUrl: "/contactus",
        openInNewTab: false,
        order: videos.length + 1,
        isFeatured: false,
        isActive: true,
        autoplay: false,
        loop: true,
        muted: true,
        showControls: false,
        seoTitle: "",
        seoDescription: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitVideo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const isNew = !editingItem;
      const url = isNew
        ? "/api/v1/admin/video-showcase"
        : `/api/v1/admin/video-showcase/${editingItem._id}`;
      const method = isNew ? "POST" : "PUT";

      const tagsArray = typeof formData.tags === "string"
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : formData.tags;

      const payload = {
        ...formData,
        tags: tagsArray,
        videoFile: formData.videoFileUrl ? { url: formData.videoFileUrl } : undefined,
        mobileVideoFile: formData.mobileVideoUrl ? { url: formData.mobileVideoUrl } : undefined,
        thumbnail: formData.thumbnailUrl ? { url: formData.thumbnailUrl } : undefined,
        mobileThumbnail: formData.mobileThumbnailUrl ? { url: formData.mobileThumbnailUrl } : undefined
      };

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      setSavedMsg(`Video showcase ${isNew ? "created" : "updated"} successfully!`);
      setTimeout(() => setSavedMsg(""), 3000);
      setIsModalOpen(false);
      fetchVideos();
    } catch (err) {
      setError(err.message || "Failed to save video item.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/v1/admin/video-showcase/settings", {
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

  const handleToggleStatus = async (video) => {
    try {
      await apiFetch(`/api/v1/admin/video-showcase/${video._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !video.isActive })
      });
      fetchVideos();
    } catch (err) {
      setError(err.message || "Status update failed.");
    }
  };

  const handleToggleFeatured = async (video) => {
    try {
      await apiFetch(`/api/v1/admin/video-showcase/${video._id}/featured`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: !video.isFeatured })
      });
      fetchVideos();
    } catch (err) {
      setError(err.message || "Featured status update failed.");
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await apiFetch(`/api/v1/admin/video-showcase/${id}/duplicate`, { method: "POST" });
      setSavedMsg("Video duplicated successfully.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchVideos();
    } catch (err) {
      setError(err.message || "Duplicate failed.");
    }
  };

  const handleSoftDelete = async (id) => {
    if (!confirm("Move this video to trash?")) return;
    try {
      await apiFetch(`/api/v1/admin/video-showcase/${id}`, { method: "DELETE" });
      setSavedMsg("Video moved to trash.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchVideos();
    } catch (err) {
      setError(err.message || "Delete failed.");
    }
  };

  const handleRestore = async (id) => {
    try {
      await apiFetch(`/api/v1/admin/video-showcase/${id}/restore`, { method: "POST" });
      setSavedMsg("Video restored from trash.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchTrash();
      fetchVideos();
    } catch (err) {
      setError(err.message || "Restore failed.");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!isSuperAdmin) {
      alert("Only Super Administrators can permanently delete videos.");
      return;
    }
    if (!confirm("PERMANENT DELETE: This action cannot be undone and will delete all associated media. Proceed?")) return;

    try {
      await apiFetch(`/api/v1/admin/video-showcase/${id}/permanent`, { method: "DELETE" });
      setSavedMsg("Video permanently deleted.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchTrash();
    } catch (err) {
      setError(err.message || "Permanent delete failed.");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Execute ${action} on ${selectedIds.length} selected videos?`)) return;

    try {
      await apiFetch("/api/v1/admin/video-showcase/bulk-action", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds, action })
      });
      setSelectedIds([]);
      setSavedMsg(`Bulk ${action} completed.`);
      setTimeout(() => setSavedMsg(""), 3000);
      fetchVideos();
      if (action === "delete") fetchTrash();
    } catch (err) {
      setError(err.message || "Bulk action failed.");
    }
  };

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      !search ||
      v.title?.toLowerCase().includes(search.toLowerCase()) ||
      v.propertyName?.toLowerCase().includes(search.toLowerCase()) ||
      v.location?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active" ? v.isActive : !v.isActive);
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
          <h1 className="font-serif text-3xl text-forest">Scroll-Stopping Video Showcase</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchVideos}
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
            <Plus className="h-4 w-4" /> Add Showcase Video
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

      {/* Navigation Sub-Tabs */}
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
          <Film className="h-3.5 w-3.5" /> All Videos ({videos.length})
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
              ? "bg-rose-600 text-white shadow-soft"
              : "bg-sage-card text-sage-muted hover:text-forest border border-sage-border"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Trash ({trashVideos.length})
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

      {/* ----------------------------------------------------
          TAB 1: ALL VIDEOS LIST
      ---------------------------------------------------- */}
      {activeTab === "all" && (
        <div className="space-y-6">
          {/* Controls Bar: Search & Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search videos, property name, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "2.75rem" }}
                className="field-luxury text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="field-luxury text-xs py-2 px-3"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-1.5 bg-sage-card p-1 rounded-2xl border border-sage-border">
                  <button
                    type="button"
                    onClick={() => handleBulkAction("activate")}
                    className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100"
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction("deactivate")}
                    className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100"
                  >
                    Deactivate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction("delete")}
                    className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 rounded-xl hover:bg-rose-100"
                  >
                    Trash ({selectedIds.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Videos Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => {
              const isSelected = selectedIds.includes(video._id);
              const thumbSrc = mediaUrl(video.thumbnail?.url || video.thumbnail);

              return (
                <div
                  key={video._id}
                  className={`rounded-3xl border bg-sage-card p-5 shadow-soft transition-all space-y-4 relative flex flex-col justify-between ${
                    video.isActive ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Card Controls */}
                    <div className="flex items-center justify-between">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            isSelected ? prev.filter((id) => id !== video._id) : [...prev, video._id]
                          )
                        }
                        className="h-4 w-4 accent-[rgb(72,125,72)] rounded cursor-pointer"
                      />

                      <div className="flex items-center gap-1">
                        <CmsOrderControls
                          collection={videos}
                          setCollection={setVideos}
                          itemId={video._id}
                          endpoint="/api/v1/admin/video-showcase"
                          onError={setError}
                        />

                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(video)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            video.isFeatured
                              ? "border-amber-300 text-amber-600 bg-amber-50"
                              : "border-sage-border text-sage-muted hover:text-forest"
                          }`}
                          title={video.isFeatured ? "Unmark Featured" : "Mark Featured"}
                        >
                          <Star className={`h-3.5 w-3.5 ${video.isFeatured ? "fill-amber-400" : ""}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(video)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            video.isActive
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : "border-rose-200 text-rose-700 bg-rose-50"
                          }`}
                          title={video.isActive ? "Deactivate" : "Activate"}
                        >
                          {video.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail & Video Preview */}
                    <div className="relative h-44 w-full rounded-2xl border border-sage-border overflow-hidden bg-forest flex items-center justify-center">
                      <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-forest/30" />
                      <div className="absolute h-10 w-10 rounded-full border border-white/40 bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <Video className="h-4 w-4" />
                      </div>
                      {video.badgeText && (
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-forest/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white border border-white/20">
                          {video.badgeText}
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-site">
                        {video.category}
                      </span>
                      <h3 className="font-serif text-xl font-semibold text-forest leading-tight mt-0.5">
                        {video.title}
                      </h3>
                      <p className="text-xs text-sage-muted mt-1">{video.propertyName} • {video.location}</p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-sage-border/60 flex items-center justify-between text-xs text-sage-muted">
                    <span className="text-[11px] font-medium">{video.views || 0} views • {video.playClicks || 0} plays</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(video._id)}
                        className="p-1.5 rounded-xl border border-sage-border text-sage-muted hover:text-forest transition cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal(video)}
                        className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSoftDelete(video._id)}
                        className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Trash"
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

      {/* ----------------------------------------------------
          TAB 2: SECTION SETTINGS
      ---------------------------------------------------- */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 bg-sage-card p-6 rounded-3xl border border-sage-border shadow-soft">
          <h2 className="font-serif text-2xl text-forest pb-2 border-b border-sage-border">
            Public Showcase Settings
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

          <div className="grid gap-5 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                CTA Button Text
              </label>
              <input
                type="text"
                value={settings.ctaText || ""}
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
                value={settings.ctaUrl || ""}
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
                value={settings.autoplayDelay ?? 5000}
                onChange={(e) => setSettings({ ...settings, autoplayDelay: Number(e.target.value) })}
                className="field-luxury text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Card Radius (px)
              </label>
              <input
                type="number"
                value={settings.cardRadius ?? 24}
                onChange={(e) => setSettings({ ...settings, cardRadius: Number(e.target.value) })}
                className="field-luxury text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-sage-border/60">
            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showSection ?? true}
                onChange={(e) => setSettings({ ...settings, showSection: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Show Section Publicly
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoplay ?? true}
                onChange={(e) => setSettings({ ...settings, autoplay: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Enable Automatic Scrolling (Autoplay)
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.infiniteLoop ?? true}
                onChange={(e) => setSettings({ ...settings, infiniteLoop: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Infinite Looping
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pauseOnHover ?? true}
                onChange={(e) => setSettings({ ...settings, pauseOnHover: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Pause Autoplay on Mouse Hover
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.centerAutoplay}
                onChange={(e) => setSettings({ ...settings, centerAutoplay: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Autoplay Center Video (Muted)
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ctaVisible}
                onChange={(e) => setSettings({ ...settings, ctaVisible: e.target.checked })}
                className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
              />
              Show Bottom CTA Button
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving Settings..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}

      {/* ----------------------------------------------------
          TAB 3: ANALYTICS DASHBOARD
      ---------------------------------------------------- */}
      {activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-site">Total Plays</p>
              <p className="font-serif text-3xl text-forest mt-1">{analytics.summary.totalPlayClicks}</p>
              <p className="text-[11px] text-sage-muted mt-1">{analytics.summary.playRate}% play-through rate</p>
            </div>
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-site">Total Impressions</p>
              <p className="font-serif text-3xl text-forest mt-1">{analytics.summary.totalViews}</p>
              <p className="text-[11px] text-sage-muted mt-1">Unique viewport renders</p>
            </div>
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-site">Completion Rate</p>
              <p className="font-serif text-3xl text-forest mt-1">{analytics.summary.completionRate}%</p>
              <p className="text-[11px] text-sage-muted mt-1">{analytics.summary.totalCompletedViews} full plays</p>
            </div>
            <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-site">CTA Clicks</p>
              <p className="font-serif text-3xl text-forest mt-1">{analytics.summary.totalCtaClicks}</p>
              <p className="text-[11px] text-sage-muted mt-1">{analytics.summary.ctr}% CTR</p>
            </div>
          </div>

          {/* Top Videos Table */}
          <div className="rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft space-y-4">
            <h3 className="font-serif text-xl text-forest">Top Performing Videos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-sage-muted">
                <thead>
                  <tr className="border-b border-sage-border uppercase tracking-wider text-[10px] text-site">
                    <th className="py-2.5">Title</th>
                    <th className="py-2.5">Property</th>
                    <th className="py-2.5">Views</th>
                    <th className="py-2.5">Plays</th>
                    <th className="py-2.5">Completions</th>
                    <th className="py-2.5">CTA Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-border/50">
                  {analytics.topVideos?.map((v) => (
                    <tr key={v._id}>
                      <td className="py-3 font-semibold text-forest">{v.title}</td>
                      <td className="py-3">{v.propertyName || "-"}</td>
                      <td className="py-3">{v.views}</td>
                      <td className="py-3">{v.playClicks}</td>
                      <td className="py-3">{v.completedViews}</td>
                      <td className="py-3 font-semibold text-site">{v.ctaClicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: TRASH
      ---------------------------------------------------- */}
      {activeTab === "trash" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-forest">Soft-Deleted Video Items</h2>
            <span className="text-xs text-sage-muted">Items here can be restored or permanently removed.</span>
          </div>

          {trashVideos.length === 0 ? (
            <div className="rounded-3xl border border-sage-border bg-sage-card p-12 text-center text-sage-muted text-sm">
              Trash is empty. No deleted video items.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {trashVideos.map((item) => (
                <div key={item._id} className="rounded-3xl border border-rose-200 bg-rose-50/20 p-5 space-y-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg text-forest font-semibold">{item.title}</h3>
                    <p className="text-xs text-sage-muted">Deleted: {new Date(item.deletedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(item._id)}
                      className="px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Restore
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(item._id)}
                        className="px-3 py-1.5 rounded-full border border-rose-300 bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition cursor-pointer"
                      >
                        Delete Permanently
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: ACTIVITY LOGS
      ---------------------------------------------------- */}
      {activeTab === "logs" && (
        <div className="rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft space-y-4">
          <h2 className="font-serif text-xl text-forest">Admin Activity Audit History</h2>
          <div className="divide-y divide-sage-border/50 text-xs text-sage-muted">
            {logs.map((log) => (
              <div key={log._id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-forest">{log.adminId?.name || "Admin"}</span>
                  <span className="ml-2 font-bold uppercase tracking-wider text-site">{log.action}</span>
                </div>
                <span>{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          ADD / EDIT VIDEO MODAL
      ---------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-3 sm:p-6 backdrop-blur-md">
          <div className="relative max-w-3xl w-full max-h-[92vh] rounded-3xl border border-sage-light/40 bg-sage-card shadow-deep flex flex-col overflow-hidden my-auto">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-sage-border/60 bg-sage-card shrink-0">
              <h2 className="font-serif text-2xl text-forest">
                {editingItem ? "Edit Showcase Video" : "Add New Showcase Video"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sage-muted hover:text-forest p-1.5 rounded-full hover:bg-sage-secondary transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVideo} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar bg-sage-card text-left">
                {/* Source & Video File / URL Upload */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      Source Type
                    </label>
                    <select
                      value={formData.sourceType}
                      onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                      className="field-luxury text-sm"
                    >
                      <option value="upload">Direct Upload (MP4/WebM/MOV)</option>
                      <option value="youtube">YouTube Embed URL</option>
                      <option value="vimeo">Vimeo Embed URL</option>
                      <option value="external">External MP4 URL</option>
                      <option value="hls">HLS Video Stream (.m3u8)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      Video Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="field-luxury text-sm"
                    />
                  </div>
                </div>

                <MediaUploadDropzone
                  folder="video-showcase/videos"
                  value={formData.videoFileUrl}
                  onChange={(url) => setFormData({ ...formData, videoFileUrl: url })}
                  label="Desktop Video File (MP4/WebM)"
                  description="Drag and drop raw video or upload file"
                />

                <MediaUploadDropzone
                  folder="video-showcase/thumbnails"
                  value={formData.thumbnailUrl}
                  onChange={(url) => setFormData({ ...formData, thumbnailUrl: url })}
                  label="Poster Thumbnail Image (JPEG/WebP)"
                  description="High-resolution poster image for video card"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      Video Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="field-luxury text-sm font-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      Property / Project Name
                    </label>
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      Location Tag
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="field-luxury text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={formData.badgeText}
                      onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                      className="field-luxury text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="field-luxury text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={formData.ctaText}
                      onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                      className="field-luxury text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted mb-1">
                      CTA URL
                    </label>
                    <input
                      type="text"
                      value={formData.ctaUrl}
                      onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                      className="field-luxury text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-5 pt-2 border-t border-sage-border/60">
                  <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
                    />
                    Active
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
                    />
                    Featured
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.loop}
                      onChange={(e) => setFormData({ ...formData, loop: e.target.checked })}
                      className="h-4 w-4 accent-[rgb(72,125,72)] rounded"
                    />
                    Loop Video
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-sage-border/60 bg-sage-card/95 backdrop-blur-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-sage-border text-xs font-semibold text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer bg-sage-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition shadow-sage cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Showcase Video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

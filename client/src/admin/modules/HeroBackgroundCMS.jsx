/* global FormData, confirm, console */
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  FileVideo,
  Film,
  History,
  Image as ImageIcon,
  Layers,
  Link,
  Loader2,
  Monitor,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Sliders,
  Smartphone,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Youtube
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import MediaUploadDropzone, { uploadFileInChunks } from "../components/MediaUploadDropzone.jsx";
import { getYouTubeId } from "../../utils/youtube.js";

const PLAYBACK_SPEED_OPTIONS = [
  { label: "0.5x (Slow Motion)", value: 0.5 },
  { label: "0.75x (Gentle Pace)", value: 0.75 },
  { label: "1.0x (Normal Speed)", value: 1.0 },
  { label: "1.25x (Dynamic)", value: 1.25 },
  { label: "1.5x (Fast)", value: 1.5 },
  { label: "2.0x (Double Speed)", value: 2.0 }
];

const POSITION_OPTIONS = [
  { label: "Center (Default)", value: "center" },
  { label: "Top Focused", value: "top" },
  { label: "Bottom Focused", value: "bottom" }
];

const CONTRAST_PRESETS = [
  { label: "0% Raw", value: 0 },
  { label: "25% Soft", value: 0.25 },
  { label: "35% Balanced", value: 0.35 },
  { label: "50% Cinematic", value: 0.5 },
  { label: "70% High Contrast", value: 0.7 }
];

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function HeroBackgroundCMS() {
  const [activeTab, setActiveTab] = useState("manager"); // "manager" | "slides" | "history"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [alert, setAlert] = useState(null); // { type: "success" | "error", message: string }

  // Server state
  const [activeConfig, setActiveConfig] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Draft form state
  const [form, setForm] = useState({
    title: "Cinematic Hero Showreel",
    videoUrl: "",
    mobileVideoUrl: "",
    posterUrl: "",
    videoType: "video/mp4",
    playbackSettings: {
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true
    },
    overlayOpacity: 0.35,
    videoPosition: "center",
    playbackSpeed: 1.0,
    versionNotes: "",
    fileMetadata: {}
  });

  // Source selection modes: "upload" vs "url"
  const [desktopSourceMode, setDesktopSourceMode] = useState("upload");
  const [mobileSourceMode, setMobileSourceMode] = useState("upload");
  const [posterSourceMode, setPosterSourceMode] = useState("upload");

  // URL text inputs (for pasting YouTube/external link only)
  const [desktopUrlInput, setDesktopUrlInput] = useState("");
  const [mobileUrlInput, setMobileUrlInput] = useState("");
  const [posterUrlInput, setPosterUrlInput] = useState("");

  // Upload progress states
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [desktopProgress, setDesktopProgress] = useState(0);

  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [mobileProgress, setMobileProgress] = useState(0);

  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [posterProgress, setPosterProgress] = useState(0);

  // Preview interactive state
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [previewMuted, setPreviewMuted] = useState(true);
  const [showMockupText, setShowMockupText] = useState(false);
  const videoRef = useRef(null);

  // Hidden file inputs for replacing assets
  const desktopFileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);
  const posterFileInputRef = useRef(null);

  // Hero Slides state
  const [slidesList, setSlidesList] = useState([]);
  const [slidesLoading, setSlidesLoading] = useState(false);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [slideSaving, setSlideSaving] = useState(false);
  const [slideForm, setSlideForm] = useState({
    title: "",
    slideKey: "",
    eyebrow: "",
    subtitle: "",
    description: "",
    ctaText: "Start a Project",
    ctaLink: "/contact",
    mainImage: "",
    active: true
  });

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 6000);
  };

  // Determine if active asset is an uploaded file or an external URL
  const isDesktopUploaded = Boolean(form.videoUrl && form.videoUrl.startsWith("/uploads/"));
  const isDesktopUrl = Boolean(form.videoUrl && !form.videoUrl.startsWith("/uploads/"));

  const isMobileUploaded = Boolean(form.mobileVideoUrl && form.mobileVideoUrl.startsWith("/uploads/"));
  const isMobileUrl = Boolean(form.mobileVideoUrl && !form.mobileVideoUrl.startsWith("/uploads/"));

  const isPosterUploaded = Boolean(form.posterUrl && form.posterUrl.startsWith("/uploads/"));
  const isPosterUrl = Boolean(form.posterUrl && !form.posterUrl.startsWith("/uploads/"));

  // Load active and draft configurations
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/v1/admin/hero-video");
      if (res?.data) {
        setActiveConfig(res.data.active || null);
        const source = res.data.draft || res.data.active || res.data.default || {};
        const vUrl = source.videoUrl || "";
        const mUrl = source.mobileVideoUrl || "";
        const pUrl = source.posterUrl || "";

        setForm({
          id: source._id || source.id,
          title: source.title || "Cinematic Hero Showreel",
          videoUrl: vUrl,
          mobileVideoUrl: mUrl,
          posterUrl: pUrl,
          videoType: source.videoType || "video/mp4",
          playbackSettings: {
            autoplay: source.playbackSettings?.autoplay ?? true,
            muted: source.playbackSettings?.muted ?? true,
            loop: source.playbackSettings?.loop ?? true,
            playsInline: source.playbackSettings?.playsInline ?? true
          },
          overlayOpacity: typeof source.overlayOpacity === "number" ? source.overlayOpacity : 0.35,
          videoPosition: source.videoPosition || "center",
          playbackSpeed: source.playbackSpeed || 1.0,
          versionNotes: source.versionNotes || "",
          fileMetadata: source.fileMetadata || {}
        });

        // Set initial tab mode cleanly without polluting inputs with internal paths
        if (vUrl) {
          if (vUrl.startsWith("/uploads/")) {
            setDesktopSourceMode("upload");
            setDesktopUrlInput("");
          } else {
            setDesktopSourceMode("url");
            setDesktopUrlInput(vUrl);
          }
        }
        if (mUrl) {
          if (mUrl.startsWith("/uploads/")) {
            setMobileSourceMode("upload");
            setMobileUrlInput("");
          } else {
            setMobileSourceMode("url");
            setMobileUrlInput(mUrl);
          }
        }
        if (pUrl) {
          if (pUrl.startsWith("/uploads/")) {
            setPosterSourceMode("upload");
            setPosterUrlInput("");
          } else {
            setPosterSourceMode("url");
            setPosterUrlInput(pUrl);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load hero configuration:", err);
      showAlert("error", err.message || "Failed to load hero video configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load version history
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await apiFetch("/api/v1/admin/hero-video/history?limit=30");
      if (res?.data?.items) {
        setHistoryList(res.data.items);
      }
    } catch (err) {
      console.error("Failed to load version history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load hero slides
  const loadSlides = useCallback(async () => {
    try {
      setSlidesLoading(true);
      const res = await apiFetch("/api/v1/cms/hero-slides/admin");
      if (res?.data) {
        setSlidesList(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error("Failed to load hero slides:", err);
    } finally {
      setSlidesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConfig();
    loadSlides();
    loadHistory();
  }, [loadConfig, loadSlides, loadHistory]);

  // Keep HTML5 video tag playback speed synced with form state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = form.playbackSpeed;
    }
  }, [form.playbackSpeed, form.videoUrl, previewDevice]);

  // Apply URL input (YouTube, Vimeo, or Web Video URL)
  const handleApplyUrl = (type, urlToApply) => {
    if (!urlToApply || !urlToApply.trim()) {
      showAlert("error", "Please enter a valid video or image URL.");
      return;
    }
    const clean = urlToApply.trim();
    const ytId = getYouTubeId(clean);

    setForm((prev) => ({
      ...prev,
      ...(type === "desktop" ? { videoUrl: clean, videoType: ytId ? "video/youtube" : "video/mp4" } : {}),
      ...(type === "mobile" ? { mobileVideoUrl: clean } : {}),
      ...(type === "poster" ? { posterUrl: clean } : {})
    }));

    if (type === "desktop") setDesktopSourceMode("url");
    if (type === "mobile") setMobileSourceMode("url");
    if (type === "poster") setPosterSourceMode("url");

    if (ytId) {
      showAlert("success", `YouTube link recognized (ID: ${ytId}) and applied to ${type} video.`);
    } else {
      showAlert("success", `${type.charAt(0).toUpperCase() + type.slice(1)} URL applied to draft.`);
    }
  };

  // Handle Chunked File Upload
  const handleChunkedUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      if (type === "desktop") {
        setUploadingDesktop(true);
        setDesktopProgress(0);
      } else if (type === "mobile") {
        setUploadingMobile(true);
        setMobileProgress(0);
      } else if (type === "poster") {
        setUploadingPoster(true);
        setPosterProgress(0);
      }

      const onProgress = (pct) => {
        if (type === "desktop") setDesktopProgress(pct);
        if (type === "mobile") setMobileProgress(pct);
        if (type === "poster") setPosterProgress(pct);
      };

      const result = await uploadFileInChunks(file, "hero", onProgress);
      if (result?.url) {
        setForm((prev) => ({
          ...prev,
          ...(type === "desktop" ? { videoUrl: result.url, videoType: file.type || "video/mp4" } : {}),
          ...(type === "mobile" ? { mobileVideoUrl: result.url } : {}),
          ...(type === "poster" ? { posterUrl: result.url } : {}),
          fileMetadata: {
            ...(prev.fileMetadata || {}),
            [type]: {
              filename: result.filename || file.name,
              originalName: file.name,
              size: file.size,
              mimeType: file.type,
              uploadedAt: new Date().toISOString()
            }
          }
        }));

        if (type === "desktop") {
          setDesktopSourceMode("upload");
          setDesktopUrlInput("");
        }
        if (type === "mobile") {
          setMobileSourceMode("upload");
          setMobileUrlInput("");
        }
        if (type === "poster") {
          setPosterSourceMode("upload");
          setPosterUrlInput("");
        }

        showAlert("success", `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
      }
    } catch (err) {
      console.error(`Chunked upload error for ${type}:`, err);
      showAlert("error", err.message || `Failed to upload ${type}.`);
    } finally {
      if (type === "desktop") setUploadingDesktop(false);
      if (type === "mobile") setUploadingMobile(false);
      if (type === "poster") setUploadingPoster(false);
    }
  };

  // Remove an asset from draft
  const handleRemoveAsset = async (type) => {
    if (!confirm(`Are you sure you want to remove the ${type} asset from the draft?`)) {
      return;
    }
    try {
      await apiFetch(`/api/v1/admin/hero-video/asset/${type}`, {
        method: "DELETE"
      });
      setForm((prev) => ({
        ...prev,
        ...(type === "desktop" ? { videoUrl: "" } : {}),
        ...(type === "mobile" ? { mobileVideoUrl: "" } : {}),
        ...(type === "poster" ? { posterUrl: "" } : {})
      }));
      if (type === "desktop") setDesktopUrlInput("");
      if (type === "mobile") setMobileUrlInput("");
      if (type === "poster") setPosterUrlInput("");
      showAlert("success", `${type.charAt(0).toUpperCase() + type.slice(1)} asset removed from draft.`);
    } catch (err) {
      console.error(`Failed to remove ${type}:`, err);
      showAlert("error", err.message || `Failed to remove ${type} asset.`);
    }
  };

  // Save current form settings as draft
  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await apiFetch("/api/v1/admin/hero-video/draft", {
        method: "POST",
        body: JSON.stringify(form)
      });
      if (res?.data) {
        setForm((prev) => ({ ...prev, id: res.data._id || res.data.id }));
        showAlert("success", "Hero background draft and playback settings saved successfully!");
      }
    } catch (err) {
      console.error("Save draft error:", err);
      showAlert("error", err.message || "Failed to save draft settings.");
    } finally {
      setSaving(false);
    }
  };

  // Publish draft to live website
  const handlePublish = async () => {
    if (!form.videoUrl && !form.posterUrl) {
      showAlert("error", "Please configure at least a video URL/file or a fallback poster image before publishing.");
      return;
    }

    if (!confirm("Are you ready to publish this hero video configuration to the live homepage?")) {
      return;
    }

    try {
      setPublishing(true);
      await apiFetch("/api/v1/admin/hero-video/draft", {
        method: "POST",
        body: JSON.stringify(form)
      });

      const res = await apiFetch("/api/v1/admin/hero-video/publish", {
        method: "POST",
        body: JSON.stringify({ id: form.id })
      });

      if (res?.data) {
        setActiveConfig(res.data);
        showAlert("success", `Version ${res.data.version} is now LIVE on the homepage!`);
        await loadConfig();
        await loadHistory();
      }
    } catch (err) {
      console.error("Publish error:", err);
      showAlert("error", err.message || "Failed to publish hero configuration.");
    } finally {
      setPublishing(false);
    }
  };

  // Unpublish active video
  const handleUnpublish = async () => {
    if (!confirm("Are you sure you want to unpublish the active video? The homepage will revert to the minimal brand presentation.")) {
      return;
    }
    try {
      setUnpublishing(true);
      const res = await apiFetch("/api/v1/admin/hero-video/unpublish", {
        method: "POST",
        body: JSON.stringify({})
      });
      if (res?.success) {
        setActiveConfig(null);
        showAlert("success", "Active hero background video unpublished. Homepage reverted to minimal mode.");
        await loadConfig();
        await loadHistory();
      }
    } catch (err) {
      console.error("Unpublish error:", err);
      showAlert("error", err.message || "Failed to unpublish hero configuration.");
    } finally {
      setUnpublishing(false);
    }
  };

  // Restore a historical version
  const handleRestoreVersion = async (versionId, versionNumber) => {
    if (!confirm(`Restore Version ${versionNumber}? This will immediately publish it to the live homepage.`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch(`/api/v1/admin/hero-video/restore/${versionId}`, {
        method: "POST"
      });
      if (res?.data) {
        showAlert("success", `Version ${versionNumber} restored as Version ${res.data.version} and published!`);
        setActiveTab("manager");
        await loadConfig();
        await loadHistory();
      }
    } catch (err) {
      console.error("Restore version error:", err);
      showAlert("error", err.message || "Failed to restore version.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a historical version
  const handleDeleteVersion = async (versionId, versionNumber) => {
    if (!confirm(`Permanently delete Version ${versionNumber} from history?`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/admin/hero-video/${versionId}`, {
        method: "DELETE"
      });
      if (res?.success) {
        showAlert("success", `Version ${versionNumber} deleted from history.`);
        setHistoryList((list) => list.filter((item) => (item._id || item.id) !== versionId));
      }
    } catch (err) {
      console.error("Delete version error:", err);
      showAlert("error", err.message || "Failed to delete version.");
    }
  };

  // Slide CRUD handlers
  const openSlideModal = (slide = null) => {
    setEditingSlide(slide);
    if (slide) {
      setSlideForm({
        title: slide.title || "",
        slideKey: slide.slideKey || "",
        eyebrow: slide.eyebrow || "",
        subtitle: slide.subtitle || "",
        description: slide.description || "",
        ctaText: slide.ctaText || "Start a Project",
        ctaLink: slide.ctaLink || "/contact",
        mainImage: slide.mainImage || "",
        active: slide.active !== false
      });
    } else {
      setSlideForm({
        title: "",
        slideKey: `slide-${Date.now().toString(36)}`,
        eyebrow: "EDITORIAL POST-PRODUCTION",
        subtitle: "",
        description: "",
        ctaText: "Start a Project",
        ctaLink: "/contact",
        mainImage: "",
        active: true
      });
    }
    setIsSlideModalOpen(true);
  };

  const handleSaveSlide = async (e) => {
    e.preventDefault();
    if (!slideForm.title || !slideForm.slideKey) {
      showAlert("error", "Slide title and key are required.");
      return;
    }
    try {
      setSlideSaving(true);
      const isNew = !editingSlide;
      const targetId = editingSlide?._id || editingSlide?.id;
      const url = isNew
        ? "/api/v1/cms/hero-slides/admin"
        : `/api/v1/cms/hero-slides/admin/${targetId}`;
      const method = isNew ? "POST" : "PATCH";

      await apiFetch(url, {
        method,
        body: JSON.stringify(slideForm)
      });

      showAlert("success", `Hero slide ${isNew ? "created" : "updated"} successfully!`);
      setIsSlideModalOpen(false);
      loadSlides();
    } catch (err) {
      showAlert("error", err.message || "Failed to save hero slide.");
    } finally {
      setSlideSaving(false);
    }
  };

  const handleDeleteSlide = async (id) => {
    if (!confirm("Are you sure you want to delete this hero slide?")) return;
    try {
      await apiFetch(`/api/v1/cms/hero-slides/admin/${id}`, { method: "DELETE" });
      showAlert("success", "Hero slide deleted successfully.");
      loadSlides();
    } catch (err) {
      showAlert("error", err.message || "Failed to delete hero slide.");
    }
  };

  const handleToggleSlideActive = async (slide) => {
    const targetId = slide._id || slide.id;
    try {
      await apiFetch(`/api/v1/cms/hero-slides/admin/${targetId}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !slide.active })
      });
      loadSlides();
    } catch (err) {
      showAlert("error", err.message || "Failed to toggle slide status.");
    }
  };

  const handleMoveSlide = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slidesList.length) return;
    const reordered = [...slidesList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setSlidesList(reordered);
    try {
      const items = reordered.map((s, idx) => ({ id: s._id || s.id, order: idx + 1 }));
      await apiFetch("/api/v1/cms/hero-slides/admin/reorder", {
        method: "PUT",
        body: JSON.stringify({ items })
      });
      showAlert("success", "Slide ordering updated.");
    } catch (err) {
      showAlert("error", err.message || "Failed to reorder slides.");
      loadSlides();
    }
  };

  // Preview source determination
  const currentVideoSrc = previewDevice === "mobile" && form.mobileVideoUrl
    ? form.mobileVideoUrl
    : form.videoUrl;
  const currentYouTubeId = getYouTubeId(currentVideoSrc);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sage-muted">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
          <p className="text-sm font-medium">Loading Hero Background Video Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-left">
      {/* ================= 1. TOP HEADER & GLOBAL ACTIONS ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-emerald-950/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
              Hero Background Video Manager
            </h1>
            {activeConfig?.videoUrl ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-200 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                Live: v{activeConfig.version}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                Minimal Mode (No Video Active)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-sage-muted max-w-2xl">
            Configure homepage video footage or YouTube background streaming, preview text readability with real-time contrast simulation, and publish live to production.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {activeConfig && (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={unpublishing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
            >
              {unpublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Unpublish Active
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-xs font-semibold text-emerald-950 shadow-2xs transition hover:bg-emerald-50/60 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-emerald-700" />}
            Save Draft
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-950 disabled:opacity-50 cursor-pointer"
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publish to Live Website
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-3.5 text-xs sm:text-sm font-medium transition ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-700 shrink-0" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* ================= 2. NAVIGATION TABS ================= */}
      <div className="flex border-b border-emerald-950/10 gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("manager")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === "manager"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Background Video Studio
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("slides")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === "slides"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <Layers className="h-4 w-4" />
          Hero Slides &amp; Narrative ({slidesList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === "history"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <History className="h-4 w-4" />
          Version History ({historyList.length})
        </button>
      </div>

      {/* ================= TAB 1: BACKGROUND VIDEO STUDIO ================= */}
      {activeTab === "manager" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* ================= LEFT COLUMN: ASSET CONFIGURATION (5 COLS) ================= */}
          <div className="space-y-5 lg:col-span-5">
            {/* 1. Desktop Background Video Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Desktop Background Video</h3>
                    <p className="text-[11px] text-sage-muted">Main hero background video for desktop visitors</p>
                  </div>
                </div>

                {form.videoUrl ? (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-200">
                    {getYouTubeId(form.videoUrl) ? "YouTube" : "Configured"}
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    Not Set
                  </span>
                )}
              </div>

              {/* Source Switcher: Upload File vs YouTube / External Link */}
              <div className="flex rounded-xl bg-gray-100/80 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDesktopSourceMode("upload")}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    desktopSourceMode === "upload"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-sage-muted hover:text-emerald-950"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Upload Video File</span>
                  {isDesktopUploaded && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopSourceMode("url")}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    desktopSourceMode === "url"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-sage-muted hover:text-emerald-950"
                  }`}
                >
                  <Link className="h-3.5 w-3.5 text-emerald-700" />
                  <span>YouTube / Web URL</span>
                  {isDesktopUrl && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-0.5" />}
                </button>
              </div>

              {/* Mode A: Upload File */}
              {desktopSourceMode === "upload" && (
                <div className="space-y-3">
                  {isDesktopUploaded ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800 shrink-0">
                            <FileVideo className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-emerald-950 truncate" title={form.videoUrl}>
                              {form.fileMetadata?.desktop?.originalName ||
                                form.fileMetadata?.desktop?.filename ||
                                form.videoUrl.split("/").pop()}
                            </p>
                            <p className="text-[11px] text-emerald-800/80 font-mono mt-0.5">
                              {form.fileMetadata?.desktop?.size ? formatBytes(form.fileMetadata.desktop.size) : "Video Asset"} &bull; Neon PostgreSQL BYTEA
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => desktopFileInputRef.current?.click()}
                            className="rounded-lg border border-emerald-950/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-50 transition shadow-2xs cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAsset("desktop")}
                            className="rounded-lg border border-red-200 bg-red-50/80 p-1 text-red-600 hover:bg-red-100 transition cursor-pointer"
                            title="Remove Video"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-sage-muted">
                        Stored directly in Neon PostgreSQL chunked BYTEA storage. Streams smoothly with HTTP 206 range requests.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-5 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                        <Upload className="h-6 w-6 text-emerald-700/60 mb-2" />
                        <span className="text-xs font-semibold text-emerald-950">
                          {uploadingDesktop
                            ? `Uploading Video (${Math.round(desktopProgress * 100)}%)...`
                            : "Click or Drag to Upload Video File"}
                        </span>
                        {uploadingDesktop ? (
                          <div className="w-48 bg-emerald-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div
                              className="bg-emerald-700 h-full transition-all duration-300"
                              style={{ width: `${desktopProgress * 100}%` }}
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-sage-muted mt-1">
                            Supports high-res MP4, MOV, WebM with parallel chunked upload
                          </span>
                        )}
                        <input
                          ref={desktopFileInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm"
                          onChange={(e) => handleChunkedUpload(e, "desktop")}
                          disabled={uploadingDesktop}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: Paste Link */}
              {desktopSourceMode === "url" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                      <Youtube className="h-3.5 w-3.5 text-red-600" />
                      Paste YouTube, Vimeo or MP4 URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. https://youtu.be/TtsdZnNNEII or .mp4 link"
                        value={desktopUrlInput}
                        onChange={(e) => setDesktopUrlInput(e.target.value)}
                        className="flex-1 rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyUrl("desktop", desktopUrlInput)}
                        className="rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-950 transition shrink-0 cursor-pointer"
                      >
                        Apply Link
                      </button>
                    </div>
                    <p className="text-[11px] text-sage-muted mt-1.5">
                      YouTube URLs are automatically streamed without ads, looping continuously with muted background playback.
                    </p>
                  </div>

                  {isDesktopUrl && (
                    <div className="rounded-xl border border-emerald-950/10 bg-emerald-50/40 p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        {getYouTubeId(form.videoUrl) ? (
                          <Youtube className="h-4 w-4 text-red-600 shrink-0" />
                        ) : (
                          <Link className="h-4 w-4 text-emerald-700 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px] font-mono text-[11px] text-emerald-950" title={form.videoUrl}>
                          {form.videoUrl}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset("desktop")}
                        className="rounded-lg border border-red-200 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition shrink-0 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Mobile Video (Optional) Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Mobile Video (Optional)</h3>
                    <p className="text-[11px] text-sage-muted">Vertical 9:16 portrait cut served to mobile handsets</p>
                  </div>
                </div>

                {form.mobileVideoUrl ? (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-200">
                    Configured
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    Optional
                  </span>
                )}
              </div>

              {/* Source Switcher */}
              <div className="flex rounded-xl bg-gray-100/80 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileSourceMode("upload")}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mobileSourceMode === "upload"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-sage-muted hover:text-emerald-950"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Upload 9:16 File</span>
                  {isMobileUploaded && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSourceMode("url")}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mobileSourceMode === "url"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-sage-muted hover:text-emerald-950"
                  }`}
                >
                  <Link className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Paste Web URL</span>
                  {isMobileUrl && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-0.5" />}
                </button>
              </div>

              {mobileSourceMode === "upload" && (
                <div className="space-y-3">
                  {isMobileUploaded ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Smartphone className="h-4 w-4 text-emerald-800 shrink-0" />
                          <span className="text-xs font-semibold text-emerald-950 truncate" title={form.mobileVideoUrl}>
                            {form.fileMetadata?.mobile?.originalName || form.mobileVideoUrl.split("/").pop()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => mobileFileInputRef.current?.click()}
                            className="rounded-lg border border-emerald-950/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-50 transition shadow-2xs cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAsset("mobile")}
                            className="rounded-lg border border-red-200 bg-red-50/80 p-1 text-red-600 hover:bg-red-100 transition cursor-pointer"
                            title="Remove Mobile Video"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-4 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                        <Smartphone className="h-5 w-5 text-emerald-700/60 mb-1.5" />
                        <span className="text-xs font-semibold text-emerald-950">
                          {uploadingMobile
                            ? `Uploading (${Math.round(mobileProgress * 100)}%)...`
                            : "Upload 9:16 Portrait Video"}
                        </span>
                        {uploadingMobile && (
                          <div className="w-44 bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className="bg-emerald-700 h-full transition-all duration-300"
                              style={{ width: `${mobileProgress * 100}%` }}
                            />
                          </div>
                        )}
                        <input
                          ref={mobileFileInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm"
                          onChange={(e) => handleChunkedUpload(e, "mobile")}
                          disabled={uploadingMobile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {mobileSourceMode === "url" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... direct .mp4 URL"
                      value={mobileUrlInput}
                      onChange={(e) => setMobileUrlInput(e.target.value)}
                      className="flex-1 rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyUrl("mobile", mobileUrlInput)}
                      className="rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-950 transition shrink-0 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {isMobileUrl && (
                    <div className="rounded-xl border border-emerald-950/10 bg-emerald-50/40 p-2.5 flex items-center justify-between text-xs">
                      <span className="truncate max-w-[200px] font-mono text-[11px] text-emerald-950" title={form.mobileVideoUrl}>
                        {form.mobileVideoUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset("mobile")}
                        className="rounded-lg border border-red-200 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition shrink-0 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Fallback Poster Image Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Fallback Poster Image</h3>
                    <p className="text-[11px] text-sage-muted">Displayed while buffering or if motion is disabled</p>
                  </div>
                </div>

                {form.posterUrl ? (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-200">
                    Configured
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    Optional
                  </span>
                )}
              </div>

              {/* Source Switcher */}
              <div className="flex rounded-xl bg-gray-100/80 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPosterSourceMode("upload")}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    posterSourceMode === "upload"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-sage-muted hover:text-emerald-950"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Upload Poster Image</span>
                  {isPosterUploaded && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setPosterSourceMode("url")}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    posterSourceMode === "url"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-sage-muted hover:text-emerald-950"
                  }`}
                >
                  <Link className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Image URL</span>
                  {isPosterUrl && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-0.5" />}
                </button>
              </div>

              {posterSourceMode === "upload" && (
                <div className="space-y-3">
                  {isPosterUploaded ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={mediaUrl(form.posterUrl)}
                          alt="Poster preview"
                          className="h-10 w-14 rounded-lg object-cover border border-emerald-900/10 shrink-0 bg-zinc-800"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-950 truncate" title={form.posterUrl}>
                            {form.fileMetadata?.poster?.originalName || form.posterUrl.split("/").pop()}
                          </p>
                          <p className="text-[10px] text-sage-muted">Fallback Poster</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => posterFileInputRef.current?.click()}
                          className="rounded-lg border border-emerald-950/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-50 transition shadow-2xs cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset("poster")}
                          className="rounded-lg border border-red-200 bg-red-50/80 p-1 text-red-600 hover:bg-red-100 transition cursor-pointer"
                          title="Remove Poster"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-4 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                        <ImageIcon className="h-5 w-5 text-emerald-700/60 mb-1.5" />
                        <span className="text-xs font-semibold text-emerald-950">
                          {uploadingPoster
                            ? `Uploading (${Math.round(posterProgress * 100)}%)...`
                            : "Upload Fallback Poster Image"}
                        </span>
                        {uploadingPoster && (
                          <div className="w-44 bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className="bg-emerald-700 h-full transition-all duration-300"
                              style={{ width: `${posterProgress * 100}%` }}
                            />
                          </div>
                        )}
                        <input
                          ref={posterFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                          onChange={(e) => handleChunkedUpload(e, "poster")}
                          disabled={uploadingPoster}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {posterSourceMode === "url" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... image link"
                      value={posterUrlInput}
                      onChange={(e) => setPosterUrlInput(e.target.value)}
                      className="flex-1 rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyUrl("poster", posterUrlInput)}
                      className="rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-950 transition shrink-0 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {isPosterUrl && (
                    <div className="rounded-xl border border-emerald-950/10 bg-emerald-50/40 p-2.5 flex items-center justify-between text-xs">
                      <span className="truncate max-w-[200px] font-mono text-[11px] text-emerald-950" title={form.posterUrl}>
                        {form.posterUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset("poster")}
                        className="rounded-lg border border-red-200 bg-red-50/70 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition shrink-0 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Version Annotation / Notes Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 sm:p-5 shadow-2xs space-y-2">
              <label className="block text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-emerald-700" />
                Release Notes / Version Annotation
              </label>
              <input
                type="text"
                placeholder="e.g. Master showreel with 35% balanced contrast overlay"
                value={form.versionNotes}
                onChange={(e) => setForm((p) => ({ ...p, versionNotes: e.target.value }))}
                className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
              />
              <p className="text-[11px] text-sage-muted">
                Saved with the draft and recorded into the version history upon publishing.
              </p>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: LIVE SIMULATOR & REAL-TIME CONTROLS (7 COLS) ================= */}
          <div className="space-y-5 lg:col-span-7">
            {/* Live Readability Simulator Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Simulator Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5 text-emerald-700" />
                    Live Readability Simulator
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-200">
                    {previewDevice === "desktop" ? "16:9 Desktop" : "9:16 Mobile"}
                  </span>
                  {currentYouTubeId && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                      <Youtube className="h-3 w-3" /> YouTube Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Toggle Mockup Typography */}
                  <button
                    type="button"
                    onClick={() => setShowMockupText(!showMockupText)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition border cursor-pointer ${
                      showMockupText
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-transparent hover:text-emerald-950"
                    }`}
                    title={showMockupText ? "Hide text overlay to inspect video" : "Show text overlay to check contrast"}
                  >
                    {showMockupText ? <Eye className="h-3.5 w-3.5 text-emerald-700" /> : <EyeOff className="h-3.5 w-3.5" />}
                    <span>Text Overlay</span>
                  </button>

                  {/* Device toggle */}
                  <div className="inline-flex rounded-xl border border-emerald-950/10 p-0.5 bg-gray-100/80">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        previewDevice === "desktop"
                          ? "bg-white text-emerald-950 shadow-2xs"
                          : "text-sage-muted hover:text-emerald-950"
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        previewDevice === "mobile"
                          ? "bg-white text-emerald-950 shadow-2xs"
                          : "text-sage-muted hover:text-emerald-950"
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      Mobile
                    </button>
                  </div>

                  {/* Audio preview toggle */}
                  {!currentYouTubeId && (
                    <button
                      type="button"
                      onClick={() => setPreviewMuted(!previewMuted)}
                      className="rounded-xl border border-emerald-950/10 p-1.5 text-sage-muted hover:text-emerald-950 transition cursor-pointer bg-white"
                      title={previewMuted ? "Unmute Preview Audio" : "Mute Preview Audio"}
                    >
                      {previewMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-800" />}
                    </button>
                  )}
                </div>
              </div>

              {/* The Simulated Stage Frame */}
              <div className="flex justify-center bg-zinc-950 rounded-2xl p-2 sm:p-4 overflow-hidden border border-zinc-900 shadow-inner">
                <div
                  className={`relative overflow-hidden rounded-xl border border-white/10 transition-all duration-300 flex items-center justify-center ${
                    previewDevice === "desktop"
                      ? "aspect-video w-full max-w-[720px]"
                      : "aspect-[9/16] w-full max-w-[270px]"
                  }`}
                >
                  {/* Layer 1: Background Media Player */}
                  {currentYouTubeId ? (
                    <iframe
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0"
                      style={{
                        width: "max(100%, 177.78vh)",
                        height: "max(100%, 56.25vw)",
                        minWidth: "100%",
                        minHeight: "100%"
                      }}
                      src={`https://www.youtube-nocookie.com/embed/${currentYouTubeId}?autoplay=1&mute=1&loop=1&playlist=${currentYouTubeId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&playsinline=1`}
                      title="Hero Readability Simulator"
                      allow="autoplay; encrypted-media"
                    />
                  ) : currentVideoSrc ? (
                    <video
                      ref={videoRef}
                      key={`${currentVideoSrc}-${previewDevice}`}
                      src={mediaUrl(currentVideoSrc)}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: form.videoPosition }}
                      autoPlay={form.playbackSettings.autoplay}
                      muted={previewMuted}
                      loop={form.playbackSettings.loop}
                      playsInline={form.playbackSettings.playsInline}
                      poster={form.posterUrl ? mediaUrl(form.posterUrl) : undefined}
                    />
                  ) : form.posterUrl ? (
                    <img
                      src={mediaUrl(form.posterUrl)}
                      alt="Poster"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: form.videoPosition }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 p-4 text-center">
                      <FileVideo className="h-10 w-10 mb-2 opacity-40 text-emerald-400" />
                      <p className="text-xs font-semibold text-zinc-400">No Video Asset Selected</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Upload a video file or paste a link on the left</p>
                    </div>
                  )}

                  {/* Layer 2: Real-time Darkness Contrast Overlay */}
                  <div
                    className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150"
                    style={{ opacity: form.overlayOpacity }}
                  />

                  {/* Layer 3: Simulated Hero Typography (Can be toggled) */}
                  {showMockupText && (
                    <div className="relative z-10 px-4 text-center select-none pointer-events-none transition-opacity duration-200">
                      <div className="flex items-baseline justify-center gap-1.5">
                        <span
                          className="text-white/80 font-normal"
                          style={{
                            fontFamily: "'Alex Brush', cursive",
                            fontSize: previewDevice === "desktop" ? "clamp(1.5rem, 3.2vw, 2.6rem)" : "1.4rem"
                          }}
                        >
                          You Shoot.
                        </span>
                        <span
                          className="font-extrabold uppercase tracking-wide text-white"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: previewDevice === "desktop" ? "clamp(1.3rem, 2.8vw, 2.2rem)" : "1.2rem"
                          }}
                        >
                          WE EDIT.
                        </span>
                      </div>

                      <h2
                        className="mt-1 font-serif text-white/95 tracking-wide"
                        style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: previewDevice === "desktop" ? "1.2rem" : "0.95rem"
                        }}
                      >
                        The Editing Table
                      </h2>
                    </div>
                  )}
                </div>
              </div>

              {/* Status info strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-sage-muted pt-1">
                <span>
                  Contrast Status:{" "}
                  <strong className={form.overlayOpacity >= 0.3 ? "text-emerald-800" : "text-amber-800"}>
                    {form.overlayOpacity >= 0.3 ? "AAA Compliant (High Readability)" : "AA (Moderate Contrast)"}
                  </strong>
                </span>
                <span>
                  Focal Point: <strong className="text-emerald-950 font-medium capitalize">{form.videoPosition}</strong> &bull; Velocity:{" "}
                  <strong className="text-emerald-950 font-medium">{form.playbackSpeed}x</strong>
                </span>
              </div>
            </div>

            {/* ================= REAL-TIME CONTRAST & PLAYBACK CONTROLS ================= */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-800" />
                  <h3 className="text-sm font-semibold text-emerald-950">
                    Live Contrast &amp; Playback Tuning
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {Math.round(form.overlayOpacity * 100)}% Darkness
                </span>
              </div>

              {/* Darkness Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-700" />
                    Darkness Overlay Opacity
                  </span>
                  <span className="text-[11px] text-sage-muted">
                    Adjusts black tint to guarantee white text contrast
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={form.overlayOpacity}
                  onChange={(e) => setForm((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-800 cursor-pointer h-2 bg-gray-200 rounded-lg"
                />

                {/* Quick Contrast Presets */}
                <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                  {CONTRAST_PRESETS.map((preset) => {
                    const isSelected = Math.abs(form.overlayOpacity - preset.value) < 0.02;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, overlayOpacity: preset.value }))}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border cursor-pointer ${
                          isSelected
                            ? "bg-emerald-900 text-white border-emerald-900 shadow-2xs"
                            : "bg-white text-emerald-950 border-emerald-950/15 hover:bg-emerald-50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Focal Alignment & Playback Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-emerald-950/5">
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1.5">
                    Focal Alignment
                  </label>
                  <select
                    value={form.videoPosition}
                    onChange={(e) => setForm((p) => ({ ...p, videoPosition: e.target.value }))}
                    className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 focus:border-emerald-800 focus:outline-none cursor-pointer"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1.5">
                    Playback Velocity
                  </label>
                  <select
                    value={form.playbackSpeed}
                    onChange={(e) => setForm((p) => ({ ...p, playbackSpeed: parseFloat(e.target.value) }))}
                    className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 focus:border-emerald-800 focus:outline-none cursor-pointer"
                  >
                    {PLAYBACK_SPEED_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Playback Toggles */}
              <div className="pt-3 border-t border-emerald-950/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-emerald-950/10 hover:bg-emerald-50/40 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.playbackSettings.autoplay}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        playbackSettings: { ...p.playbackSettings, autoplay: e.target.checked }
                      }))
                    }
                    className="h-4 w-4 rounded accent-emerald-800 cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-emerald-950">Autoplay</p>
                    <p className="text-[10px] text-sage-muted">Plays on view</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-emerald-950/10 hover:bg-emerald-50/40 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.playbackSettings.muted}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        playbackSettings: { ...p.playbackSettings, muted: e.target.checked }
                      }))
                    }
                    className="h-4 w-4 rounded accent-emerald-800 cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-emerald-950">Muted</p>
                    <p className="text-[10px] text-sage-muted">Browser standard</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl border border-emerald-950/10 hover:bg-emerald-50/40 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.playbackSettings.loop}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        playbackSettings: { ...p.playbackSettings, loop: e.target.checked }
                      }))
                    }
                    className="h-4 w-4 rounded accent-emerald-800 cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-emerald-950">Continuous Loop</p>
                    <p className="text-[10px] text-sage-muted">Seamless replay</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: HERO SLIDES & NARRATIVE ================= */}
      {activeTab === "slides" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-950/10 bg-white/90 shadow-2xs">
            <div>
              <h2 className="font-serif text-xl font-bold text-emerald-950">Editorial Hero Slides</h2>
              <p className="text-xs text-sage-muted mt-0.5">
                Manage narrative slides, headings, background imagery, and calls to action for the homepage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openSlideModal(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-950 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Hero Slide
            </button>
          </div>

          {slidesLoading ? (
            <div className="p-12 text-center text-xs text-sage-muted flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
              Loading hero slides...
            </div>
          ) : slidesList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-sage-border bg-white/60">
              <Layers className="h-8 w-8 text-sage-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-forest">No Hero Slides Configured</p>
              <p className="text-xs text-sage-muted mt-1 max-w-sm mx-auto">
                Create your first narrative slide to showcase your studio's story and call to action.
              </p>
              <button
                type="button"
                onClick={() => openSlideModal(null)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-semibold hover:bg-emerald-950 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Slide
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slidesList.map((slide, index) => {
                const slideId = slide._id || slide.id;
                return (
                  <div
                    key={slideId || index}
                    className="rounded-2xl border border-emerald-950/10 bg-white/90 shadow-2xs overflow-hidden flex flex-col justify-between"
                  >
                    {slide.mainImage ? (
                      <div className="relative aspect-video w-full bg-forest overflow-hidden">
                        <img
                          src={mediaUrl(slide.mainImage)}
                          alt={slide.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="rounded-full bg-forest/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              slide.active !== false
                                ? "bg-emerald-500/90 text-white"
                                : "bg-warm-grey/80 text-white"
                            }`}
                          >
                            {slide.active !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-sage-secondary/40 flex items-center justify-center text-sage-muted text-xs font-medium">
                        No Image Attached
                      </div>
                    )}

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {slide.eyebrow && (
                          <p className="text-[10px] font-bold text-site uppercase tracking-wider mb-1">
                            {slide.eyebrow}
                          </p>
                        )}
                        <h3 className="font-serif text-lg font-semibold text-forest leading-snug line-clamp-1">
                          {slide.title}
                        </h3>
                        {slide.subtitle && (
                          <p className="text-xs text-sage-muted line-clamp-2 mt-1">{slide.subtitle}</p>
                        )}
                        {slide.ctaText && (
                          <p className="text-[11px] font-semibold text-site mt-2">
                            CTA: {slide.ctaText} → {slide.ctaLink || "/contact"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-sage-border/60">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(index, "up")}
                            disabled={index === 0}
                            className="p-1 rounded-lg border border-sage-border text-forest hover:bg-sage-secondary disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(index, "down")}
                            disabled={index === slidesList.length - 1}
                            className="p-1 rounded-lg border border-sage-border text-forest hover:bg-sage-secondary disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSlideActive(slide)}
                            className={`p-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                              slide.active !== false
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                : "border-warm-grey/30 text-sage-muted hover:text-forest"
                            }`}
                            title={slide.active !== false ? "Deactivate" : "Activate"}
                          >
                            {slide.active !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openSlideModal(slide)}
                            className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-emerald-700 hover:text-site transition cursor-pointer"
                            title="Edit Slide"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlide(slideId)}
                            className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete Slide"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add / Edit Slide Modal */}
          {isSlideModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-3 sm:p-6 backdrop-blur-md">
              <div className="relative max-w-xl w-full max-h-[92vh] rounded-3xl border border-sage-light/40 bg-sage-card shadow-deep flex flex-col overflow-hidden my-auto">
                <div className="flex items-center justify-between p-5 border-b border-sage-border/60 bg-sage-card shrink-0">
                  <h2 className="font-serif text-2xl text-forest">
                    {editingSlide ? "Edit Hero Slide" : "Add Hero Slide"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsSlideModalOpen(false)}
                    className="text-sage-muted hover:text-forest p-1.5 rounded-full hover:bg-sage-secondary transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveSlide} className="flex flex-col flex-1 overflow-hidden min-h-0">
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar bg-sage-card text-left">
                    <MediaUploadDropzone
                      folder="hero"
                      value={slideForm.mainImage}
                      onChange={(url) => setSlideForm({ ...slideForm, mainImage: url })}
                      label="Slide Cover Image / Video"
                      description="Upload background imagery for this narrative slide"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                          Slide Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={slideForm.title}
                          onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                          className="field-luxury text-sm font-serif"
                          placeholder="e.g. Masterful Wedding Cinema"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                          Slide Key / ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={slideForm.slideKey}
                          onChange={(e) => setSlideForm({ ...slideForm, slideKey: e.target.value })}
                          className="field-luxury text-sm font-mono"
                          placeholder="e.g. wedding-cinema-slide"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                          Eyebrow Tag
                        </label>
                        <input
                          type="text"
                          value={slideForm.eyebrow}
                          onChange={(e) => setSlideForm({ ...slideForm, eyebrow: e.target.value })}
                          className="field-luxury text-xs"
                          placeholder="e.g. EDITORIAL POST-PRODUCTION"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                          Subtitle
                        </label>
                        <input
                          type="text"
                          value={slideForm.subtitle}
                          onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                          className="field-luxury text-xs"
                          placeholder="e.g. Tailored color science & grading"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                          CTA Button Text
                        </label>
                        <input
                          type="text"
                          value={slideForm.ctaText}
                          onChange={(e) => setSlideForm({ ...slideForm, ctaText: e.target.value })}
                          className="field-luxury text-xs"
                          placeholder="Start a Project"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                          CTA Target Link
                        </label>
                        <input
                          type="text"
                          value={slideForm.ctaLink}
                          onChange={(e) => setSlideForm({ ...slideForm, ctaLink: e.target.value })}
                          className="field-luxury text-xs font-mono"
                          placeholder="/contact"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                        Slide Description / Narrative
                      </label>
                      <textarea
                        rows={3}
                        value={slideForm.description}
                        onChange={(e) => setSlideForm({ ...slideForm, description: e.target.value })}
                        className="field-luxury text-xs"
                        placeholder="Detailed editorial narrative for this slide..."
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="slideActiveToggle"
                        checked={slideForm.active}
                        onChange={(e) => setSlideForm({ ...slideForm, active: e.target.checked })}
                        className="rounded border-sage-border text-emerald-800 focus:ring-emerald-800 h-4 w-4"
                      />
                      <label htmlFor="slideActiveToggle" className="text-xs font-semibold text-forest cursor-pointer">
                        Active &amp; Visible in Homepage Narrative
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-sage-border/60 bg-sage-card/95 backdrop-blur-sm shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSlideModalOpen(false)}
                      className="px-5 py-2.5 rounded-full border border-sage-border text-xs font-semibold text-forest hover:border-emerald-800 transition cursor-pointer bg-sage-card"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={slideSaving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-900 text-white text-xs font-semibold hover:bg-emerald-950 transition shadow-sage cursor-pointer disabled:opacity-50"
                    >
                      {slideSaving ? "Saving..." : "Save Hero Slide"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: VERSION HISTORY ================= */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-emerald-950/10 bg-white/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-semibold text-emerald-950">Historical Configurations &amp; Rollbacks</h3>
              <p className="text-xs text-sage-muted">
                Inspect every published revision, audit changes, and restore any previous version with one click.
              </p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-950/15 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-50/50 transition cursor-pointer shadow-2xs"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="py-12 text-center text-xs text-sage-muted">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-800 mb-2" />
                Loading version history...
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-12 text-center text-xs text-sage-muted">
                No past versions recorded yet. As you publish hero configurations, version snapshots will appear here.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-950/10 text-sage-muted uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Ver</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Title / Notes</th>
                    <th className="py-3 px-3">Assets</th>
                    <th className="py-3 px-3">Darkness</th>
                    <th className="py-3 px-3">Published Date</th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/5">
                  {historyList.map((item) => {
                    const itemId = item._id || item.id;
                    const isItemPublished = item.status === "published";
                    const isYt = getYouTubeId(item.videoUrl);
                    return (
                      <tr key={itemId} className="hover:bg-emerald-50/30 transition">
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-950">
                          v{item.version}
                        </td>
                        <td className="py-3.5 px-3">
                          {isItemPublished ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Active Live
                            </span>
                          ) : item.status === "draft" ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-emerald-950">{item.title || "Untitled"}</p>
                          {item.versionNotes && (
                            <p className="text-[11px] text-sage-muted truncate max-w-xs">{item.versionNotes}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            {item.videoUrl && (
                              <a
                                href={isYt ? item.videoUrl : mediaUrl(item.videoUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline"
                              >
                                {isYt ? <Youtube className="h-3 w-3 text-red-600" /> : <Monitor className="h-3 w-3" />}
                                {isYt ? "YouTube" : "Video"}
                              </a>
                            )}
                            {item.mobileVideoUrl && (
                              <a
                                href={mediaUrl(item.mobileVideoUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline"
                              >
                                <Smartphone className="h-3 w-3" /> Mobile
                              </a>
                            )}
                            {item.posterUrl && (
                              <a
                                href={mediaUrl(item.posterUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline"
                              >
                                <ImageIcon className="h-3 w-3" /> Poster
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-emerald-950">
                          {Math.round((item.overlayOpacity ?? 0.35) * 100)}%
                        </td>
                        <td className="py-3.5 px-3 text-sage-muted">
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-3 text-sage-muted">
                          {item.updatedBy || item.createdBy || "Admin"}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isItemPublished && (
                              <button
                                type="button"
                                onClick={() => handleRestoreVersion(itemId, item.version)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-900/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-50/60 transition shadow-2xs cursor-pointer"
                                title="Restore and Publish Version"
                              >
                                <RotateCcw className="h-3 w-3 text-emerald-700" />
                                Restore
                              </button>
                            )}
                            {!isItemPublished && (
                              <button
                                type="button"
                                onClick={() => handleDeleteVersion(itemId, item.version)}
                                className="rounded-lg border border-red-200 bg-red-50/30 p-1 text-red-600 hover:bg-red-100/60 transition cursor-pointer"
                                title="Delete Version Snapshot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

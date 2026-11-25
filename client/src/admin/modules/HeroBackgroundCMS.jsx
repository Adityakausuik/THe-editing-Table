/* global FormData, confirm, console */
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileVideo,
  History,
  Image,
  Layers,
  Link,
  Loader2,
  Monitor,
  Play,
  RotateCcw,
  Save,
  Send,
  Sliders,
  Smartphone,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  XCircle,
  Youtube
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import { uploadFileInChunks } from "../components/MediaUploadDropzone.jsx";

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

export function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch) return shortMatch[1];
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) return watchMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) return embedMatch[1];
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function HeroBackgroundCMS() {
  const [activeTab, setActiveTab] = useState("manager"); // "manager" | "history"
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

  // URL inputs state
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
  const videoRef = useRef(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 6000);
  };

  // Load active and draft configurations
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/v1/admin/hero-video");
      if (res?.data) {
        setActiveConfig(res.data.active || null);
        const source = res.data.draft || res.data.active || res.data.default || {};
        setForm({
          id: source._id || source.id,
          title: source.title || "Cinematic Hero Showreel",
          videoUrl: source.videoUrl || "",
          mobileVideoUrl: source.mobileVideoUrl || "",
          posterUrl: source.posterUrl || "",
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
        if (source.videoUrl) setDesktopUrlInput(source.videoUrl);
        if (source.mobileVideoUrl) setMobileUrlInput(source.mobileVideoUrl);
        if (source.posterUrl) setPosterUrlInput(source.posterUrl);
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

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Adjust preview video speed when form.playbackSpeed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = form.playbackSpeed || 1.0;
    }
  }, [form.playbackSpeed, form.videoUrl, form.mobileVideoUrl, previewDevice]);

  // Handle URL application (e.g. YouTube link or direct video link)
  const handleApplyUrl = (type, urlToApply) => {
    if (!urlToApply || !urlToApply.trim()) {
      showAlert("error", "Please enter a valid video or image URL.");
      return;
    }
    const clean = urlToApply.trim();
    const ytId = getYouTubeId(clean);

    setForm((prev) => {
      const updated = {
        ...prev,
        ...(type === "desktop" ? { videoUrl: clean, videoType: ytId ? "video/youtube" : "video/mp4" } : {}),
        ...(type === "mobile" ? { mobileVideoUrl: clean } : {}),
        ...(type === "poster" ? { posterUrl: clean } : {})
      };
      return updated;
    });

    if (ytId) {
      showAlert("success", `YouTube link recognized (ID: ${ytId}) and applied to ${type} video! Click "Save Draft" or "Publish".`);
    } else {
      showAlert("success", `${type.charAt(0).toUpperCase() + type.slice(1)} URL applied to draft!`);
    }
  };

  // Handle Chunked File Upload (avoiding Vercel serverless 4.5MB payload limit)
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
        if (type === "desktop") setDesktopUrlInput(result.url);
        if (type === "mobile") setMobileUrlInput(result.url);
        if (type === "poster") setPosterUrlInput(result.url);
        showAlert("success", `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded and added to draft!`);
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
      // Ensure latest changes are committed to draft first
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

  // Current preview source and YouTube detection
  const currentVideoSrc = previewDevice === "mobile" && form.mobileVideoUrl
    ? form.mobileVideoUrl
    : form.videoUrl;
  const currentYouTubeId = getYouTubeId(currentVideoSrc);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sage-muted">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
          <p className="text-sm font-medium">Loading Hero Video Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-emerald-950/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
              Hero Background Video Manager
            </h1>
            {activeConfig?.videoUrl ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-900 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                Live: v{activeConfig.version}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                Minimal Mode (No Video Active)
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-sage-muted max-w-2xl">
            Upload footage or paste a YouTube / video link, preview text contrast with live darkness simulation, fine-tune playback speed &amp; focal alignment, and publish live to production.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {activeConfig && (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={unpublishing}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/60 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100/80 disabled:opacity-50"
            >
              {unpublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Unpublish Active
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-900/20 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50/50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-emerald-700" />}
            Save Draft
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-950 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publish to Live Website
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium transition ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-emerald-950/10">
        <button
          type="button"
          onClick={() => setActiveTab("manager")}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "manager"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Studio &amp; Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "history"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <History className="h-4 w-4" />
          Version History ({historyList.length > 0 ? historyList.length : "..."})
        </button>
      </div>

      {/* TAB 1: Studio & Settings */}
      {activeTab === "manager" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Upload Dropzones & Controls (5 Cols) */}
          <div className="space-y-6 lg:col-span-5">
            {/* 1. Desktop Video Asset Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Desktop Background Video</h3>
                    <p className="text-xs text-sage-muted">Paste a YouTube / video link or upload an MP4/WebM file</p>
                  </div>
                </div>
                {form.videoUrl && (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                    {getYouTubeId(form.videoUrl) ? "YouTube Video" : "Configured"}
                  </span>
                )}
              </div>

              {/* Paste URL Input Option */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5 text-emerald-700" />
                  Paste Video or YouTube Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. https://youtu.be/TtsdZnNNEII or .mp4 URL"
                    value={desktopUrlInput}
                    onChange={(e) => setDesktopUrlInput(e.target.value)}
                    className="flex-1 rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyUrl("desktop", desktopUrlInput)}
                    className="rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-950 transition shrink-0"
                  >
                    Apply Link
                  </button>
                </div>
                <p className="text-[11px] text-sage-muted mt-1">
                  Supports YouTube links (e.g. <span className="font-mono text-emerald-900">https://youtu.be/TtsdZnNNEII</span>), Vimeo, or any MP4/WebM web URL.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-emerald-950/10" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sage-muted">or upload file</span>
                <div className="h-px flex-1 bg-emerald-950/10" />
              </div>

              {/* Chunked Upload Dropzone */}
              <div>
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-4 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                  <Upload className="h-6 w-6 text-emerald-700/60 mb-1.5" />
                  <span className="text-xs font-semibold text-emerald-950">
                    {uploadingDesktop
                      ? `Uploading Video (${Math.round(desktopProgress * 100)}%)...`
                      : "Upload Video File (Chunked MP4 / WebM)"}
                  </span>
                  {uploadingDesktop ? (
                    <div className="w-48 bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-700 h-full transition-all duration-300"
                        style={{ width: `${desktopProgress * 100}%` }}
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-sage-muted mt-0.5">Reliable chunked upload handles large video files</span>
                  )}
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => handleChunkedUpload(e, "desktop")}
                    disabled={uploadingDesktop}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Current Asset Status & Remove Button */}
              {form.videoUrl && (
                <div className="rounded-xl border border-emerald-950/10 bg-emerald-50/40 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    {getYouTubeId(form.videoUrl) ? (
                      <Youtube className="h-4 w-4 text-red-600 shrink-0" />
                    ) : (
                      <FileVideo className="h-4 w-4 text-emerald-700 shrink-0" />
                    )}
                    <span className="truncate max-w-[220px] font-mono text-[11px] text-emerald-950" title={form.videoUrl}>
                      {form.videoUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAsset("desktop")}
                    className="rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* 2. Mobile Video Asset Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Mobile Video (Optional)</h3>
                    <p className="text-xs text-sage-muted">9:16 portrait cut optimized for mobile visitors</p>
                  </div>
                </div>
                {form.mobileVideoUrl ? (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                    Configured
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    Optional
                  </span>
                )}
              </div>

              {/* Paste URL */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5 text-emerald-700" />
                  Paste Mobile Video URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... or .mp4 URL"
                    value={mobileUrlInput}
                    onChange={(e) => setMobileUrlInput(e.target.value)}
                    className="flex-1 rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyUrl("mobile", mobileUrlInput)}
                    className="rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-950 transition shrink-0"
                  >
                    Apply Link
                  </button>
                </div>
              </div>

              {/* Chunked Upload */}
              <div>
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-4 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                  <Smartphone className="h-6 w-6 text-emerald-700/60 mb-1" />
                  <span className="text-xs font-semibold text-emerald-950">
                    {uploadingMobile
                      ? `Uploading (${Math.round(mobileProgress * 100)}%)...`
                      : "Upload Mobile 9:16 Video (Optional)"}
                  </span>
                  {uploadingMobile && (
                    <div className="w-48 bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-700 h-full transition-all duration-300"
                        style={{ width: `${mobileProgress * 100}%` }}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => handleChunkedUpload(e, "mobile")}
                    disabled={uploadingMobile}
                    className="hidden"
                  />
                </label>
              </div>

              {form.mobileVideoUrl && (
                <div className="rounded-xl border border-emerald-950/10 bg-emerald-50/40 p-3 flex items-center justify-between text-xs">
                  <span className="truncate max-w-[220px] font-mono text-[11px] text-emerald-950" title={form.mobileVideoUrl}>
                    {form.mobileVideoUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAsset("mobile")}
                    className="rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* 3. Fallback Poster Image */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Image className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Fallback Poster Image</h3>
                    <p className="text-xs text-sage-muted">Displayed while loading or when motion is reduced</p>
                  </div>
                </div>
                {form.posterUrl && (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                    Configured
                  </span>
                )}
              </div>

              {/* Paste Poster URL */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5 text-emerald-700" />
                  Paste Poster Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... image URL (JPG / PNG / WebP)"
                    value={posterUrlInput}
                    onChange={(e) => setPosterUrlInput(e.target.value)}
                    className="flex-1 rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyUrl("poster", posterUrlInput)}
                    className="rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-950 transition shrink-0"
                  >
                    Apply Link
                  </button>
                </div>
              </div>

              {/* Chunked Upload Poster */}
              <div>
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-4 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                  <Image className="h-6 w-6 text-emerald-700/60 mb-1" />
                  <span className="text-xs font-semibold text-emerald-950">
                    {uploadingPoster
                      ? `Uploading (${Math.round(posterProgress * 100)}%)...`
                      : "Upload Poster Image File"}
                  </span>
                  {uploadingPoster && (
                    <div className="w-48 bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-700 h-full transition-all duration-300"
                        style={{ width: `${posterProgress * 100}%` }}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleChunkedUpload(e, "poster")}
                    disabled={uploadingPoster}
                    className="hidden"
                  />
                </label>
              </div>

              {form.posterUrl && (
                <div className="rounded-xl border border-emerald-950/10 bg-emerald-50/40 p-3 flex items-center justify-between text-xs">
                  <span className="truncate max-w-[220px] font-mono text-[11px] text-emerald-950" title={form.posterUrl}>
                    {form.posterUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAsset("poster")}
                    className="rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* 4. Fine-Tuning Settings Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-emerald-950 border-b border-emerald-950/5 pb-3">
                Playback &amp; Display Parameters
              </h3>

              {/* Overlay Darkness Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-emerald-950 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-700" />
                    Darkness Overlay Opacity
                  </span>
                  <span className="font-mono text-emerald-800 font-bold">
                    {Math.round(form.overlayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={form.overlayOpacity}
                  onChange={(e) => setForm((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-800 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-sage-muted mt-1">
                  <span>0% (Raw Footage)</span>
                  <span>35% (Recommended)</span>
                  <span>100% (Solid Black)</span>
                </div>
              </div>

              {/* Video Position & Playback Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-emerald-950 mb-1.5">
                    Focal Alignment
                  </label>
                  <select
                    value={form.videoPosition}
                    onChange={(e) => setForm((p) => ({ ...p, videoPosition: e.target.value }))}
                    className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 focus:border-emerald-800 focus:outline-none"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-950 mb-1.5">
                    Playback Velocity
                  </label>
                  <select
                    value={form.playbackSpeed}
                    onChange={(e) => setForm((p) => ({ ...p, playbackSpeed: parseFloat(e.target.value) }))}
                    className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 focus:border-emerald-800 focus:outline-none"
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
              <div className="pt-2 border-t border-emerald-950/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-950">Autoplay</p>
                    <p className="text-[11px] text-sage-muted">Plays video immediately when section enters viewport</p>
                  </div>
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
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-950">Muted by Default</p>
                    <p className="text-[11px] text-sage-muted">Required by iOS and modern browsers for autoplay</p>
                  </div>
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
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-950">Continuous Loop</p>
                    <p className="text-[11px] text-sage-muted">Seamlessly repeats video upon completion</p>
                  </div>
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
                </div>
              </div>

              {/* Version Notes */}
              <div className="pt-2 border-t border-emerald-950/5">
                <label className="block text-xs font-medium text-emerald-950 mb-1.5">
                  Version Annotation / Release Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. YouTube wedding highlight reel with 35% contrast overlay"
                  value={form.versionNotes}
                  onChange={(e) => setForm((p) => ({ ...p, versionNotes: e.target.value }))}
                  className="w-full rounded-xl border border-emerald-950/15 bg-white px-3 py-2 text-xs text-emerald-950 placeholder:text-sage-muted/60 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Interactive Preview Stage (7 Cols) */}
          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm">
              {/* Preview Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-emerald-950/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    Live Readability Simulator
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                    {previewDevice === "desktop" ? "16:9 Desktop" : "9:16 Mobile"}
                  </span>
                  {currentYouTubeId && (
                    <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      <Youtube className="h-3 w-3" /> YouTube Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Device toggle */}
                  <div className="inline-flex rounded-xl border border-emerald-950/10 p-0.5 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        previewDevice === "desktop"
                          ? "bg-white text-emerald-950 shadow-sm"
                          : "text-sage-muted hover:text-emerald-950"
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        previewDevice === "mobile"
                          ? "bg-white text-emerald-950 shadow-sm"
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
                      className="rounded-xl border border-emerald-950/10 p-1.5 text-sage-muted hover:text-emerald-950 transition"
                      title={previewMuted ? "Unmute Preview Audio" : "Mute Preview Audio"}
                    >
                      {previewMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-800" />}
                    </button>
                  )}
                </div>
              </div>

              {/* The Simulated Hero Stage Container */}
              <div className="mt-4 flex justify-center bg-zinc-950 rounded-2xl p-2 sm:p-4 overflow-hidden">
                <div
                  className={`relative overflow-hidden rounded-xl border border-white/10 transition-all duration-300 flex items-center justify-center ${
                    previewDevice === "desktop"
                      ? "aspect-video w-full"
                      : "aspect-[9/16] w-full max-w-[280px]"
                  }`}
                >
                  {/* 1. Underlying Video Player */}
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
                      title="Hero Simulator"
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
                      <FileVideo className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-xs font-medium">No video or poster selected</p>
                      <p className="text-[11px] opacity-70">Paste a YouTube link or upload a video on the left</p>
                    </div>
                  )}

                  {/* 2. Adjustable Darkness Overlay */}
                  <div
                    className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150"
                    style={{ opacity: form.overlayOpacity }}
                  />

                  {/* 3. Hero Typography Mockup Layer */}
                  <div className="relative z-10 px-4 text-center select-none pointer-events-none">
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span
                        className="text-white/80 font-normal"
                        style={{
                          fontFamily: "'Alex Brush', cursive",
                          fontSize: previewDevice === "desktop" ? "clamp(1.6rem, 3.5vw, 2.8rem)" : "1.5rem"
                        }}
                      >
                        You Shoot.
                      </span>
                      <span
                        className="font-extrabold uppercase tracking-wide text-white"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: previewDevice === "desktop" ? "clamp(1.4rem, 3vw, 2.4rem)" : "1.3rem"
                        }}
                      >
                        WE EDIT.
                      </span>
                    </div>

                    <h2
                      className="mt-1 font-serif text-white/95 tracking-wide"
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: previewDevice === "desktop" ? "1.25rem" : "0.95rem"
                      }}
                    >
                      The Editing Table
                    </h2>

                    <p
                      className="mt-1 text-white/85 mx-auto max-w-sm line-clamp-2"
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: previewDevice === "desktop" ? "0.75rem" : "0.65rem",
                        lineHeight: 1.4
                      }}
                    >
                      Professional photo &amp; video editing for creators, filmmakers and brands around the world.
                    </p>

                    <div className="mt-3 flex justify-center">
                      <div className="rounded-full bg-emerald-700/90 px-4 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-sm">
                        Start a Project &rarr;
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information pill below preview */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-sage-muted">
                <span>
                  Simulated contrast ratio:{" "}
                  <strong className="text-emerald-950">
                    {form.overlayOpacity >= 0.3 ? "AAA Compliant (High Contrast)" : "AA (Moderate Contrast)"}
                  </strong>
                </span>
                <span>
                  Speed: <strong className="text-emerald-950">{form.playbackSpeed}x</strong> &bull; Alignment:{" "}
                  <strong className="text-emerald-950">{form.videoPosition}</strong>
                </span>
              </div>
            </div>

            {/* Quick Helper Tips */}
            <div className="rounded-2xl border border-emerald-950/10 bg-emerald-50/40 p-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                YouTube &amp; Cloud Video Support
              </h4>
              <p className="text-xs text-sage-muted leading-relaxed">
                You can paste full YouTube URLs like <code className="bg-white/80 px-1 py-0.5 rounded text-emerald-900 border border-emerald-950/10">https://youtu.be/TtsdZnNNEII?si=...</code> directly into the link input. The system automatically formats the stream for seamless, muted background looping.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Version History */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-950/5">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-950/15 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-50/50 transition"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
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
                                <Image className="h-3 w-3" /> Poster
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
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-900/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-50/60 transition shadow-sm"
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
                                className="rounded-lg border border-red-200 bg-red-50/30 p-1 text-red-600 hover:bg-red-100/60 transition"
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

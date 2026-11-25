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
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";

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
    versionNotes: ""
  });

  // Upload progress states
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

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

  // Handle direct file uploads via our dedicated verified endpoints
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file works
    e.target.value = "";

    const formData = new FormData();
    let endpoint = "";

    if (type === "desktop") {
      if (!file.type.includes("mp4") && !file.type.includes("webm")) {
        showAlert("error", "Desktop video must be an MP4 or WebM file.");
        return;
      }
      formData.append("video", file);
      endpoint = "/api/v1/admin/hero-video/upload/desktop";
      setUploadingDesktop(true);
    } else if (type === "mobile") {
      if (!file.type.includes("mp4") && !file.type.includes("webm")) {
        showAlert("error", "Mobile video must be an MP4 or WebM file.");
        return;
      }
      formData.append("video", file);
      endpoint = "/api/v1/admin/hero-video/upload/mobile";
      setUploadingMobile(true);
    } else if (type === "poster") {
      if (!file.type.startsWith("image/")) {
        showAlert("error", "Poster must be a valid image file (JPG, PNG, WebP).");
        return;
      }
      formData.append("poster", file);
      endpoint = "/api/v1/admin/hero-video/upload/poster";
      setUploadingPoster(true);
    }

    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: formData
      });

      if (res?.data?.draft) {
        const d = res.data.draft;
        setForm((prev) => ({
          ...prev,
          id: d._id || d.id,
          videoUrl: d.videoUrl || prev.videoUrl,
          mobileVideoUrl: d.mobileVideoUrl ?? prev.mobileVideoUrl,
          posterUrl: d.posterUrl ?? prev.posterUrl,
          fileMetadata: d.fileMetadata || prev.fileMetadata
        }));
        showAlert("success", `${type.charAt(0).toUpperCase() + type.slice(1)} asset uploaded and saved to draft!`);
      }
    } catch (err) {
      console.error(`Upload error for ${type}:`, err);
      showAlert("error", err.message || `Failed to upload ${type} asset.`);
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
      const res = await apiFetch(`/api/v1/admin/hero-video/asset/${type}`, {
        method: "DELETE"
      });
      if (res?.data) {
        setForm((prev) => ({
          ...prev,
          ...(type === "desktop" ? { videoUrl: "" } : {}),
          ...(type === "mobile" ? { mobileVideoUrl: "" } : {}),
          ...(type === "poster" ? { posterUrl: "" } : {})
        }));
        showAlert("success", `${type.charAt(0).toUpperCase() + type.slice(1)} asset removed from draft.`);
      }
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
      showAlert("error", "Please upload at least a desktop video or a fallback poster image before publishing.");
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
        loadConfig();
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
        loadConfig();
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

  // Current preview source
  const currentVideoSrc = previewDevice === "mobile" && form.mobileVideoUrl
    ? form.mobileVideoUrl
    : form.videoUrl;

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
            Upload desktop and mobile background footage, preview text readability with live opacity simulation, fine-tune playback parameters, and publish seamlessly to production.
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
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Desktop Background Video</h3>
                    <p className="text-xs text-sage-muted">Primary 16:9 cinematic loop (MP4, WebM up to 100MB)</p>
                  </div>
                </div>
                {form.videoUrl && (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                    Configured
                  </span>
                )}
              </div>

              <div className="mt-4">
                {form.videoUrl ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                      <video
                        src={mediaUrl(form.videoUrl)}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        autoPlay
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-sage-muted">
                      <span className="truncate max-w-[200px]" title={form.videoUrl}>
                        {form.fileMetadata?.desktop?.filename || form.videoUrl.split("/").pop()}
                      </span>
                      {form.fileMetadata?.desktop?.size && (
                        <span>{formatBytes(form.fileMetadata.desktop.size)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex-1 cursor-pointer rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-center text-xs font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50/50">
                        {uploadingDesktop ? "Uploading..." : "Replace Desktop Video"}
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={(e) => handleFileUpload(e, "desktop")}
                          disabled={uploadingDesktop}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset("desktop")}
                        className="rounded-xl border border-red-200 bg-red-50/40 p-2 text-red-600 transition hover:bg-red-100/60"
                        title="Remove Desktop Video"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-6 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                    <Upload className="h-8 w-8 text-emerald-700/60 mb-2" />
                    <span className="text-xs font-semibold text-emerald-950">
                      {uploadingDesktop ? "Uploading & Verifying Video..." : "Upload Desktop Video (MP4 / WebM)"}
                    </span>
                    <span className="text-[11px] text-sage-muted mt-1">Recommended: 1080p, H.264/WebM, under 50MB</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={(e) => handleFileUpload(e, "desktop")}
                      disabled={uploadingDesktop}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 2. Mobile Video Asset Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Mobile Video (Optional)</h3>
                    <p className="text-xs text-sage-muted">Optimized 9:16 portrait cut for mobile devices</p>
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

              <div className="mt-4">
                {form.mobileVideoUrl ? (
                  <div className="space-y-3">
                    <div className="relative aspect-[9/16] max-h-56 mx-auto overflow-hidden rounded-xl bg-black">
                      <video
                        src={mediaUrl(form.mobileVideoUrl)}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        autoPlay
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-sage-muted">
                      <span className="truncate max-w-[200px]" title={form.mobileVideoUrl}>
                        {form.fileMetadata?.mobile?.filename || form.mobileVideoUrl.split("/").pop()}
                      </span>
                      {form.fileMetadata?.mobile?.size && (
                        <span>{formatBytes(form.fileMetadata.mobile.size)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex-1 cursor-pointer rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-center text-xs font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50/50">
                        {uploadingMobile ? "Uploading..." : "Replace Mobile Video"}
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={(e) => handleFileUpload(e, "mobile")}
                          disabled={uploadingMobile}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset("mobile")}
                        className="rounded-xl border border-red-200 bg-red-50/40 p-2 text-red-600 transition hover:bg-red-100/60"
                        title="Remove Mobile Video"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-5 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                    <Smartphone className="h-6 w-6 text-emerald-700/60 mb-2" />
                    <span className="text-xs font-semibold text-emerald-950">
                      {uploadingMobile ? "Uploading Mobile Video..." : "Upload Mobile 9:16 Video (Optional)"}
                    </span>
                    <span className="text-[11px] text-sage-muted mt-1">If omitted, desktop video scales responsively</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={(e) => handleFileUpload(e, "mobile")}
                      disabled={uploadingMobile}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 3. Fallback Poster Image */}
            <div className="rounded-2xl border border-emerald-950/10 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/5">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                    <Image className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Fallback Poster Image</h3>
                    <p className="text-xs text-sage-muted">Shown while loading or when motion is reduced</p>
                  </div>
                </div>
                {form.posterUrl && (
                  <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                    Configured
                  </span>
                )}
              </div>

              <div className="mt-4">
                {form.posterUrl ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                      <img
                        src={mediaUrl(form.posterUrl)}
                        alt="Hero poster fallback"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-sage-muted">
                      <span className="truncate max-w-[200px]" title={form.posterUrl}>
                        {form.fileMetadata?.poster?.filename || form.posterUrl.split("/").pop()}
                      </span>
                      {form.fileMetadata?.poster?.size && (
                        <span>{formatBytes(form.fileMetadata.poster.size)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex-1 cursor-pointer rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-center text-xs font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50/50">
                        {uploadingPoster ? "Uploading..." : "Replace Poster Image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleFileUpload(e, "poster")}
                          disabled={uploadingPoster}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset("poster")}
                        className="rounded-xl border border-red-200 bg-red-50/40 p-2 text-red-600 transition hover:bg-red-100/60"
                        title="Remove Poster Image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-900/20 bg-emerald-50/20 p-5 text-center cursor-pointer hover:bg-emerald-50/40 transition">
                    <Image className="h-6 w-6 text-emerald-700/60 mb-2" />
                    <span className="text-xs font-semibold text-emerald-950">
                      {uploadingPoster ? "Uploading Poster..." : "Upload Poster Image (JPG / PNG / WebP)"}
                    </span>
                    <span className="text-[11px] text-sage-muted mt-1">Recommended: 1920x1080 sharp high-res frame</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleFileUpload(e, "poster")}
                      disabled={uploadingPoster}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
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
                  placeholder="e.g. 4K wedding highlight reel with 35% contrast overlay"
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
                  <button
                    type="button"
                    onClick={() => setPreviewMuted(!previewMuted)}
                    className="rounded-xl border border-emerald-950/10 p-1.5 text-sage-muted hover:text-emerald-950 transition"
                    title={previewMuted ? "Unmute Preview Audio" : "Mute Preview Audio"}
                  >
                    {previewMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-800" />}
                  </button>
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
                  {currentVideoSrc ? (
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
                      <p className="text-[11px] opacity-70">Upload an asset on the left to see live preview</p>
                    </div>
                  )}

                  {/* 2. Adjustable Darkness Overlay */}
                  <div
                    className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150"
                    style={{ opacity: form.overlayOpacity }}
                  />

                  {/* 3. Hero Typography Mockup Layer (matching live HeroSection.jsx typography) */}
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

            {/* Status & Deployment Card */}
            <div className="rounded-2xl border border-emerald-950/10 bg-emerald-50/40 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 mb-2">
                Production Deployment Workflow
              </h4>
              <ul className="space-y-1.5 text-xs text-sage-muted">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Saving as <strong>Draft</strong> keeps changes isolated in the database without affecting active visitors.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Clicking <strong>Publish to Live</strong> atomically swaps the homepage background video in Neon PostgreSQL and broadcasts instant cache invalidation.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Previous publications are permanently archived with full rollback capabilities in the <strong>Version History</strong> tab.
                  </span>
                </li>
              </ul>
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
                                href={mediaUrl(item.videoUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline"
                              >
                                <Monitor className="h-3 w-3" /> Video
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

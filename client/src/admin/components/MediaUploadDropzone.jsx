/* global console, FormData, URL, AbortController */
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import {
  CHUNK_BYTES,
  formatBytes,
  isImageMedia,
  isImageMimeType,
  isVideoMedia,
  isVideoMimeType,
  normalizeClientMimeType
} from "../../utils/mediaUtils.js";

/**
 * Uploads a file via resilient Neon PostgreSQL chunked pipeline
 * (3MB slices, automatic retries, progress tracking, and user cancellation).
 */
export async function uploadFileInChunks(file, folder, onProgress = () => {}, signal = null) {
  const mimeType = normalizeClientMimeType(file);
  const isVideo = isVideoMimeType(mimeType) || isVideoMedia(file.name);
  const isImage = isImageMimeType(mimeType) || isImageMedia(file.name);

  if (!isImage && !isVideo) {
    throw new Error("Unsupported file type. Please choose a JPG, PNG, WEBP, GIF, MP4, MOV, or WebM file.");
  }

  // Resumable chunked upload pipeline directly into Neon PostgreSQL
  const started = await apiFetch("/api/v1/upload/chunked/start", {
    method: "POST",
    body: JSON.stringify({
      folder,
      mimeType,
      size: file.size,
      originalName: file.name
    }),
    signal
  });

  const { uploadId, chunkSize = CHUNK_BYTES } = started.data || {};
  if (!uploadId) throw new Error("The server could not create an upload session.");
  const count = Math.ceil(file.size / chunkSize);
  let completed = false;

  try {
    // Controlled bounded concurrency: 2 parallel chunk uploads for optimal throughput
    const CONCURRENCY = 2;
    let nextIndex = 0;
    let completedChunks = 0;

    const uploadWorker = async () => {
      while (nextIndex < count) {
        if (signal?.aborted) throw new Error("Upload cancelled by user.");
        const index = nextIndex++;
        const startByte = index * chunkSize;
        const endByte = Math.min((index + 1) * chunkSize, file.size);
        const chunkBlob = file.slice(startByte, endByte, mimeType);

        const body = new FormData();
        body.append("uploadId", uploadId);
        body.append("index", String(index));
        body.append("count", String(count));
        body.append("chunk", chunkBlob, file.name);

        // Automatic retry on transient chunk failure (up to 3 attempts)
        let attempts = 0;
        let lastErr = null;
        while (attempts < 3) {
          if (signal?.aborted) throw new Error("Upload cancelled by user.");
          try {
            await apiFetch("/api/v1/upload/chunked/part", { method: "POST", body, signal });
            lastErr = null;
            break;
          } catch (err) {
            if (signal?.aborted || err?.name === "AbortError") throw err;
            lastErr = err;
            attempts += 1;
            if (attempts < 3) {
              await new Promise((resolve) => setTimeout(resolve, 400 * attempts));
            }
          }
        }
        if (lastErr) throw lastErr;

        completedChunks += 1;
        onProgress(completedChunks / count);
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, count) }, () => uploadWorker());
    await Promise.all(workers);

    const result = await apiFetch("/api/v1/upload/chunked/finish", {
      method: "POST",
      body: JSON.stringify({
        uploadId,
        originalName: file.name,
        mimeType,
        size: file.size,
        folder
      }),
      signal
    });

    if (!result?.data?.url) throw new Error("The server did not return a stored media URL.");
    completed = true;
    return result.data;
  } finally {
    if (!completed) {
      apiFetch("/api/v1/upload/chunked/abort", {
        method: "POST",
        body: JSON.stringify({ uploadId })
      }).catch(() => {});
    }
  }
}

export default function MediaUploadDropzone({
  folder = "general",
  value = "",
  onChange,
  multiple = false,
  maxFiles = 5,
  label = "Upload Media File",
  description = "Drag and drop media here, or click to browse",
  accept = "image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lastFailedFile, setLastFailedFile] = useState(null);

  // Local preview state for instant feedback upon selection
  const [localPreview, setLocalPreview] = useState(null);
  const localUrlRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Revoke object URL on cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      if (localUrlRef.current) {
        try {
          URL.revokeObjectURL(localUrlRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Sync local preview when value prop changes from parent
  useEffect(() => {
    if (!value) {
      if (localUrlRef.current) {
        try {
          URL.revokeObjectURL(localUrlRef.current);
        } catch {}
        localUrlRef.current = null;
      }
      setLocalPreview(null);
    } else if (typeof value === "string" && (!localPreview || (!localPreview.isLocal && localPreview.url !== value))) {
      const isVid = isVideoMedia(value);
      const filename = value.split("/").pop()?.split("?")[0] || "media";
      setLocalPreview({
        url: value,
        name: filename,
        size: null,
        isVideo: isVid,
        isLocal: false
      });
    }
  }, [value, localPreview]);

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (localUrlRef.current) {
      try {
        URL.revokeObjectURL(localUrlRef.current);
      } catch {}
      localUrlRef.current = null;
    }
    setLocalPreview(null);
    setUploading(false);
    setProgress(0);
    setError("Upload cancelled.");
  };

  const executeUpload = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0) return;
      setError("");
      setSuccessMsg("");
      setLastFailedFile(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (!multiple) {
          const file = fileList[0];
          const mimeType = normalizeClientMimeType(file);
          const isVideo = isVideoMimeType(mimeType) || isVideoMedia(file.name);
          const isImage = isImageMimeType(mimeType) || isImageMedia(file.name);

          // Validate supported formats
          if (!isImage && !isVideo) {
            setError("Unsupported file type. Permitted formats: JPG, PNG, WEBP, GIF, MP4, MOV, and WebM.");
            return;
          }

          // Instantly create local object URL for immediate live video/image preview
          if (localUrlRef.current) {
            try {
              URL.revokeObjectURL(localUrlRef.current);
            } catch {}
          }
          const objectUrl = URL.createObjectURL(file);
          localUrlRef.current = objectUrl;

          setLocalPreview({
            url: objectUrl,
            name: file.name,
            size: file.size,
            isVideo,
            isLocal: true
          });

          setUploading(true);
          setProgress(0);

          try {
            const saved = await uploadFileInChunks(
              file,
              folder,
              (ratio) => setProgress(Math.round(ratio * 100)),
              controller.signal
            );

            // Notify parent with saved server media URL
            onChange(saved.url);
            setProgress(100);
            setSuccessMsg("Media uploaded and saved to Neon PostgreSQL!");

            // Switch to persistent server URL
            setLocalPreview({
              url: saved.url,
              name: file.name,
              size: file.size,
              isVideo,
              isLocal: false
            });

            setTimeout(() => setSuccessMsg(""), 4000);
          } catch (err) {
            if (controller.signal.aborted) {
              setError("Upload cancelled.");
            } else {
              setLastFailedFile(file);
              throw err;
            }
          }
        } else {
          // Multiple file upload flow (for galleries/collections)
          setUploading(true);
          setProgress(0);
          const currentList = Array.isArray(value) ? value : [];
          const remainingSlots = Math.max(0, maxFiles - currentList.length);
          if (remainingSlots === 0) {
            setError(`Maximum limit reached: you can only upload up to ${maxFiles} files.`);
            return;
          }
          const selectedFiles = Array.from(fileList);
          const filesToUpload = selectedFiles.slice(0, remainingSlots);
          const savedFiles = [];
          let firstFailure = null;

          for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex += 1) {
            if (controller.signal.aborted) break;
            const currentFile = filesToUpload[fileIndex];
            try {
              const saved = await uploadFileInChunks(
                currentFile,
                folder,
                (ratio) => {
                  const totalProgress = ((fileIndex + ratio) / filesToUpload.length) * 100;
                  setProgress(Math.round(totalProgress));
                },
                controller.signal
              );
              savedFiles.push(saved);
            } catch (err) {
              if (controller.signal.aborted) {
                firstFailure = new Error("Upload cancelled.");
              } else {
                firstFailure = err;
                setLastFailedFile(currentFile);
              }
              break;
            }
          }

          if (savedFiles.length) {
            onChange([...currentList, ...savedFiles.map((item) => item.url)].slice(0, maxFiles));
          }

          if (firstFailure) {
            setError(
              savedFiles.length
                ? `${savedFiles.length} file(s) uploaded. The next file failed: ${firstFailure.message}`
                : firstFailure.message
            );
          } else {
            setSuccessMsg(`${savedFiles.length} file(s) uploaded successfully!`);
            setTimeout(() => setSuccessMsg(""), 3500);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("[MediaUploadDropzone] Upload error:", err);
          setError(err.message || "Upload failed. Please check your connection and try again.");
        }
      } finally {
        setUploading(false);
        abortControllerRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [folder, maxFiles, multiple, onChange, value]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      executeUpload(e.dataTransfer.files);
    }
  };

  const handleRemoveSingle = () => {
    if (localUrlRef.current) {
      try {
        URL.revokeObjectURL(localUrlRef.current);
      } catch {}
      localUrlRef.current = null;
    }
    setLocalPreview(null);
    onChange("");
    setError("");
    setSuccessMsg("");
  };

  const handleRemoveMultiple = (indexToRemove) => {
    if (Array.isArray(value)) {
      onChange(value.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const handleRetry = () => {
    if (lastFailedFile) {
      executeUpload([lastFailedFile]);
    }
  };

  // Determine active preview target for single mode
  const activeSinglePreview = localPreview || (typeof value === "string" && value.trim() ? {
    url: value,
    name: value.split("/").pop()?.split("?")[0] || "media",
    size: null,
    isVideo: isVideoMedia(value),
    isLocal: false
  } : null);

  const isValueValidMultiple = Array.isArray(value) && value.length > 0;

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-site">
          {label}
        </label>
        <span className="text-[10px] font-semibold text-sage-muted uppercase bg-sage-secondary px-2 py-0.5 rounded-full border border-sage-border/40">
          Folder: /{folder}
        </span>
      </div>

      {/* Hidden file input for Replace and manual Browse actions */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={uploading}
        onChange={(e) => executeUpload(e.target.files)}
        className="hidden"
        title="Select file"
      />

      {/* ================= SINGLE FILE MODE ================= */}
      {!multiple && (
        <>
          {activeSinglePreview ? (
            /* ACTIVE MEDIA PREVIEW BOX (Prominent Video/Image player) */
            <div className="relative rounded-2xl border border-sage-border overflow-hidden bg-forest/95 text-white shadow-soft transition-all">
              {/* Media Player Container */}
              <div className="relative aspect-video w-full max-h-72 bg-black flex items-center justify-center overflow-hidden">
                {activeSinglePreview.isVideo ? (
                  <video
                    key={activeSinglePreview.url}
                    src={activeSinglePreview.isLocal ? activeSinglePreview.url : mediaUrl(activeSinglePreview.url)}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img
                    src={activeSinglePreview.isLocal ? activeSinglePreview.url : mediaUrl(activeSinglePreview.url)}
                    alt={activeSinglePreview.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "";
                    }}
                  />
                )}

                {/* Top Overlay Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2 pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-full bg-forest/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-300 border border-emerald-500/30">
                    {activeSinglePreview.isVideo ? (
                      <>
                        <Film className="h-3 w-3" />
                        <span>VIDEO</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3" />
                        <span>IMAGE</span>
                      </>
                    )}
                  </span>
                  {activeSinglePreview.size && (
                    <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-white/90 border border-white/10">
                      {formatBytes(activeSinglePreview.size)}
                    </span>
                  )}
                </div>

                {/* Uploading Progress Overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                    <Loader2 className="h-9 w-9 animate-spin text-emerald-400 mb-3" />
                    <p className="text-xs font-semibold text-white">
                      Uploading to Neon PostgreSQL... {progress}%
                    </p>
                    <div className="w-full max-w-xs bg-white/20 rounded-full h-1.5 overflow-hidden mt-3">
                      <div
                        className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 rounded-lg transition border border-rose-500/40 cursor-pointer"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Metadata & Controls Bar */}
              <div className="p-3 bg-forest border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  {activeSinglePreview.isVideo ? (
                    <Film className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="font-medium text-white truncate max-w-xs sm:max-w-md">
                    {activeSinglePreview.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition border border-white/20 cursor-pointer disabled:opacity-50"
                  >
                    Replace {activeSinglePreview.isVideo ? "Video" : "Image"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSingle}
                    disabled={uploading}
                    className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition border border-rose-500/30 cursor-pointer disabled:opacity-50"
                    title="Remove media"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* EMPTY DROPZONE (Drag and Drop / Click to Select) */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-6 text-center transition-all duration-300 cursor-pointer ${
                uploading
                  ? "border-site/40 bg-site/5 cursor-wait"
                  : isDragging
                  ? "border-[rgb(72,125,72)] bg-[rgb(72,125,72)]/5 shadow-sage scale-[1.01]"
                  : "border-sage-border/80 bg-sage-secondary/40 hover:border-[rgb(72,125,72)]/60 hover:bg-sage-secondary"
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="p-3 rounded-2xl bg-sage-card border border-sage-border shadow-soft">
                  <UploadCloud className="h-6 w-6 text-site" />
                </div>
                <p className="text-xs font-semibold text-forest">{description}</p>
                <div className="flex items-center gap-2 text-[10px] text-sage-muted">
                  <span>High-Res Photos (JPG, PNG, WEBP)</span>
                  <span>•</span>
                  <span>Cinematic Video (MP4, MOV, WebM)</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= MULTIPLE FILES MODE ================= */}
      {multiple && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-5 text-center transition-all duration-300 cursor-pointer ${
              uploading
                ? "border-site/40 bg-site/5 cursor-wait"
                : isDragging
                ? "border-[rgb(72,125,72)] bg-[rgb(72,125,72)]/5 shadow-sage scale-[1.01]"
                : "border-sage-border/80 bg-sage-secondary/40 hover:border-[rgb(72,125,72)]/60 hover:bg-sage-secondary"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              {uploading ? (
                <div className="space-y-2.5 w-full max-w-xs mx-auto py-2">
                  <Loader2 className="h-8 w-8 animate-spin text-site mx-auto" />
                  <p className="text-xs font-semibold text-forest">
                    Uploading &amp; Processing... {progress}%
                  </p>
                  <div className="w-full bg-sage-border/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-site h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-sage-card border border-sage-border shadow-soft">
                    <UploadCloud className="h-6 w-6 text-site" />
                  </div>
                  <p className="text-xs font-semibold text-forest">{description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-sage-muted">
                    <span>JPG, PNG, WEBP, MP4, MOV, WebM (up to {maxFiles} items)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {isValueValidMultiple && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] text-sage-muted font-medium">
                <span>Uploaded Assets ({value.length} of {maxFiles})</span>
                {value.length < maxFiles && (
                  <span className="text-site">{maxFiles - value.length} slots remaining</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {value.map((item, idx) => {
                  const fileUrl = typeof item === "string" ? item : item?.url || "";
                  const isVid = isVideoMedia(fileUrl);
                  return (
                    <div
                      key={idx}
                      className="relative group rounded-2xl border border-sage-border overflow-hidden bg-sage-card shadow-soft"
                    >
                      <div className="h-24 w-full overflow-hidden bg-forest/5 flex items-center justify-center">
                        {isVid ? (
                          <video
                            src={mediaUrl(fileUrl)}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={mediaUrl(fileUrl)}
                            alt={`Asset ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-1.5 bg-sage-card/90 border-t border-sage-border/50 text-[10px] text-forest truncate flex items-center justify-between">
                        <span className="truncate">{fileUrl.split("/").pop()}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMultiple(idx)}
                          disabled={uploading}
                          className="text-rose-600 hover:text-rose-800 p-0.5 rounded cursor-pointer"
                          title="Remove Item"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification & Retry Button */}
      {error && (
        <div className="flex items-start sm:items-center justify-between gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          {lastFailedFile && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={uploading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-bold transition shrink-0 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

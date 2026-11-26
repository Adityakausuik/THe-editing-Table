/* global console, FormData */
import { AlertCircle, CheckCircle2, Film, Image as ImageIcon, Loader2, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import {
  CHUNK_BYTES,
  formatBytes,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  normalizeClientMimeType
} from "../../utils/mediaUtils.js";

export async function uploadFileInChunks(file, folder, onProgress = () => {}) {
  const mimeType = normalizeClientMimeType(file);
  const isVideo = mimeType === "video/mp4" || mimeType === "video/webm";
  const isImage = mimeType.startsWith("image/");

  if (!isImage && !isVideo) {
    throw new Error("Unsupported file type. Please choose a JPG, PNG, WEBP, GIF, or MP4 file.");
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    throw new Error(
      isVideo
        ? `Videos must be ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB or smaller.`
        : `Images must be ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB or smaller.`
    );
  }

  const started = await apiFetch("/api/v1/upload/chunked/start", {
    method: "POST",
    body: JSON.stringify({
      folder,
      mimeType,
      size: file.size,
      originalName: file.name
    })
  });

  const { uploadId, chunkSize = CHUNK_BYTES } = started.data || {};
  if (!uploadId) throw new Error("The server could not create an upload session.");
  const count = Math.ceil(file.size / chunkSize);
  let completed = false;

  try {
    for (let index = 0; index < count; index += 1) {
      const startByte = index * chunkSize;
      const endByte = Math.min((index + 1) * chunkSize, file.size);
      // Explicitly pass mimeType to Blob slice
      const chunkBlob = file.slice(startByte, endByte, mimeType);

      const body = new FormData();
      body.append("uploadId", uploadId);
      body.append("index", String(index));
      body.append("count", String(count));
      body.append("chunk", chunkBlob, file.name);

      await apiFetch("/api/v1/upload/chunked/part", { method: "POST", body });
      onProgress((index + 1) / count);
    }

    const result = await apiFetch("/api/v1/upload/chunked/finish", {
      method: "POST",
      body: JSON.stringify({
        uploadId,
        originalName: file.name,
        mimeType,
        size: file.size,
        folder
      })
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
  accept = ".jpg,.jpeg,.png,.webp,.gif,.mp4"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [lastFailedFile, setLastFailedFile] = useState(null);

  const fileInputRef = useRef(null);

  const executeUpload = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0) return;
      setError("");
      setSuccessMsg("");
      setUploading(true);
      setProgress(0);
      setLastFailedFile(null);

      try {
        if (!multiple) {
          const file = fileList[0];
          try {
            const saved = await uploadFileInChunks(file, folder, (ratio) =>
              setProgress(Math.round(ratio * 100))
            );
            onChange(saved.url);
            setProgress(100);
            setSuccessMsg("Media uploaded and optimized successfully!");
            setTimeout(() => setSuccessMsg(""), 3500);
          } catch (err) {
            setLastFailedFile(file);
            throw err;
          }
        } else {
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
            const currentFile = filesToUpload[fileIndex];
            try {
              const saved = await uploadFileInChunks(currentFile, folder, (ratio) => {
                const totalProgress = ((fileIndex + ratio) / filesToUpload.length) * 100;
                setProgress(Math.round(totalProgress));
              });
              savedFiles.push(saved);
            } catch (err) {
              firstFailure = err;
              setLastFailedFile(currentFile);
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
        console.error("[MediaUploadDropzone] Upload error:", err);
        setError(err.message || "Upload failed. Please check the file and try again.");
      } finally {
        setUploading(false);
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

  const isValueValidSingle = typeof value === "string" && value.trim() !== "";
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

      {/* Upload Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-5 text-center transition-all duration-300 ${
          uploading
            ? "border-site/40 bg-site/5 cursor-wait"
            : isDragging
            ? "border-[rgb(72,125,72)] bg-[rgb(72,125,72)]/5 shadow-sage scale-[1.01]"
            : "border-sage-border/80 bg-sage-secondary/40 hover:border-[rgb(72,125,72)]/50 hover:bg-sage-secondary"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={uploading}
          onChange={(e) => executeUpload(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
          title="Click to select file or drag and drop"
        />

        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          {uploading ? (
            <div className="space-y-2.5 w-full max-w-xs mx-auto py-2">
              <Loader2 className="h-8 w-8 animate-spin text-site mx-auto" />
              <p className="text-xs font-semibold text-forest">
                Uploading &amp; Optimizing... {progress}%
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
                <span>JPG, PNG, WEBP, GIF (Max 15MB)</span>
                <span>•</span>
                <span>MP4 (Max 50MB)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success Notice */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notice & Retry */}
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

      {/* Single Media Preview */}
      {!multiple && isValueValidSingle && (
        <div className="relative rounded-2xl border border-sage-border bg-sage-card p-3 flex items-center justify-between gap-3 shadow-soft">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-14 w-14 rounded-xl overflow-hidden border border-sage-border bg-forest/5 shrink-0 flex items-center justify-center">
              {value.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={mediaUrl(value)}
                  className="h-full w-full object-cover"
                  controls={false}
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={mediaUrl(value)}
                  alt="Uploaded media preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "";
                  }}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {value.match(/\.(mp4|webm|mov)$/i) ? (
                  <Film className="h-3.5 w-3.5 text-site shrink-0" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 text-site shrink-0" />
                )}
                <p className="text-xs font-semibold text-forest truncate">
                  {value.split("/").pop()}
                </p>
              </div>
              <p className="text-[10px] text-sage-muted truncate mt-0.5">{value}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-2.5 py-1.5 rounded-xl border border-sage-border hover:bg-sage-secondary text-forest text-[11px] font-semibold transition cursor-pointer"
              title="Replace Media File"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemoveSingle}
              disabled={uploading}
              className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Remove Media File"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Multiple Media Previews Grid */}
      {multiple && isValueValidMultiple && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-sage-muted font-medium">
            <span>Uploaded Assets ({value.length} of {maxFiles})</span>
            {value.length < maxFiles && (
              <span className="text-site">{maxFiles - value.length} slots remaining</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {value.map((item, idx) => {
              const fileUrl = typeof item === "string" ? item : item?.url || "";
              const isVid = fileUrl.match(/\.(mp4|webm|mov)$/i);
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
    </div>
  );
}

/* global console, FormData */
import { AlertCircle, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const CHUNK_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"]);

async function uploadFileInChunks(file, folder, onProgress) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, WEBP, GIF, or MP4 file.");
  }
  const limit = file.type === "video/mp4" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    throw new Error(file.type === "video/mp4" ? "Videos must be 50MB or smaller." : "Images must be 15MB or smaller.");
  }

  const started = await apiFetch("/api/v1/upload/chunked/start", {
    method: "POST",
    body: JSON.stringify({ folder, mimeType: file.type, size: file.size })
  });
  const { uploadId, chunkSize = CHUNK_BYTES } = started.data || {};
  if (!uploadId) throw new Error("The server did not create an upload session.");
  const count = Math.ceil(file.size / chunkSize);
  let completed = false;

  try {
    for (let index = 0; index < count; index += 1) {
      const body = new FormData();
      body.append("uploadId", uploadId);
      body.append("index", String(index));
      body.append("count", String(count));
      body.append("chunk", file.slice(index * chunkSize, Math.min((index + 1) * chunkSize, file.size)), file.name);
      await apiFetch("/api/v1/upload/chunked/part", { method: "POST", body });
      onProgress((index + 1) / count);
    }

    const result = await apiFetch("/api/v1/upload/chunked/finish", {
      method: "POST",
      body: JSON.stringify({ uploadId, originalName: file.name, mimeType: file.type, size: file.size, folder })
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
  description = "Drag and drop image or video file here, or click to browse",
  accept = ".jpg,.jpeg,.png,.webp,.gif,.mp4"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFileUpload = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0) return;
      setError("");
      setUploading(true);
      setProgress(0);

      try {
        if (!multiple) {
          const file = fileList[0];
          const saved = await uploadFileInChunks(file, folder, (ratio) => setProgress(Math.round(ratio * 100)));
          onChange(saved.url);
          setProgress(100);
        } else {
          const currentList = Array.isArray(value) ? value : [];
          const remainingSlots = Math.max(0, maxFiles - currentList.length);
          if (remainingSlots === 0) {
            setError(`You can upload up to ${maxFiles} files.`);
            return;
          }
          const selectedFiles = Array.from(fileList);
          const filesToUpload = selectedFiles.slice(0, remainingSlots);
          const savedFiles = [];
          let firstFailure = null;
          for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex += 1) {
            try {
              const saved = await uploadFileInChunks(filesToUpload[fileIndex], folder, (ratio) => {
                const progress = ((fileIndex + ratio) / filesToUpload.length) * 100;
                setProgress(Math.round(progress));
              });
              savedFiles.push(saved);
            } catch (err) {
              firstFailure = err;
              break;
            }
          }
          if (savedFiles.length) {
            onChange([...currentList, ...savedFiles.map((item) => item.url)].slice(0, maxFiles));
          }
          if (firstFailure) {
            setError(savedFiles.length
              ? `${savedFiles.length} file(s) uploaded. The next file failed: ${firstFailure.message}`
              : firstFailure.message);
          } else if (selectedFiles.length > filesToUpload.length) {
            setError(`Only ${filesToUpload.length} file(s) were uploaded; the ${maxFiles}-file limit was reached.`);
          }
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError(err.message || "Upload failed. Please try again.");
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [folder, maxFiles, multiple, onChange, value]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleRemoveSingle = () => {
    onChange("");
  };

  const handleRemoveMultiple = (indexToRemove) => {
    if (Array.isArray(value)) {
      onChange(value.filter((_, idx) => idx !== indexToRemove));
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
          isDragging
            ? "border-[rgb(72,125,72)] bg-[rgb(72,125,72)]/5 shadow-sage scale-[1.01]"
            : "border-sage-border/80 bg-sage-secondary/40 hover:border-[rgb(72,125,72)]/50 hover:bg-sage-secondary"
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileUpload(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />

        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-site mx-auto" />
              <p className="text-xs font-semibold text-forest">Processing & Optimizing WebP ({progress}%)...</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-sage-card border border-sage-border shadow-soft">
                <UploadCloud className="h-6 w-6 text-site" />
              </div>
              <p className="text-xs font-semibold text-forest">{description}</p>
              <p className="text-[10px] text-sage-muted">
                Supports JPG, PNG, WEBP, GIF, MP4 (Max 15MB images, 50MB videos)
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Single Media Preview */}
      {!multiple && isValueValidSingle && (
        <div className="relative rounded-2xl border border-sage-border bg-sage-card p-3 flex items-center justify-between gap-3 shadow-soft">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-xl overflow-hidden border border-sage-border bg-forest/5 shrink-0">
              {value.match(/\.(mp4|webm|mov)$/i) ? (
                <video src={mediaUrl(value)} className="h-full w-full object-cover" />
              ) : (
                <img src={mediaUrl(value)} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-forest truncate">{value.split("/").pop()}</p>
              <p className="text-[10px] text-sage-muted truncate">{value}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveSingle}
            className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
            title="Remove Media File"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Multiple Media Previews Grid */}
      {multiple && isValueValidMultiple && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {value.map((url, idx) => (
            <div key={idx} className="relative group rounded-2xl border border-sage-border overflow-hidden bg-sage-card shadow-soft">
              <div className="h-20 w-full overflow-hidden bg-forest/5">
                {typeof url === "string" && url.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={mediaUrl(url)} className="h-full w-full object-cover" />
                ) : (
                  <img src={mediaUrl(typeof url === "string" ? url : url.url)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveMultiple(idx)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-soft"
                title="Remove File"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* global console, FormData */
import { AlertCircle, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";

export default function MediaUploadDropzone({
  folder = "general",
  value = "",
  onChange,
  multiple = false,
  maxFiles = 5,
  label = "Upload Media File",
  description = "Drag and drop image or video file here, or click to browse",
  accept = "image/*,video/*"
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
      setProgress(20);

      try {
        if (!multiple) {
          const file = fileList[0];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);

          setProgress(40);
          const data = await apiFetch("/api/v1/upload/single", {
            method: "POST",
            body: formData
          });

          setProgress(80);
          if (data?.success && data?.data?.url) {
            onChange(data.data.url);
            setProgress(100);
          } else {
            setError(data?.message || "File upload failed. Please try again.");
          }
        } else {
          const formData = new FormData();
          const filesToUpload = Array.from(fileList).slice(0, maxFiles);
          filesToUpload.forEach((f) => formData.append("files", f));
          formData.append("folder", folder);

          setProgress(40);
          const data = await apiFetch("/api/v1/upload/multiple", {
            method: "POST",
            body: formData
          });

          setProgress(80);
          if (data?.success && Array.isArray(data?.data)) {
            const newUrls = data.data.map((item) => item.url);
            const currentList = Array.isArray(value) ? value : [];
            onChange([...currentList, ...newUrls].slice(0, maxFiles));
            setProgress(100);
          } else {
            setError(data?.message || "Multiple files upload failed.");
          }
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError("Network error uploading file to server.");
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

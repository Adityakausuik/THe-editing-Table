/* global FormData, confirm, console, navigator */
import { AlertCircle, Copy, Loader2, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";

export default function MediaLibraryCMS() {
  const [mediaList, setMediaList] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setError("");
    try {
      const data = await apiFetch("/api/v1/media");
      setMediaList(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch media files.");
      setMediaList([]);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    const body = new FormData();
    body.append("file", file);

    try {
      const data = await apiFetch("/api/v1/media/upload", {
        method: "POST",
        body
      });
      setMediaList((prev) => [data.data, ...prev].filter(Boolean));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload media file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete media file?")) {
      setError("");
      try {
        await apiFetch(`/api/v1/media/${id}`, {
          method: "DELETE"
        });
        fetchMedia();
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to delete media file.");
      }
    }
  };

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = mediaList.filter((m) =>
    (m.originalName || m.filename).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">Asset Management</span>
          <h1 className="font-heading text-3xl text-forest">Media Library</h1>
        </div>

        <label className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft shrink-0">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>{uploading ? "Uploading..." : "Upload New File"}</span>
          <input type="file" onChange={handleUpload} className="hidden" accept="image/*,video/*,application/pdf" />
        </label>
      </div>

      <div className="relative max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search media files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
          className="field-luxury text-sm"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 shadow-soft">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <div key={item._id} className="rounded-3xl border border-sage-border bg-sage-card p-3.5 space-y-3 shadow-soft hover:shadow-editorial transition-all duration-300">
            <img src={mediaUrl(item.url)} alt={item.originalName || item.filename} className="w-full h-44 object-cover rounded-2xl bg-forest/10" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-sage-muted truncate max-w-[140px]">{item.originalName || item.filename}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(item.url, item._id)}
                  className="p-2 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                  title="Copy URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item._id)}
                  className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {copiedId === item._id && <p className="text-[10px] text-emerald-600 font-semibold">URL Copied!</p>}
          </div>
        ))}
      </div>

      {!error && filtered.length === 0 && (
        <div className="rounded-2xl border border-sage-border bg-sage-card p-8 text-center text-sm text-sage-muted shadow-soft">
          No media files found.
        </div>
      )}
    </div>
  );
}

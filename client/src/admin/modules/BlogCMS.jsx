/* global confirm, console */
import { AlertCircle, CheckCircle2, Edit3, Eye, EyeOff, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";
import CmsOrderControls from "../components/CmsOrderControls.jsx";
import { CollectionPagination, CollectionStatusFilter, useAdminCollectionView } from "../components/AdminCollectionView.jsx";

export default function BlogCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    category: "Editorial Insights",
    authorName: "Aditya — Master Editor",
    authorAvatar: "",
    coverImage: "",
    excerpt: "",
    content: "",
    isPublished: true
  });

  const fetchBlogPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/cms/blog/admin");
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Fetch blog posts failed:", err);
      setError(err.message || "Failed to fetch blog journal posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogPosts();
  }, [fetchBlogPosts]);

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        title: item.title || "",
        category: item.category || "Editorial Insights",
        authorName: item.authorName || item.author?.name || "Aditya — Master Editor",
        authorAvatar: item.authorAvatar || item.author?.avatar || "",
        coverImage: item.coverImage || "",
        excerpt: item.excerpt || "",
        content: item.content || "",
        isPublished: item.isPublished !== undefined ? item.isPublished : item.active !== undefined ? item.active : true
      });
    } else {
      setFormData({
        title: "",
        category: "Editorial Insights",
        authorName: "Aditya — Master Editor",
        authorAvatar: "",
        coverImage: "",
        excerpt: "",
        content: "",
        isPublished: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const isNew = !editingItem;
      const url = isNew
        ? "/api/v1/cms/blog"
        : `/api/v1/cms/blog/${editingItem._id}`;
      const method = isNew ? "POST" : "PATCH";

      await apiFetch(url, {
        method,
        body: JSON.stringify({ ...formData, active: formData.isPublished })
      });

      setSavedMsg(`Journal article ${isNew ? "published" : "updated"} successfully!`);
      setTimeout(() => setSavedMsg(""), 3000);
      setIsModalOpen(false);
      fetchBlogPosts();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to save blog article.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = !(item.isPublished ?? item.active ?? true);
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/blog/${item._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: nextStatus, active: nextStatus })
      });
      fetchBlogPosts();
    } catch (err) {
      console.error("Status toggle error:", err);
      setError(err.message || "Failed to update blog article status.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this blog article?")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/blog/${id}`, {
        method: "DELETE"
      });
      setSavedMsg("Blog article deleted successfully.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchBlogPosts();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete blog article.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected blog articles?`)) return;

    setError(null);
    try {
      await apiFetch("/api/v1/cms/blog/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds })
      });

      setSelectedIds([]);
      setSavedMsg("Bulk deletion completed.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchBlogPosts();
    } catch (err) {
      console.error("Bulk delete error:", err);
      setError(err.message || "Failed to delete selected blog articles.");
    }
  };

  const {
    pageItems: filtered,
    totalItems,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages
  } = useAdminCollectionView(
    items,
    search,
    (item) => item.title,
    (item) => item.isPublished ?? item.active
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">CMS Module</span>
          <h1 className="font-serif text-3xl text-forest">Blog Journal</h1>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-4 py-2 text-xs font-semibold hover:bg-rose-700 transition cursor-pointer shadow-soft shrink-0"
            >
              <Trash2 className="h-4 w-4" /> Delete ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={fetchBlogPosts}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
            title="Refresh Journal"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft shrink-0"
          >
            <Plus className="h-4 w-4" /> Create Article
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

      <div className="relative max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search journal articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
          className="field-luxury text-sm"
        />
      </div>

      <CollectionStatusFilter value={statusFilter} onChange={setStatusFilter} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const isSelected = selectedIds.includes(item._id);
          const published = item.isPublished ?? item.active ?? true;
          return (
            <div
              key={item._id}
              className={`rounded-3xl border bg-sage-card p-5 shadow-soft hover:shadow-editorial transition-all space-y-3 relative ${
                published ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
              }`}
            >
              <div className="h-44 w-full rounded-2xl overflow-hidden bg-forest/5 border border-sage-border relative">
                {item.coverImage ? (
                  <img src={mediaUrl(item.coverImage)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-sage-muted font-semibold">
                    No Article Cover
                  </div>
                )}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    setSelectedIds((prev) =>
                      isSelected ? prev.filter((id) => id !== item._id) : [...prev, item._id]
                    )
                  }
                  className="absolute top-3 left-3 h-4 w-4 accent-copper rounded cursor-pointer z-10"
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary/70 px-2 py-0.5 rounded-full border border-[rgb(72,125,72)]/20">
                    {item.category || "Editorial Insight"}
                  </span>
                  <h3 className="font-serif text-xl text-forest font-semibold mt-1">{item.title}</h3>
                  <p className="text-xs text-sage-muted line-clamp-2 mt-1">{item.excerpt}</p>
                </div>

                <div className="flex gap-1 shrink-0">
                  <CmsOrderControls
                    collection={items}
                    setCollection={setItems}
                    itemId={item._id}
                    endpoint="/api/v1/cms/blog"
                    onError={setError}
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      published
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        : "border-warm-grey/30 text-sage-muted hover:text-forest"
                    }`}
                    title={published ? "Deactivate" : "Activate"}
                  >
                    {published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(item)}
                    className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CollectionPagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-3 sm:p-6 backdrop-blur-md">
          <div className="relative max-w-xl w-full max-h-[92vh] rounded-3xl border border-sage-light/40 bg-sage-card shadow-deep flex flex-col overflow-hidden my-auto">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-sage-border/60 bg-sage-card shrink-0">
              <h2 className="font-serif text-2xl text-forest">
                {editingItem ? "Edit Journal Article" : "Create Journal Article"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sage-muted hover:text-forest p-1.5 rounded-full hover:bg-sage-secondary transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar bg-sage-card text-left">
                <MediaUploadDropzone
                  folder="blogs"
                  value={formData.coverImage}
                  onChange={(url) => setFormData({ ...formData, coverImage: url })}
                  label="Article Cover Image"
                  description="Drag and drop article header image here"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Article Title *
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
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="field-luxury text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Excerpt / Abstract
                  </label>
                  <textarea
                    rows={2}
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="field-luxury text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Full Content (Markdown / HTML)
                  </label>
                  <textarea
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="field-luxury text-xs"
                  />
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
                  {saving ? "Publishing..." : "Publish Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

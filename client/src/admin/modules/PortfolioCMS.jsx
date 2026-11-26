/* global confirm, console */
import { AlertCircle, CheckCircle2, Edit3, Eye, EyeOff, Film, Image as ImageIcon, Plus, RefreshCw, Search, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";
import CmsOrderControls from "../components/CmsOrderControls.jsx";
import { CollectionPagination, CollectionStatusFilter, useAdminCollectionView } from "../components/AdminCollectionView.jsx";

export default function PortfolioCMS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    category: "Commercial Film",
    client: "",
    coverImage: "",
    videoUrl: "",
    description: "",
    deliverables: "",
    active: true
  });

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/cms/portfolio/admin");
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.warn("Fetch portfolio admin endpoint failed, falling back to public endpoint:", err.message);
      try {
        const publicData = await apiFetch("/api/v1/cms/portfolio");
        if (Array.isArray(publicData.data) && publicData.data.length > 0) {
          setItems(publicData.data);
          setError(null);
          return;
        }
      } catch {
        // Fall back to original error
      }
      setError(err.message || "Failed to fetch portfolio showcase items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const openModal = (item = null) => {
    setEditingItem(item);
    setModalError(null);
    if (item) {
      setFormData({
        title: item.title || "",
        category: item.category || "Commercial Film",
        client: item.client || "",
        coverImage: item.coverImage || item.thumbnail || item.image || "",
        videoUrl: item.videoUrl || "",
        description: item.description || "",
        deliverables: Array.isArray(item.deliverables) ? item.deliverables.join(", ") : item.deliverables || "",
        featured: Boolean(item.featured),
        active: item.active !== undefined ? item.active : true
      });
    } else {
      setFormData({
        title: "",
        category: "Commercial Film",
        client: "",
        coverImage: "",
        videoUrl: "",
        description: "",
        deliverables: "",
        featured: false,
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setModalError(null);
    try {
      const isNew = !editingItem;
      const targetId = editingItem?._id || editingItem?.id;
      if (!isNew && !targetId) {
        throw new Error("Unable to update: Record ID is missing.");
      }
      const url = isNew
        ? "/api/v1/cms/portfolio"
        : `/api/v1/cms/portfolio/${targetId}`;
      const method = isNew ? "POST" : "PATCH";

      const payload = {
        ...formData,
        deliverables: typeof formData.deliverables === "string"
          ? formData.deliverables.split(",").map((d) => d.trim()).filter(Boolean)
          : formData.deliverables
      };

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      setSavedMsg(`Portfolio item ${isNew ? "created" : "updated"} successfully!`);
      setTimeout(() => setSavedMsg(""), 3000);
      setIsModalOpen(false);
      fetchPortfolio();
    } catch (err) {
      console.error("Submit error:", err);
      const msg = err.message || "Failed to save portfolio item.";
      setModalError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const targetId = item?._id || item?.id;
    if (!targetId) {
      setError("Unable to update status: Record ID is missing.");
      return;
    }
    const nextStatus = !item.active;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/portfolio/${targetId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextStatus })
      });
      fetchPortfolio();
    } catch (err) {
      console.error("Status toggle error:", err);
      setError(err.message || "Failed to update portfolio status.");
    }
  };

  const handleDelete = async (rawId) => {
    const targetId = typeof rawId === "string" ? rawId : (rawId?._id || rawId?.id);
    if (!targetId) {
      setError("Unable to delete: Record ID is missing.");
      return;
    }
    if (!confirm("Are you sure you want to delete this portfolio item?")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/portfolio/${targetId}`, {
        method: "DELETE"
      });
      setSavedMsg("Portfolio item deleted successfully.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchPortfolio();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete portfolio item.");
    }
  };

  const handleBulkDelete = async () => {
    const validSelected = selectedIds.filter(Boolean);
    if (validSelected.length === 0) return;
    if (!confirm(`Delete ${validSelected.length} selected portfolio items?`)) return;

    setError(null);
    try {
      await apiFetch("/api/v1/cms/portfolio/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: validSelected })
      });

      setSelectedIds([]);
      setSavedMsg("Bulk deletion completed.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchPortfolio();
    } catch (err) {
      console.error("Bulk delete error:", err);
      setError(err.message || "Failed to delete selected portfolio items.");
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
  } = useAdminCollectionView(items, search, (item) => item.title, (item) => item.active);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">CMS Module</span>
          <h1 className="font-heading text-3xl text-forest">Portfolio Showcase</h1>
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
            onClick={fetchPortfolio}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Showcase Item
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
          placeholder="Search portfolio items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
          className="field-luxury text-sm"
        />
      </div>

      <CollectionStatusFilter value={statusFilter} onChange={setStatusFilter} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const itemId = item._id || item.id;
          const isSelected = selectedIds.includes(itemId);
          return (
            <div
              key={itemId}
              className={`rounded-3xl border bg-sage-card p-5 shadow-soft hover:shadow-editorial transition-all space-y-3 relative ${
                item.active ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
              }`}
            >
              <div className="h-40 w-full rounded-2xl overflow-hidden bg-forest/5 border border-sage-border relative">
                {item.coverImage || item.thumbnail || item.image ? (
                  <img src={mediaUrl(item.coverImage || item.thumbnail || item.image)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-sage-muted font-semibold">
                    No Cover Image
                  </div>
                )}
                {item.featured && (
                  <span className="absolute top-3 right-3 rounded-full bg-amber-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow-sm z-10">
                    <Star className="h-2.5 w-2.5 fill-white" />
                    Featured
                  </span>
                )}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    setSelectedIds((prev) =>
                      isSelected ? prev.filter((id) => id !== itemId) : [...prev, itemId]
                    )
                  }
                  className="absolute top-3 left-3 h-4 w-4 accent-copper rounded cursor-pointer z-10"
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary/70 px-2 py-0.5 rounded-full border border-[rgb(72,125,72)]/20">
                    {item.category || "Portfolio"}
                  </span>
                  <h3 className="font-serif text-xl text-forest font-semibold mt-1">{item.title}</h3>
                  <p className="text-xs text-sage-muted">{item.client}</p>
                </div>

                <div className="flex gap-1 shrink-0">
                  <CmsOrderControls
                    collection={items}
                    setCollection={setItems}
                    itemId={itemId}
                    endpoint="/api/v1/cms/portfolio"
                    onError={setError}
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      item.active
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        : "border-warm-grey/30 text-sage-muted hover:text-forest"
                    }`}
                    title={item.active ? "Deactivate" : "Activate"}
                  >
                    {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                    onClick={() => handleDelete(itemId)}
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
                {editingItem ? "Edit Showcase Item" : "Add Showcase Item"}
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
                {modalError && (
                  <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold animate-fade-in">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{modalError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalError(null)}
                      className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <MediaUploadDropzone
                    folder="portfolio"
                    value={formData.coverImage}
                    onChange={(url) => setFormData({ ...formData, coverImage: url })}
                    label="Portfolio Cover Image"
                    description="Upload high-res JPG, PNG, or WEBP cover artwork"
                  />

                  <div className="rounded-2xl border border-sage-border/80 bg-sage-secondary/30 p-4 space-y-3">
                    <label className="block text-xs font-semibold text-sage-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="h-3.5 w-3.5 text-site" />
                      Showcase Video (Direct Upload or Embed Link)
                    </label>
                    <MediaUploadDropzone
                      folder="portfolio"
                      value={formData.videoUrl?.startsWith("/uploads") ? formData.videoUrl : ""}
                      onChange={(url) => setFormData({ ...formData, videoUrl: url })}
                      label="Upload Video File (MP4, MOV, WebM)"
                      description="Chunked upload directly into Neon PostgreSQL"
                    />
                    <div>
                      <span className="text-[11px] text-sage-muted block mb-1">Or paste a Vimeo / YouTube embed URL:</span>
                      <input
                        type="text"
                        value={formData.videoUrl}
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                        className="field-luxury text-xs"
                        placeholder="e.g. https://vimeo.com/... or https://youtu.be/..."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="field-luxury text-sm font-serif"
                      placeholder="e.g. Royal Heritage Wedding"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Category *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={["Commercial Film", "Weddings", "Brand Campaign", "Photography", "Films", "Fashion Editorial", "Music Video", "Documentary"].includes(formData.category) ? formData.category : "custom"}
                        onChange={(e) => {
                          if (e.target.value !== "custom") {
                            setFormData({ ...formData, category: e.target.value });
                          }
                        }}
                        className="field-luxury text-xs flex-1"
                      >
                        <option value="Commercial Film">Commercial Film</option>
                        <option value="Weddings">Weddings</option>
                        <option value="Brand Campaign">Brand Campaign</option>
                        <option value="Photography">Photography</option>
                        <option value="Films">Films</option>
                        <option value="Fashion Editorial">Fashion Editorial</option>
                        <option value="Music Video">Music Video</option>
                        <option value="Documentary">Documentary</option>
                        <option value="custom">Custom...</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="field-luxury text-xs flex-1"
                        placeholder="Category name"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Client / Brand Name
                    </label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="field-luxury text-sm"
                      placeholder="e.g. Atelier Vance Cinema"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Deliverables (Comma Separated)
                    </label>
                    <input
                      type="text"
                      value={formData.deliverables}
                      onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                      className="field-luxury text-sm"
                      placeholder="e.g. DaVinci Color, 4K Master, Teaser"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Project Summary / Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="field-luxury text-xs"
                    placeholder="Brief background, post-production notes, and creative vision..."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-sage-border/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="portfolioFeaturedToggle"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="rounded border-sage-border text-emerald-800 focus:ring-emerald-800 h-4 w-4"
                    />
                    <label htmlFor="portfolioFeaturedToggle" className="text-xs font-semibold text-forest cursor-pointer flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      Featured on Homepage
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="portfolioActiveToggle"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded border-sage-border text-emerald-800 focus:ring-emerald-800 h-4 w-4"
                    />
                    <label htmlFor="portfolioActiveToggle" className="text-xs font-semibold text-forest cursor-pointer">
                      Published &amp; Active
                    </label>
                  </div>
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
                  {saving ? "Saving..." : "Save Portfolio Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

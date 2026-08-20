/* global confirm, console */
import { AlertCircle, CheckCircle2, Edit3, Eye, EyeOff, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";
import CmsOrderControls from "../components/CmsOrderControls.jsx";
import { CollectionPagination, CollectionStatusFilter, useAdminCollectionView } from "../components/AdminCollectionView.jsx";

export default function ServicesCMS() {
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
    slug: "",
    category: "Post-Production",
    turnaround: "48-72 Hours",
    tagline: "",
    description: "",
    image: "",
    icon: "",
    features: "",
    active: true
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/cms/services/admin");
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Fetch services failed:", err);
      setError(err.message || "Failed to fetch service suites.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        title: item.title || "",
        slug: item.slug || "",
        category: item.category || "Post-Production",
        turnaround: item.turnaround || "48-72 Hours",
        tagline: item.tagline || "",
        description: item.description || "",
        image: item.image || "",
        icon: item.icon || "",
        features: Array.isArray(item.features) ? item.features.join(", ") : item.features || "",
        active: item.active !== undefined ? item.active : true
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        category: "Post-Production",
        turnaround: "48-72 Hours",
        tagline: "",
        description: "",
        image: "",
        icon: "",
        features: "",
        active: true
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
        ? "/api/v1/cms/services"
        : `/api/v1/cms/services/${editingItem._id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload = {
        ...formData,
        features: typeof formData.features === "string"
          ? formData.features.split(",").map((f) => f.trim()).filter(Boolean)
          : formData.features
      };

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      setSavedMsg(`Service suite ${isNew ? "created" : "updated"} successfully!`);
      setTimeout(() => setSavedMsg(""), 3000);
      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to save service suite.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = !item.active;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/services/${item._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextStatus })
      });
      fetchServices();
    } catch (err) {
      console.error("Status toggle error:", err);
      setError(err.message || "Failed to update service status.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this service suite?")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/services/${id}`, {
        method: "DELETE"
      });
      setSavedMsg("Service suite deleted successfully.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchServices();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete service suite.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected service suites?`)) return;

    setError(null);
    try {
      await apiFetch("/api/v1/cms/services/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds })
      });

      setSelectedIds([]);
      setSavedMsg("Bulk deletion completed.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchServices();
    } catch (err) {
      console.error("Bulk delete error:", err);
      setError(err.message || "Failed to delete selected service suites.");
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
          <h1 className="font-serif text-3xl text-forest">Services Suite</h1>
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
            onClick={fetchServices}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
            title="Refresh Services"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Service Suite
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
          placeholder="Search services suite..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
          className="field-luxury text-sm"
        />
      </div>

      <CollectionStatusFilter value={statusFilter} onChange={setStatusFilter} />
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((service) => {
          const isSelected = selectedIds.includes(service._id);
          return (
            <div
              key={service._id}
              className={`rounded-3xl border bg-sage-card p-6 shadow-soft hover:shadow-editorial transition-all space-y-3 ${
                service.active ? "border-sage-border" : "border-rose-200 bg-rose-50/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        isSelected ? prev.filter((id) => id !== service._id) : [...prev, service._id]
                      )
                    }
                    className="h-4 w-4 accent-copper rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary/70 px-2.5 py-0.5 rounded-full border border-[rgb(72,125,72)]/20">
                    {service.category || "Service"} • {service.turnaround}
                  </span>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <CmsOrderControls
                    collection={items}
                    setCollection={setItems}
                    itemId={service._id}
                    endpoint="/api/v1/cms/services"
                    onError={setError}
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(service)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      service.active
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        : "border-warm-grey/30 text-sage-muted hover:text-forest"
                    }`}
                    title={service.active ? "Deactivate" : "Activate"}
                  >
                    {service.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(service)}
                    className="p-1.5 rounded-xl border border-sage-border text-forest hover:border-[rgb(72,125,72)] hover:text-site transition cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(service._id)}
                    className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-serif text-2xl text-forest font-semibold">{service.title}</h3>
                <p className="text-xs text-sage-muted italic">{service.tagline}</p>
                <p className="text-xs text-sage-muted line-clamp-2 mt-1">{service.description}</p>
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
                {editingItem ? "Edit Service Suite" : "Add Service Suite"}
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
                  folder="services"
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  label="Service Suite Cover Image"
                  description="Drag and drop service image here"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Service Title *
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Turnaround Speed
                    </label>
                    <input
                      type="text"
                      value={formData.turnaround}
                      onChange={(e) => setFormData({ ...formData, turnaround: e.target.value })}
                      className="field-luxury text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Tagline / Subtitle
                    </label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      className="field-luxury text-sm italic"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="field-luxury text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Key Features (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
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
                  {saving ? "Saving..." : "Save Service Suite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

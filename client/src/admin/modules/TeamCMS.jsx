/* global confirm, console */
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, mediaUrl, notifyCmsChanged } from "../../lib/api.js";
import MediaUploadDropzone from "../components/MediaUploadDropzone.jsx";
import CmsOrderControls from "../components/CmsOrderControls.jsx";
import {
  CollectionPagination,
  CollectionStatusFilter,
  useAdminCollectionView
} from "../components/AdminCollectionView.jsx";

export default function TeamCMS() {
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
    name: "",
    role: "Senior Colorist & Editor",
    category: "Editorial Artist",
    avatar: "",
    bio: "",
    active: true
  });

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/v1/cms/team/admin");
      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("Fetch team failed:", err);
      setError(err.message || "Failed to fetch team members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        name: item.name || item.fullName || "",
        role: item.role || item.designation || item.title || "Senior Colorist & Editor",
        category: item.category || "Editorial Artist",
        avatar: item.avatar || item.profileImage || item.image || "",
        bio: item.bio || item.shortBio || item.description || "",
        active: item.active !== undefined ? item.active : true
      });
    } else {
      setFormData({
        name: "",
        role: "Senior Colorist & Editor",
        category: "Editorial Artist",
        avatar: "",
        bio: "",
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
      const url = isNew ? "/api/v1/cms/team" : `/api/v1/cms/team/${editingItem._id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload = {
        fullName: formData.name,
        name: formData.name,
        designation: formData.role,
        role: formData.role,
        category: formData.category,
        profileImage: formData.avatar,
        avatar: formData.avatar,
        shortBio: formData.bio,
        bio: formData.bio,
        active: formData.active
      };

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      notifyCmsChanged("team");
      setSavedMsg(`Team member ${isNew ? "added" : "updated"} successfully!`);
      setTimeout(() => setSavedMsg(""), 3000);
      setIsModalOpen(false);
      fetchTeam();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to save team member.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = !item.active;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/team/${item._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextStatus })
      });
      notifyCmsChanged("team");
      fetchTeam();
    } catch (err) {
      console.error("Status toggle error:", err);
      setError(err.message || "Failed to update team member status.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this team member profile?")) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/cms/team/${id}`, {
        method: "DELETE"
      });
      notifyCmsChanged("team");
      setSavedMsg("Team member deleted successfully.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete team member.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected team members?`)) return;

    setError(null);
    try {
      await apiFetch("/api/v1/cms/team/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds })
      });

      notifyCmsChanged("team");
      setSelectedIds([]);
      setSavedMsg("Bulk deletion completed.");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Bulk delete error:", err);
      setError(err.message || "Failed to delete selected team members.");
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
    (item) => item.name || item.fullName,
    (item) => item.active
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/90 px-3 py-1 mb-1 shadow-soft">
            <Users className="h-3.5 w-3.5 text-site" />
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              Studio Artists &amp; Team
            </span>
          </div>
          <h1 className="font-heading text-3xl text-forest font-normal">Team Members</h1>
          <p className="text-xs text-sage-muted mt-0.5">
            Manage artists, colorists, and post-production specialists displayed on the About page.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/about#team"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-sage-border bg-sage-card text-xs font-semibold text-forest hover:border-[rgb(72,125,72)] hover:text-site transition shadow-soft"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>View on About Page</span>
          </Link>

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
            onClick={fetchTeam}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
            title="Refresh Team"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#7C9B69] hover:shadow-sage transition cursor-pointer shadow-soft shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Team Member
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.75rem" }}
            className="field-luxury text-sm"
          />
        </div>

        <CollectionStatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-sage-border p-12 text-center bg-sage-card/50 space-y-3">
          <Users className="h-10 w-10 text-sage-muted mx-auto" />
          <h3 className="font-heading text-lg text-forest">No team members found</h3>
          <p className="text-xs text-sage-muted max-w-sm mx-auto">
            {search ? "No members match your search criteria." : "Get started by adding your first team member profile."}
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-5 py-2 text-xs font-semibold hover:bg-[#7C9B69] transition cursor-pointer shadow-soft"
          >
            <Plus className="h-3.5 w-3.5" /> Add Team Member
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isSelected = selectedIds.includes(item._id);
            const portrait = item.avatar || item.profileImage || item.image;
            const displayName = item.name || item.fullName || "Unnamed Artist";
            const displayRole = item.role || item.designation || "Artist";

            return (
              <div
                key={item._id}
                className={`rounded-3xl border bg-sage-card p-5 shadow-soft hover:shadow-editorial transition-all space-y-3 relative ${
                  item.active ? "border-sage-border" : "border-rose-200 bg-rose-50/20 opacity-80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        isSelected ? prev.filter((id) => id !== item._id) : [...prev, item._id]
                      )
                    }
                    className="h-4 w-4 accent-copper rounded cursor-pointer shrink-0"
                    aria-label={`Select ${displayName}`}
                  />

                  <div className="h-14 w-14 rounded-2xl overflow-hidden bg-forest/5 border border-sage-border shrink-0">
                    {portrait ? (
                      <img src={mediaUrl(portrait)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-heading text-xl font-bold text-site">
                        {displayName[0]}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-lg text-forest font-semibold truncate">
                      {displayName}
                    </h3>
                    <p className="text-xs text-site font-semibold truncate">{displayRole}</p>
                    {item.category && (
                      <span className="inline-block text-[10px] uppercase tracking-wider text-sage-muted">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <CmsOrderControls
                      collection={items}
                      setCollection={(updated) => {
                        setItems(updated);
                        notifyCmsChanged("team");
                      }}
                      itemId={item._id}
                      endpoint="/api/v1/cms/team"
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
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {(item.bio || item.shortBio) && (
                  <p className="text-xs text-sage-muted line-clamp-2 pt-1 border-t border-sage-border/40">
                    {item.bio || item.shortBio}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CollectionPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-3 sm:p-6 backdrop-blur-md">
          <div className="relative max-w-xl w-full max-h-[92vh] rounded-3xl border border-sage-border bg-sage-card shadow-deep flex flex-col overflow-hidden my-auto">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-sage-border/60 bg-sage-card shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-site">
                  {editingItem ? "Update Profile" : "New Team Member"}
                </span>
                <h2 className="font-heading text-2xl text-forest">
                  {editingItem ? "Edit Team Member" : "Add Team Member"}
                </h2>
              </div>
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
                  folder="team"
                  value={formData.avatar}
                  onChange={(url) => setFormData({ ...formData, avatar: url })}
                  label="Team Member Portrait"
                  description="Drag and drop artist portrait photo here (high-res square or 4:5 portrait)"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Elena Rostova"
                      className="field-luxury text-sm font-heading"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Role / Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="e.g. Lead DaVinci Colorist"
                      className="field-luxury text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Category / Department
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g. Color Science, Editorial, Sound"
                      className="field-luxury text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                      Profile Image URL (Alternative)
                    </label>
                    <input
                      type="text"
                      value={formData.avatar}
                      onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                      placeholder="/assets/... or https://..."
                      className="field-luxury text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                    Bio / Specialty Summary *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief description of artistic specialty, experience, or focus..."
                    className="field-luxury text-xs leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="relative flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="h-4 w-4 accent-copper rounded cursor-pointer"
                    />
                    <span className="text-xs font-medium text-forest">
                      Visible on Public About Page (Active)
                    </span>
                  </label>
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
                  {saving ? "Saving..." : editingItem ? "Update Member" : "Save Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

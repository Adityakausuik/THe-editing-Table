/* global Blob, confirm, console, alert */
import {
  BadgeCheck,
  Check,
  Download,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiFetchBlob } from "../../lib/api.js";

export default function ReviewsCMS() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, hidden: 0, averageRating: 0 });
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [replyReview, setReplyReview] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const recalculateStats = (items) => {
    const total = items.length;
    const pending = items.filter((r) => r.status === "pending").length;
    const approved = items.filter((r) => r.status === "approved").length;
    const rejected = items.filter((r) => r.status === "rejected").length;
    const hidden = items.filter((r) => r.status === "hidden").length;
    const approvedRatings = items.filter((r) => r.status === "approved").map((r) => r.rating || 5);
    const avg = approvedRatings.length ? approvedRatings.reduce((a, b) => a + b, 0) / approvedRatings.length : 0;

    setStats({ total, pending, approved, rejected, hidden, averageRating: Number(avg.toFixed(1)) });
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/v1/reviews/admin?limit=100";
      if (selectedStatus !== "all") url += `&status=${selectedStatus}`;
      if (selectedRating !== "all") url += `&rating=${selectedRating}`;

      const data = await apiFetch(url);
      const records = Array.isArray(data.data?.items) ? data.data.items : [];
      setReviews(records);
      recalculateStats(records);
    } catch (err) {
      console.error("Fetch reviews failed:", err);
      setReviews([]);
      recalculateStats([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedRating]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch("/api/v1/reviews/admin/stats");
      if (data.data) setStats(data.data);
    } catch {
      // Recalculate local stats if the stats endpoint fails.
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [fetchReviews, fetchStats]);

  // --- ACTIONS WITH OPTIMISTIC UPDATES ---

  const handleApprove = async (id) => {
    setReviews((prev) => {
      const next = prev.map((r) => (r._id === id ? { ...r, status: "approved" } : r));
      recalculateStats(next);
      return next;
    });

    try {
      await apiFetch(`/api/v1/reviews/admin/${id}/approve`, { method: "PATCH" });
    } catch (err) {
      console.error("Approve API call background synced:", err);
    }
  };

  const handleReject = async (id) => {
    setReviews((prev) => {
      const next = prev.map((r) => (r._id === id ? { ...r, status: "rejected", featured: false } : r));
      recalculateStats(next);
      return next;
    });

    try {
      await apiFetch(`/api/v1/reviews/admin/${id}/reject`, { method: "PATCH" });
    } catch (err) {
      console.error("Reject API call background synced:", err);
    }
  };

  const handleToggleFeature = async (id) => {
    const item = reviews.find((r) => r._id === id);
    if (!item) return;

    if (item.status !== "approved" && !item.featured) {
      alert("Only approved reviews can be featured on the public website. Please approve this endorsement first.");
      return;
    }

    setReviews((prev) =>
      prev.map((r) => (r._id === id ? { ...r, featured: !r.featured } : r))
    );

    try {
      await apiFetch(`/api/v1/reviews/admin/${id}/feature`, { method: "PATCH" });
    } catch (err) {
      console.error("Feature API call background synced:", err);
    }
  };

  const handleToggleVerify = async (id) => {
    setReviews((prev) =>
      prev.map((r) => (r._id === id ? { ...r, verified: !r.verified } : r))
    );

    try {
      await apiFetch(`/api/v1/reviews/admin/${id}/verify`, { method: "PATCH" });
    } catch (err) {
      console.error("Verify API call background synced:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this client endorsement?")) return;

    setReviews((prev) => {
      const next = prev.filter((r) => r._id !== id);
      recalculateStats(next);
      return next;
    });

    try {
      await apiFetch(`/api/v1/reviews/admin/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete API call background synced:", err);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyReview) return;

    const targetId = replyReview._id;
    const replyObj = {
      message: replyMessage,
      repliedAt: new Date(),
      repliedBy: "Studio Admin"
    };

    setReviews((prev) =>
      prev.map((r) => (r._id === targetId ? { ...r, adminReply: replyObj } : r))
    );

    setReplyReview(null);
    setReplyMessage("");

    try {
      await apiFetch(`/api/v1/reviews/admin/${targetId}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ replyMessage })
      });
    } catch (err) {
      console.error("Reply API call background synced:", err);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    if (action === "delete" && !confirm(`Permanently delete ${selectedIds.length} selected reviews?`)) {
      return;
    }

    setReviews((prev) => {
      let next = [...prev];
      if (action === "approve") {
        next = next.map((r) => (selectedIds.includes(r._id) ? { ...r, status: "approved" } : r));
      } else if (action === "reject") {
        next = next.map((r) => (selectedIds.includes(r._id) ? { ...r, status: "rejected", featured: false } : r));
      } else if (action === "feature") {
        next = next.map((r) =>
          selectedIds.includes(r._id) && r.status === "approved" ? { ...r, featured: true } : r
        );
      } else if (action === "delete") {
        next = next.filter((r) => !selectedIds.includes(r._id));
      }
      recalculateStats(next);
      return next;
    });

    const currentIds = [...selectedIds];
    setSelectedIds([]);

    try {
      await apiFetch("/api/v1/reviews/admin/bulk-action", {
        method: "POST",
        body: JSON.stringify({ ids: currentIds, action })
      });
    } catch (err) {
      console.error("Bulk API action background synced:", err);
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await apiFetchBlob("/api/v1/reviews/admin/export-csv");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "client-endorsements.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      return;
    } catch {
      // Fallback client-side CSV download
    }

    const headers = ["ID", "Name", "Email", "Company", "Service", "Rating", "Title", "Message", "Status", "Verified", "Featured"];
    const rows = reviews.map((r) => [
      `'${r._id}`,
      `'${r.name || ""}`,
      `'${r.email || ""}`,
      `'${r.company || ""}`,
      `'${r.projectType || ""}`,
      r.rating || 5,
      `'${(r.title || "").replace(/"/g, '""')}`,
      `'${(r.message || "").replace(/"/g, '""')}`,
      r.status,
      r.verified ? "YES" : "NO",
      r.featured ? "YES" : "NO"
    ]);

    const csvStr = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "client-endorsements-export.csv";
    link.click();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReviews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReviews.map((r) => r._id));
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredReviews = reviews.filter((r) => {
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    if (selectedRating !== "all" && String(r.rating) !== String(selectedRating)) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.email && r.email.toLowerCase().includes(term)) ||
      (r.title && r.title.toLowerCase().includes(term)) ||
      (r.company && r.company.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage-border pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-site">CMS Module</span>
          <h1 className="font-serif text-3xl text-forest">Client Endorsements Moderation</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchReviews}
            className="p-2.5 rounded-2xl border border-sage-border bg-sage-card text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-site" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/40 bg-sage-secondary/70 px-4 py-2.5 text-xs font-semibold text-site hover:bg-[rgb(72,125,72)] hover:text-white transition cursor-pointer shadow-soft"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl border border-sage-border bg-sage-card p-5 space-y-1 shadow-soft">
          <p className="text-xs text-sage-muted uppercase tracking-wider font-semibold">Total Submissions</p>
          <p className="font-serif text-3xl text-forest">{stats.total}</p>
        </div>

        <div className="rounded-3xl border border-sage-border bg-sage-secondary/60 p-5 space-y-1 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs text-site uppercase tracking-wider font-semibold">Pending Approval</p>
            {stats.pending > 0 && (
              <span className="h-2 w-2 rounded-full bg-[rgb(72,125,72)] animate-ping" />
            )}
          </div>
          <p className="font-serif text-3xl text-forest font-bold">{stats.pending}</p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-1 shadow-soft">
          <p className="text-xs text-emerald-800 uppercase tracking-wider font-semibold">Approved Public</p>
          <p className="font-serif text-3xl text-emerald-900 font-bold">{stats.approved}</p>
        </div>

        <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 space-y-1 shadow-soft">
          <p className="text-xs text-rose-800 uppercase tracking-wider font-semibold">Rejected</p>
          <p className="font-serif text-3xl text-rose-900">{stats.rejected}</p>
        </div>

        <div className="rounded-3xl border border-sage-border bg-sage-card p-5 space-y-1 shadow-soft">
          <p className="text-xs text-sage-muted uppercase tracking-wider font-semibold">Average Rating</p>
          <div className="flex items-center gap-2">
            <p className="font-serif text-3xl text-forest">{stats.averageRating ? stats.averageRating.toFixed(1) : "5.0"}</p>
            <Star className="h-5 w-5 fill-copper text-site" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search client name, email, or headline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.75rem" }}
            className="field-luxury text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-sage-muted shrink-0 ml-1" />
          {["all", "pending", "approved", "rejected", "hidden"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                selectedStatus === st
                  ? "bg-[rgb(72,125,72)] text-white shadow-soft"
                  : "border border-sage-border bg-sage-card text-sage-muted hover:text-forest"
              }`}
            >
              {st}
            </button>
          ))}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="rounded-full border border-sage-border bg-sage-card px-3 py-2 text-xs text-forest outline-none focus:border-[rgb(72,125,72)] ml-2 cursor-pointer"
          >
            <option value="all">All Stars</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="rounded-2xl border border-[rgb(72,125,72)]/30 bg-sage-secondary/90 p-3 flex items-center justify-between gap-4 shadow-soft">
          <span className="text-xs font-semibold text-forest">
            {selectedIds.length} review(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkAction("approve")}
              className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition cursor-pointer"
            >
              Bulk Approve
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction("reject")}
              className="px-3.5 py-1.5 rounded-full bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition cursor-pointer"
            >
              Bulk Reject
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction("feature")}
              className="px-3.5 py-1.5 rounded-full bg-[rgb(72,125,72)] text-white text-xs font-semibold hover:bg-[#7C9B69] transition cursor-pointer"
            >
              Bulk Feature
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction("delete")}
              className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition cursor-pointer"
            >
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl border border-sage-border bg-sage-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sage-secondary/60 border-b border-sage-border text-forest font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredReviews.length && filteredReviews.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-sage-border text-site focus:ring-[rgb(72,125,72)] cursor-pointer"
                  />
                </th>
                <th className="p-4">Client</th>
                <th className="p-4">Rating & Review</th>
                <th className="p-4">Service</th>
                <th className="p-4">Status</th>
                <th className="p-4">Verified</th>
                <th className="p-4">Featured</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm/60 text-forest">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sage-muted">
                    Loading reviews...
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sage-muted">
                    No endorsements found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r) => (
                  <tr key={r._id} className="hover:bg-sage-bg/50 transition">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r._id)}
                        onChange={() => toggleSelectId(r._id)}
                        className="rounded border-sage-border text-site focus:ring-[rgb(72,125,72)] cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-medium">
                      <p className="text-sm font-semibold text-forest">{r.name}</p>
                      <p className="text-[11px] text-sage-muted">{r.email}</p>
                      {r.company && <p className="text-[10px] text-site font-semibold">{r.company}</p>}
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="flex items-center gap-1 text-site mb-1">
                        {Array.from({ length: r.rating || 5 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-copper text-site" />
                        ))}
                      </div>
                      <p className="font-semibold text-forest text-xs truncate">{r.title}</p>
                      <p className="text-sage-muted text-[11px] line-clamp-2">{r.message}</p>
                      {r.adminReply?.message && (
                        <div className="mt-1.5 p-2 rounded-xl bg-sage-secondary/70 border border-sage-light/40 text-[10px] text-forest">
                          <span className="font-bold text-site">Admin Reply: </span>
                          {r.adminReply.message}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-site">{r.projectType}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "approved"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : r.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-sage-secondary text-sage-muted border border-sage-border"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleToggleVerify(r._id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                          r.verified
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                            : "bg-sage-secondary/40 border-sage-border text-sage-muted hover:border-[rgb(72,125,72)]"
                        }`}
                      >
                        <BadgeCheck className={`h-3 w-3 ${r.verified ? "text-emerald-600" : "text-sage-muted"}`} />
                        {r.verified ? "Verified" : "Unverified"}
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(r._id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                          r.featured
                            ? "bg-[rgb(72,125,72)] text-white border-[rgb(72,125,72)] shadow-soft hover:bg-[#7C9B69]"
                            : "bg-sage-secondary/40 border-sage-border text-sage-muted hover:border-[rgb(72,125,72)]"
                        }`}
                      >
                        <Star className={`h-3 w-3 ${r.featured ? "fill-warm-white text-white" : "text-sage-muted"}`} />
                        {r.featured ? "Featured" : "Standard"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(r._id)}
                            className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                            title="Approve Review"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => handleReject(r._id)}
                            className="p-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                            title="Reject Review"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setReplyReview(r);
                            setReplyMessage(r.adminReply?.message || "");
                          }}
                          className="p-1.5 rounded-lg border border-sage-border text-forest hover:border-[rgb(72,125,72)] transition cursor-pointer"
                          title="Admin Reply"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r._id)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Review"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Reply Modal */}
      {replyReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 p-4 backdrop-blur-md">
          <div className="relative max-w-md w-full rounded-3xl border border-sage-light/40 bg-sage-card p-6 space-y-4 shadow-deep">
            <button
              type="button"
              onClick={() => setReplyReview(null)}
              className="absolute top-4 right-4 text-sage-muted hover:text-forest p-1 rounded-full cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="font-serif text-2xl text-forest">Reply to Endorsement</h2>
            <p className="text-xs text-sage-muted">Client: <span className="font-semibold text-forest">{replyReview.name}</span></p>

            <form onSubmit={handleReplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-sage-muted mb-1 uppercase tracking-wider">
                  Admin Response *
                </label>
                <textarea
                  required
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="field-luxury text-sm"
                  placeholder="Thank you for sharing your experience with our team..."
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-[rgb(72,125,72)] text-white px-6 py-3 text-xs font-semibold hover:bg-[#7C9B69] transition cursor-pointer shadow-soft"
              >
                Save Admin Reply
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

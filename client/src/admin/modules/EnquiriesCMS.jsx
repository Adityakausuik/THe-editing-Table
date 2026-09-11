/* global confirm */
import { Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";

const enquiryStatuses = [
  ["pending", "Pending"],
  ["contacted", "Contacted"],
  ["in_progress", "In Progress"],
  ["completed", "Completed"],
  ["archived", "Archived"]
];

export default function EnquiriesCMS() {
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/v1/cms/enquiries");
      setEnquiries(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setEnquiries([]);
      setError(requestError.message || "Enquiries could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleStatusChange = async (id, status) => {
    setError("");
    try {
      const response = await apiFetch(`/api/v1/cms/enquiries/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setEnquiries((current) => current.map((item) => (item._id === id ? response.data : item)));
    } catch (requestError) {
      setError(requestError.message || "Enquiry status could not be updated.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete client enquiry?")) return;
    setError("");
    try {
      await apiFetch(`/api/v1/cms/enquiries/${id}`, { method: "DELETE" });
      setEnquiries((current) => current.filter((item) => item._id !== id));
    } catch (requestError) {
      setError(requestError.message || "Enquiry could not be deleted.");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = enquiries.filter((item) =>
    [item.name, item.email].some((value) => String(value || "").toLowerCase().includes(normalizedSearch))
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-sage-border pb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-site">CMS Inbox</span>
        <h1 className="font-heading text-3xl text-forest">Client Enquiries</h1>
      </div>

      <div className="relative max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-muted z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search client name or email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ paddingLeft: "2.75rem" }}
          className="field-luxury text-sm"
        />
      </div>

      {loading && <p className="text-sm text-sage-muted">Loading enquiries...</p>}
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-sage-muted">No enquiries found.</p>
      )}

      <div className="rounded-3xl border border-sage-border bg-sage-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sage-secondary/60 border-b border-sage-border text-forest font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Client Name</th>
                <th className="p-4">Service</th>
                <th className="p-4">Budget</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-warm/60 text-forest">
              {filtered.map((enquiry) => (
                <tr key={enquiry._id} className="hover:bg-sage-bg/50 transition">
                  <td className="p-4 font-semibold">
                    <p className="text-sm text-forest">{enquiry.name}</p>
                    <p className="text-sage-muted text-[11px] font-normal">
                      {enquiry.email}{enquiry.phone ? ` | ${enquiry.phone}` : ""}
                    </p>
                  </td>
                  <td className="p-4 font-medium text-site">{enquiry.service}</td>
                  <td className="p-4 font-medium">{enquiry.budget}</td>
                  <td className="p-4">
                    <select
                      value={enquiry.status}
                      onChange={(event) => handleStatusChange(enquiry._id, event.target.value)}
                      className="rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/70 px-3 py-1 text-[11px] font-semibold text-forest outline-none"
                    >
                      {enquiryStatuses.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(enquiry._id)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      aria-label={`Delete enquiry from ${enquiry.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

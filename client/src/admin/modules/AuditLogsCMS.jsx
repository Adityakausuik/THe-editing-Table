/* global clearTimeout, URLSearchParams */
import { Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import { Feedback, Header } from "./SecurityProfile.jsx";

export default function AuditLogsCMS() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", action: "", result: "", from: "", to: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const response = await apiFetch(`/api/v1/security/audit-logs?${params}`);
      setLogs(response.data || []);
      setError("");
    } catch (requestError) { setError(requestError.message); }
  }, [filters]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  return <div className="space-y-6">
    <Header eyebrow="Super Admin → Security" title="Security Audit Logs" description="Search authentication, two-factor, recovery, lockout, trusted-device, session, and policy events." />
    <Feedback error={error} />
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <label className="relative md:col-span-2"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-muted" /><input className="field-luxury text-sm" style={{ paddingLeft: "2.75rem" }} placeholder="User, action, or entity" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
      <select className="field-luxury text-sm" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}><option value="">All roles</option><option value="superadmin">Super Admin</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="user">User</option></select>
      <select className="field-luxury text-sm" value={filters.result} onChange={(event) => setFilters({ ...filters, result: event.target.value })}><option value="">All results</option><option value="success">Success</option><option value="failure">Failure</option><option value="info">Information</option></select>
      <input type="date" className="field-luxury text-sm" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} aria-label="From date" />
      <input type="date" className="field-luxury text-sm" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} aria-label="To date" />
    </div>
    <div className="overflow-x-auto rounded-3xl border border-sage-border bg-sage-card shadow-soft">
      <table className="w-full min-w-[1050px] text-left text-xs"><thead className="border-b border-sage-border bg-sage-secondary/50 uppercase tracking-wider text-sage-muted"><tr><th className="p-4">Timestamp</th><th className="p-4">User / Role</th><th className="p-4">Event</th><th className="p-4">Result</th><th className="p-4">IP Address</th><th className="p-4">Device / Browser</th></tr></thead>
        <tbody className="divide-y divide-sage-border">{logs.map((log) => <tr key={log._id} className="hover:bg-sage-secondary/20"><td className="p-4 text-sage-muted">{new Date(log.createdAt).toLocaleString()}</td><td className="p-4"><p className="font-semibold text-forest">{log.userEmail || "System"}</p><p className="uppercase text-site">{log.role || "system"}</p></td><td className="p-4"><p className="font-semibold text-forest">{log.action.replaceAll("_", " ")}</p><p className="text-sage-muted">{log.entity}</p></td><td className="p-4"><span className={`rounded-full px-2.5 py-1 font-semibold ${log.result === "failure" ? "bg-rose-50 text-rose-700" : log.result === "success" ? "bg-emerald-50 text-emerald-700" : "bg-sage-secondary text-site"}`}>{log.result || "success"}</span></td><td className="p-4 font-mono text-sage-muted">{log.ipAddress || "Unknown"}</td><td className="max-w-sm truncate p-4 text-sage-muted" title={log.userAgent}>{log.userAgent || "Unknown"}</td></tr>)}</tbody>
      </table>
      {!logs.length && <div className="p-10 text-center text-sm text-sage-muted"><ShieldCheck className="mx-auto mb-2 h-5 w-5" />No security events match these filters.</div>}
    </div>
  </div>;
}

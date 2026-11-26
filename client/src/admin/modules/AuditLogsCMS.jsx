/* global clearTimeout, URLSearchParams, navigator */
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Laptop,
  LogIn,
  Search,
  ShieldCheck,
  Smartphone,
  UserCheck
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import { Feedback, Header } from "./SecurityProfile.jsx";

const PAGE_SIZE = 20;

export default function AuditLogsCMS() {
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "logins" | "navigation"
  const [filters, setFilters] = useState({ search: "", role: "", action: "", result: "", from: "", to: "" });
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const response = await apiFetch(`/api/v1/security/audit-logs?${params}`);
      setLogs(response.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Tab-filtered logs
  const tabFilteredLogs = useMemo(() => {
    if (activeTab === "logins") {
      return logs.filter((log) =>
        log.action?.includes("LOGIN") ||
        log.action?.includes("PASSWORD") ||
        log.action?.includes("TWO_FACTOR") ||
        log.action?.includes("SESSION")
      );
    }
    if (activeTab === "navigation") {
      return logs.filter((log) =>
        log.action === "VIEW_SECTION" ||
        log.entity === "AdminNavigation"
      );
    }
    return logs;
  }, [logs, activeTab]);

  // Pagination
  const totalPages = Math.ceil(tabFilteredLogs.length / PAGE_SIZE) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return tabFilteredLogs.slice(start, start + PAGE_SIZE);
  }, [tabFilteredLogs, currentPage]);

  const parseDeviceMeta = (log) => {
    const details = log.details || {};
    const browser = details.browser;
    const os = details.os;
    const device = details.device;

    if (browser && os) {
      return `${os} • ${browser} (${device || "Desktop"})`;
    }
    return log.userAgent || "Unknown Device";
  };

  return (
    <div className="space-y-6">
      <Header
        eyebrow="Super Admin → Security & Audit"
        title="Admin Activity & Security Logs"
        description="Comprehensive audit trail tracking administrator logins, IP addresses, browser/device signatures, page navigation, and security modifications."
      />

      <Feedback error={error} />

      {/* Tabs */}
      <div className="flex border-b border-sage-border">
        <button
          type="button"
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "all"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <Activity className="h-4 w-4" />
          All Audit Logs ({logs.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("logins"); setCurrentPage(1); }}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "logins"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <LogIn className="h-4 w-4" />
          Login &amp; Session History
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("navigation"); setCurrentPage(1); }}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition cursor-pointer ${
            activeTab === "navigation"
              ? "border-emerald-900 text-emerald-950"
              : "border-transparent text-sage-muted hover:text-emerald-950"
          }`}
        >
          <Globe className="h-4 w-4" />
          Admin Page Visits
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-muted pointer-events-none" />
          <input
            className="field-luxury text-sm"
            style={{ paddingLeft: "2.75rem" }}
            placeholder="Search email, action, IP, or section..."
            value={filters.search}
            onChange={(event) => { setFilters({ ...filters, search: event.target.value }); setCurrentPage(1); }}
          />
        </label>
        <select
          className="field-luxury text-sm"
          value={filters.role}
          onChange={(event) => { setFilters({ ...filters, role: event.target.value }); setCurrentPage(1); }}
        >
          <option value="">All roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="user">User</option>
        </select>
        <select
          className="field-luxury text-sm"
          value={filters.result}
          onChange={(event) => { setFilters({ ...filters, result: event.target.value }); setCurrentPage(1); }}
        >
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="info">Information</option>
        </select>
        <input
          type="date"
          className="field-luxury text-sm"
          value={filters.from}
          onChange={(event) => { setFilters({ ...filters, from: event.target.value }); setCurrentPage(1); }}
          aria-label="From date"
        />
        <input
          type="date"
          className="field-luxury text-sm"
          value={filters.to}
          onChange={(event) => { setFilters({ ...filters, to: event.target.value }); setCurrentPage(1); }}
          aria-label="To date"
        />
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-3xl border border-sage-border bg-sage-card shadow-soft">
        <table className="w-full min-w-[1050px] text-left text-xs">
          <thead className="border-b border-sage-border bg-sage-secondary/50 uppercase tracking-wider text-sage-muted">
            <tr>
              <th className="p-4">Timestamp</th>
              <th className="p-4">User &amp; Role</th>
              <th className="p-4">Event &amp; Section</th>
              <th className="p-4">Status</th>
              <th className="p-4">IP Address</th>
              <th className="p-4">Device &amp; Browser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage-border">
            {paginatedLogs.map((log) => {
              const details = log.details || {};
              const isNav = log.action === "VIEW_SECTION" || log.entity === "AdminNavigation";
              const isLogin = log.action?.includes("LOGIN");

              return (
                <tr key={log._id || log.id} className="hover:bg-sage-secondary/20 transition-colors">
                  <td className="p-4 text-sage-muted font-mono whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-forest flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-site" />
                      {log.userEmail || "System"}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-site mt-0.5 tracking-wider">
                      {log.role || "system"}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-forest flex items-center gap-1.5">
                      {isLogin ? (
                        <LogIn className="h-3.5 w-3.5 text-emerald-700" />
                      ) : isNav ? (
                        <Globe className="h-3.5 w-3.5 text-blue-600" />
                      ) : (
                        <Activity className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      {log.action.replaceAll("_", " ")}
                    </p>
                    <p className="text-sage-muted text-[11px] mt-0.5">
                      {isNav
                        ? `Opened: ${details.section || details.path || log.entityId || "Dashboard"}`
                        : `${log.entity}${log.entityId ? ` (${log.entityId.slice(0, 12)}...)` : ""}`}
                    </p>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold text-[11px] ${
                        log.result === "failure"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : log.result === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-sage-secondary text-site border border-sage-border"
                      }`}
                    >
                      {log.result === "failure" ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {log.result || "success"}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sage-muted whitespace-nowrap">
                    <span className="rounded bg-sage-secondary/80 px-2 py-0.5 text-[11px] border border-sage-border">
                      {log.ipAddress || "127.0.0.1"}
                    </span>
                  </td>
                  <td className="max-w-sm truncate p-4 text-sage-muted" title={log.userAgent}>
                    <div className="flex items-center gap-1.5">
                      {details.device === "Mobile" ? (
                        <Smartphone className="h-3.5 w-3.5 text-site shrink-0" />
                      ) : (
                        <Laptop className="h-3.5 w-3.5 text-site shrink-0" />
                      )}
                      <span className="truncate">{parseDeviceMeta(log)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && !paginatedLogs.length && (
          <div className="p-12 text-center text-sm text-sage-muted">
            <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-emerald-800 opacity-60" />
            No audit records match the current filters.
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-sage-border/60 bg-sage-card text-xs">
            <span className="text-sage-muted">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(currentPage * PAGE_SIZE, tabFilteredLogs.length)} of {tabFilteredLogs.length} events
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-sage-border hover:bg-sage-secondary disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-forest">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-sage-border hover:bg-sage-secondary disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* global clearTimeout, confirm, URLSearchParams */
import { Filter, LockKeyhole, RefreshCw, Search, ShieldAlert, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import { Card, Feedback, Header } from "./SecurityProfile.jsx";

export default function TwoFactorAdmin() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", status: "" });
  const [credentials, setCredentials] = useState({ password: "", code: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const response = await apiFetch(`/api/v1/security/admin/users?${params}`);
      setUsers(response.data || []);
      setError("");
    } catch (requestError) { setError(requestError.message); }
  }, [filters]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  const act = async (user, path, body = {}) => {
    try {
      const response = await apiFetch(`/api/v1/security/admin/users/${user.id}/${path}`, { method: path === "requirement" ? "PATCH" : "POST", body: JSON.stringify({ ...body, ...credentials }) });
      setNotice(response.message);
      setError("");
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <div className="space-y-6">
      <Header eyebrow="Admin → Security" title="Two-Factor Authentication" description="Review security posture, enforce setup, revoke access, reset protected accounts, and unlock verified users." />
      <Feedback error={error} notice={notice} />
      <Card title="Security Verification" icon={LockKeyhole}>
        <p className="text-xs text-sage-muted">Every sensitive admin action requires your own password and current 2FA or recovery code.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="password" className="field-luxury text-sm" placeholder="Your password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} />
          <input className="field-luxury text-sm" placeholder="Your 2FA / recovery code" value={credentials.code} onChange={(event) => setCredentials({ ...credentials, code: event.target.value })} />
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <label className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-muted" /><input className="field-luxury text-sm" style={{ paddingLeft: "2.75rem" }} placeholder="Search name or email" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
        <select className="field-luxury text-sm" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}><option value="">All roles</option><option value="superadmin">Super Admin</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="client">Client</option><option value="user">User</option></select>
        <select className="field-luxury text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All 2FA states</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-sage-border bg-sage-card shadow-soft">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="border-b border-sage-border bg-sage-secondary/50 uppercase tracking-wider text-sage-muted"><tr><th className="p-4">Account</th><th className="p-4">Role / Status</th><th className="p-4">2FA</th><th className="p-4">Last Authentication</th><th className="p-4">IP / Failures</th><th className="p-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-sage-border">
            {users.map((user) => <tr key={user.id} className="align-top hover:bg-sage-secondary/20">
              <td className="p-4"><p className="font-semibold text-forest">{user.name}</p><p className="text-sage-muted">{user.email}</p></td>
              <td className="p-4"><p className="font-semibold uppercase text-site">{user.role}</p><p className={user.isActive ? "text-emerald-700" : "text-rose-700"}>{user.isActive ? "Active" : "Disabled"}</p>{user.isLocked && <p className="text-rose-700">Locked</p>}</td>
              <td className="p-4"><p className={user.twoFactorEnabled ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{user.twoFactorEnabled ? "Enabled" : "Disabled"}</p><p className="text-sage-muted">{user.twoFactorMethod || "No method"}{user.twoFactorRequired ? " · required" : ""}</p>{user.twoFactorActivatedAt && <p className="text-sage-muted">Since {new Date(user.twoFactorActivatedAt).toLocaleDateString()}</p>}</td>
              <td className="p-4 text-sage-muted">{user.lastSuccessfulAuthentication ? new Date(user.lastSuccessfulAuthentication).toLocaleString() : "Never"}</td>
              <td className="p-4"><p className="font-mono text-sage-muted">{user.lastLoginIp || "Unknown"}</p><p className={user.failedVerificationAttempts ? "text-rose-700" : "text-sage-muted"}>{user.failedVerificationAttempts} failed attempts</p></td>
              <td className="p-4"><div className="flex max-w-sm flex-wrap gap-2">
                <TinyAction onClick={() => act(user, "requirement", { required: !user.twoFactorRequired, forceSetup: !user.twoFactorEnabled })} icon={UserCheck}>{user.twoFactorRequired ? "Make optional" : "Require 2FA"}</TinyAction>
                <TinyAction onClick={() => confirm(`Reset 2FA for ${user.email}? All sessions will be revoked.`) && act(user, "reset-2fa")} icon={RefreshCw}>Reset 2FA</TinyAction>
                <TinyAction onClick={() => confirm(`Revoke all sessions for ${user.email}?`) && act(user, "revoke-sessions")} icon={ShieldAlert}>Revoke sessions</TinyAction>
                {user.isLocked && <TinyAction onClick={() => act(user, "unlock")} icon={LockKeyhole}>Unlock</TinyAction>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
        {!users.length && <div className="p-10 text-center text-sm text-sage-muted"><Filter className="mx-auto mb-2 h-5 w-5" />No accounts match these filters.</div>}
      </div>
    </div>
  );
}

function TinyAction({ onClick, icon: Icon, children }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-sage-border px-3 py-1.5 text-[10px] font-semibold text-site hover:bg-sage-secondary/60"><Icon className="h-3.5 w-3.5" />{children}</button>;
}

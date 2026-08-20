/* global confirm, navigator */
import { Check, Copy, KeyRound, Laptop, Lock, LogOut, RefreshCw, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";

export default function SecurityProfile() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [credentials, setCredentials] = useState({ password: "", code: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [setup, setSetup] = useState(null);
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/v1/security/me");
      setData(response.data);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (path, options, message) => {
    try {
      setError("");
      const response = await apiFetch(path, options);
      setNotice(response.message || message);
      await load();
      return response;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    }
  };

  const startSetup = async () => {
    const response = await run("/api/v1/auth/security/2fa/setup/begin", { method: "POST", body: JSON.stringify({ password: credentials.password }) });
    if (response) setSetup(response.data);
  };

  const verifySetup = async () => {
    const response = await run("/api/v1/auth/security/2fa/setup/verify", { method: "POST", body: JSON.stringify({ code: setupCode }) });
    if (response) {
      setRecoveryCodes(response.data?.recoveryCodes || []);
      setSetup(null);
    }
  };

  const regenerate = async () => {
    const response = await run("/api/v1/security/recovery-codes", { method: "POST", body: JSON.stringify(credentials) });
    if (response) setRecoveryCodes(response.data?.recoveryCodes || []);
  };

  if (!data) return <p className="text-sm text-sage-muted">Loading security settings...</p>;
  const { account, policy, trustedDevices, sessions, recentActivity } = data;

  return (
    <div className="space-y-6">
      <Header eyebrow="Profile → Security" title="Account Security" description="Manage your password, authenticator, recovery access, trusted devices, and active sessions." />
      <Feedback error={error} notice={notice} />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatusCard icon={ShieldCheck} label="Two-Factor Authentication" value={account.twoFactorEnabled ? "Enabled" : "Disabled"} detail={policy.twoFactorRequired ? "Required by security policy" : "Optional for this account"} good={account.twoFactorEnabled} />
        <StatusCard icon={Laptop} label="Active Sessions" value={String(sessions.length)} detail={`${trustedDevices.length} trusted device${trustedDevices.length === 1 ? "" : "s"}`} good />
        <StatusCard icon={Lock} label="Account Status" value={account.isLocked ? "Temporarily locked" : "Protected"} detail={account.lastSuccessfulAuthentication ? `Last 2FA: ${new Date(account.lastSuccessfulAuthentication).toLocaleString()}` : "No successful 2FA recorded"} good={!account.isLocked} />
      </div>

      <Card title="Authenticator & Recovery" icon={Smartphone}>
        <p className="text-xs text-sage-muted">Use any standards-compliant authenticator app. Secrets are encrypted at rest and never exposed after setup.</p>
        <CredentialFields value={credentials} onChange={setCredentials} />
        <div className="flex flex-wrap gap-2">
          {!account.twoFactorEnabled && <Action onClick={startSetup}>Set up Authenticator</Action>}
          {account.twoFactorEnabled && <Action onClick={regenerate} icon={RefreshCw}>Regenerate Recovery Codes</Action>}
          {account.twoFactorEnabled && !policy.twoFactorRequired && <Action secondary onClick={() => run("/api/v1/security/2fa/disable", { method: "POST", body: JSON.stringify(credentials) })}>Disable 2FA</Action>}
        </div>
        {setup && (
          <div className="grid gap-5 rounded-2xl border border-sage-border bg-sage-secondary/30 p-4 sm:grid-cols-[200px_1fr]">
            <img src={setup.qrCodeDataUrl} alt="Authenticator setup QR code" className="h-48 w-48 rounded-xl bg-white p-2" />
            <div className="space-y-3">
              <p className="text-xs text-sage-muted">Scan the QR code, or enter this manual key:</p>
              <code className="block break-all rounded-xl bg-white p-3 text-xs font-semibold text-site">{setup.manualKey}</code>
              <input className="field-luxury text-sm" value={setupCode} onChange={(event) => setSetupCode(event.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} />
              <Action onClick={verifySetup} icon={Check}>Verify and enable</Action>
            </div>
          </div>
        )}
        {recoveryCodes.length > 0 && <RecoveryCodes codes={recoveryCodes} />}
      </Card>

      <Card title="Password Settings" icon={KeyRound}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="password" className="field-luxury text-sm" placeholder="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
          <input type="password" className="field-luxury text-sm" placeholder="New password (12+ characters)" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
        </div>
        <Action onClick={() => run("/api/v1/security/password", { method: "POST", body: JSON.stringify(passwords) })}>Update Password</Action>
      </Card>

      <Card title="Trusted Devices" icon={Laptop}>
        <ItemList empty="No trusted devices." items={trustedDevices.map((device) => ({
          id: device._id,
          title: device.name,
          detail: `${device.ipAddress || "Unknown IP"} · expires ${new Date(device.expiresAt).toLocaleDateString()}`,
          action: () => run(`/api/v1/security/devices/${device._id}`, { method: "DELETE" })
        }))} />
      </Card>

      <Card title="Active Sessions" icon={LogOut}>
        <ItemList empty="No active sessions." items={sessions.map((session) => ({
          id: session._id,
          title: session.current ? "Current session" : (session.userAgent || "Browser session").slice(0, 70),
          detail: `${session.ipAddress || "Unknown IP"} · active ${new Date(session.lastSeenAt).toLocaleString()}`,
          current: session.current,
          action: session.current ? null : () => run(`/api/v1/security/sessions/${session._id}`, { method: "DELETE" })
        }))} />
        <div className="pt-3">
          <Action secondary onClick={() => confirm("Sign out all other devices?") && run("/api/v1/security/sessions/revoke-others", { method: "POST", body: JSON.stringify(credentials) })}>Logout from other devices</Action>
        </div>
      </Card>

      <Card title="Recent Security Activity" icon={ShieldCheck}>
        <div className="divide-y divide-sage-border">
          {recentActivity.map((log) => <div key={log._id} className="flex justify-between gap-4 py-3 text-xs"><span className="font-semibold text-forest">{log.action.replaceAll("_", " ")}</span><span className="text-sage-muted">{new Date(log.createdAt).toLocaleString()}</span></div>)}
        </div>
      </Card>
    </div>
  );
}

export function Header({ eyebrow, title, description }) {
  return <div className="border-b border-sage-border pb-4"><span className="text-xs font-semibold uppercase tracking-widest text-site">{eyebrow}</span><h1 className="font-serif text-3xl text-forest">{title}</h1>{description && <p className="mt-1 text-xs text-sage-muted">{description}</p>}</div>;
}

export function Feedback({ error, notice }) {
  return <>{error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}{notice && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}</>;
}

function StatusCard({ icon: Icon, label, value, detail, good }) {
  return <div className="rounded-3xl border border-sage-border bg-sage-card p-5 shadow-soft"><Icon className={`h-5 w-5 ${good ? "text-site" : "text-amber-600"}`} /><p className="mt-4 text-[10px] uppercase tracking-wider text-sage-muted">{label}</p><p className="font-serif text-xl text-forest">{value}</p><p className="mt-1 text-[11px] text-sage-muted">{detail}</p></div>;
}

export function Card({ title, icon: Icon, children }) {
  return <section className="space-y-4 rounded-3xl border border-sage-border bg-sage-card p-5 sm:p-6 shadow-soft"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-site" /><h2 className="font-serif text-xl text-forest">{title}</h2></div>{children}</section>;
}

function CredentialFields({ value, onChange }) {
  return <div className="grid gap-3 sm:grid-cols-2"><input type="password" className="field-luxury text-sm" placeholder="Current password" value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} /><input className="field-luxury text-sm" placeholder="Current 2FA / recovery code" value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} /></div>;
}

export function Action({ onClick, children, icon: Icon, secondary = false }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition ${secondary ? "border border-sage-border text-site hover:bg-sage-secondary/60" : "bg-[rgb(72,125,72)] text-white hover:bg-[#7C9B69]"}`}>{Icon && <Icon className="h-4 w-4" />}{children}</button>;
}

function RecoveryCodes({ codes }) {
  const [copied, setCopied] = useState(false);
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="grid grid-cols-2 gap-2">{codes.map((code) => <code key={code} className="text-center text-xs font-semibold text-forest">{code}</code>)}</div><button type="button" onClick={async () => { await navigator.clipboard.writeText(codes.join("\n")); setCopied(true); }} className="mx-auto mt-4 flex items-center gap-2 text-xs font-semibold text-site">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy codes"}</button></div>;
}

function ItemList({ items, empty }) {
  if (!items.length) return <p className="text-xs text-sage-muted">{empty}</p>;
  return <div className="divide-y divide-sage-border">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-xs font-semibold text-forest">{item.title}</p><p className="text-[11px] text-sage-muted">{item.detail}</p></div>{item.action && <button type="button" onClick={item.action} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50" aria-label="Revoke"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>;
}

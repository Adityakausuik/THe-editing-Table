import { Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import { Action, Card, Feedback, Header } from "./SecurityProfile.jsx";

export default function SecurityPolicyCMS() {
  const [policy, setPolicy] = useState(null);
  const [credentials, setCredentials] = useState({ password: "", code: "" });
  const [forceLogoutAll, setForceLogoutAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { apiFetch("/api/v1/security/policy").then((response) => setPolicy(response.data)).catch((requestError) => setError(requestError.message)); }, []);
  const save = async () => {
    try {
      const response = await apiFetch("/api/v1/security/policy", { method: "PUT", body: JSON.stringify({ ...policy, ...credentials, forceLogoutAll }) });
      setPolicy(response.data.policy);
      setForceLogoutAll(false);
      setNotice(`${response.message}${response.data.revokedSessions ? ` · ${response.data.revokedSessions} sessions revoked` : ""}`);
      setError("");
    } catch (requestError) { setError(requestError.message); }
  };
  if (!policy) return <p className="text-sm text-sage-muted">Loading security policy...</p>;
  return <div className="space-y-6">
    <Header eyebrow="Super Admin → Security" title="Security Policy" description="Configure mandatory two-factor authentication, lockouts, trusted devices, and session lifetime." />
    <Feedback error={error} notice={notice} />
    <Card title="Authentication Policy" icon={ShieldCheck}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Toggle label="Require 2FA for Admin and Super Admin" checked={policy.requireAdmin2FA} onChange={(value) => setPolicy({ ...policy, requireAdmin2FA: value })} />
        <Toggle label="Require 2FA for users" checked={policy.requireUser2FA} onChange={(value) => setPolicy({ ...policy, requireUser2FA: value })} />
        <NumberField label="Trusted-device duration (days)" value={policy.trustedDeviceDays} onChange={(value) => setPolicy({ ...policy, trustedDeviceDays: value })} min={0} max={365} />
        <NumberField label="Maximum failed attempts" value={policy.maxFailedAttempts} onChange={(value) => setPolicy({ ...policy, maxFailedAttempts: value })} min={3} max={20} />
        <NumberField label="Temporary lock duration (minutes)" value={policy.lockMinutes} onChange={(value) => setPolicy({ ...policy, lockMinutes: value })} min={1} max={1440} />
        <NumberField label="Session expiry (hours)" value={policy.sessionExpiryHours} onChange={(value) => setPolicy({ ...policy, sessionExpiryHours: value })} min={1} max={720} />
        <NumberField label="Recovery codes generated" value={policy.recoveryCodeCount} onChange={(value) => setPolicy({ ...policy, recoveryCodeCount: value })} min={5} max={20} />
        <div><p className="mb-1.5 text-xs font-semibold text-sage-muted">Allowed 2FA methods</p><div className="field-luxury flex min-h-12 items-center text-sm">Authenticator app (TOTP)</div></div>
      </div>
    </Card>
    <Card title="Authorize Policy Change" icon={Save}>
      <div className="grid gap-3 sm:grid-cols-2"><input type="password" className="field-luxury text-sm" placeholder="Your password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /><input className="field-luxury text-sm" placeholder="Your 2FA / recovery code" value={credentials.code} onChange={(event) => setCredentials({ ...credentials, code: event.target.value })} /></div>
      <Toggle label="Force logout from all other devices when saved" checked={forceLogoutAll} onChange={setForceLogoutAll} />
      <Action onClick={save} icon={Save}>Save Security Policy</Action>
    </Card>
  </div>;
}

function Toggle({ label, checked, onChange }) { return <label className="flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-sage-border px-4 text-xs font-semibold text-forest"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#487D48]" /></label>; }
function NumberField({ label, value, onChange, min, max }) { return <label className="text-xs font-semibold text-sage-muted">{label}<input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="field-luxury mt-1.5 text-sm" /></label>; }

/* global navigator, sessionStorage */
import { AlertCircle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import Container from "../components/ui/Container.jsx";
import { apiFetch } from "../lib/api.js";
import { useAdmin } from "./AdminContext.jsx";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAdmin();
  const [email, setEmail] = useState("admin@theeditingtable.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState("password");
  const [code, setCode] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [setup, setSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const finishLogin = (data) => {
    loginUser(data.data?.user, data.data?.csrfToken);
    navigate("/admin/dashboard");
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (response.data?.status === "authenticated") finishLogin(response);
      else if (response.data?.status === "two_factor_required") setStage("verify");
      else if (response.data?.status === "two_factor_setup_required") {
        setStage("setup");
        await beginSetup();
      }
    } catch (error) {
      setErrorMsg(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const beginSetup = async () => {
    const response = await apiFetch("/api/v1/auth/2fa/setup/begin", { method: "POST" });
    setSetup(response.data);
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await apiFetch("/api/v1/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify(recoveryMode ? { recoveryCode: code, trustDevice } : { code, trustDevice, deviceName: "Admin browser" })
      });
      finishLogin(response);
    } catch (error) {
      setErrorMsg(error.message || "Security verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupVerify = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await apiFetch("/api/v1/auth/2fa/setup/verify", {
        method: "POST",
        body: JSON.stringify({ code })
      });
      setRecoveryCodes(response.data?.recoveryCodes || []);
      sessionStorage.setItem("csrfToken", response.data?.csrfToken || "");
      loginUser(response.data?.user, response.data?.csrfToken);
      setStage("recovery");
    } catch (error) {
      setErrorMsg(error.message || "Authenticator verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
  };

  const inputClass = "field-luxury text-sm";

  return (
    <div className="min-h-svh flex items-center justify-center bg-sage-bg text-forest p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sage-light/15 rounded-full blur-3xl pointer-events-none" />
      <Container className="max-w-md w-full relative z-10">
        <div className="rounded-3xl border border-sage-light/40 bg-sage-card p-8 sm:p-10 shadow-editorial space-y-6 backdrop-blur-md">
          <div className="text-center space-y-3">
            <BrandLogo imageClassName="h-10 sm:h-12 mx-auto" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-site shadow-soft">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure CMS Master Suite
            </div>
            <h1 className="font-serif text-3xl font-normal text-forest">
              {stage === "password" && "Studio Control Login"}
              {stage === "verify" && "Security Verification"}
              {stage === "setup" && "Protect Your Account"}
              {stage === "recovery" && "Save Recovery Codes"}
            </h1>
            <p className="text-xs text-sage-muted leading-relaxed">
              {stage === "password" && "Enter your credentials. A full session is created only after every required security check."}
              {stage === "verify" && "Enter the current six-digit code from your authenticator app."}
              {stage === "setup" && "Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app."}
              {stage === "recovery" && "Store these single-use codes somewhere safe. They will not be shown again."}
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-900">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" /><span>{errorMsg}</span>
            </div>
          )}

          {stage === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Admin Email
                <span className="relative flex items-center mt-1.5">
                  <Mail className="absolute left-3.5 h-4 w-4 text-site pointer-events-none" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={{ paddingLeft: "2.75rem" }} className={inputClass} autoComplete="username" required />
                </span>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
                Password
                <span className="relative flex items-center mt-1.5">
                  <Lock className="absolute left-3.5 h-4 w-4 text-site pointer-events-none" />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }} className={inputClass} autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1.5 flex h-10 w-10 items-center justify-center rounded-full text-sage-muted hover:bg-sage-secondary/60" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              <SubmitButton loading={loading}>Verify Password</SubmitButton>
            </form>
          )}

          {stage === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <CodeField code={code} setCode={setCode} recoveryMode={recoveryMode} />
              <label className="flex items-center gap-2 text-xs text-sage-muted">
                <input type="checkbox" checked={trustDevice} onChange={(event) => setTrustDevice(event.target.checked)} className="accent-[#487D48]" /> Trust this browser
              </label>
              <SubmitButton loading={loading} disabled={recoveryMode ? code.trim().length < 8 : code.length !== 6}>Verify & Enter Suite</SubmitButton>
              <button type="button" onClick={() => { setRecoveryMode((value) => !value); setCode(""); }} className="w-full text-xs text-site hover:underline">
                {recoveryMode ? "Use authenticator code" : "Use a recovery code"}
              </button>
            </form>
          )}

          {stage === "setup" && (
            <form onSubmit={handleSetupVerify} className="space-y-4">
              {setup ? (
                <>
                  <img src={setup.qrCodeDataUrl} alt="Authenticator setup QR code" className="mx-auto h-48 w-48 rounded-2xl border border-sage-border bg-white p-2" />
                  <div className="rounded-2xl bg-sage-secondary/50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-sage-muted">Manual secret key</p>
                    <code className="mt-1 block break-all text-xs font-semibold text-site">{setup.manualKey}</code>
                  </div>
                  <CodeField code={code} setCode={setCode} setupMode />
                  <SubmitButton loading={loading} disabled={code.length !== 6}>Enable & Verify 2FA</SubmitButton>
                </>
              ) : <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-site" /></div>}
            </form>
          )}

          {stage === "recovery" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-sage-border bg-sage-secondary/40 p-4">
                {recoveryCodes.map((item) => <code key={item} className="text-center text-xs font-semibold text-forest">{item}</code>)}
              </div>
              <button type="button" onClick={copyRecoveryCodes} className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-sage-border px-5 py-3 text-xs font-semibold text-site hover:bg-sage-secondary/60">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy recovery codes"}
              </button>
              <button type="button" onClick={() => navigate("/admin/dashboard")} className="w-full rounded-full bg-[rgb(72,125,72)] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#7C9B69]">I saved them — Continue</button>
            </div>
          )}

          <div className="pt-4 border-t border-sage-border/60 text-center text-[11px] text-sage-muted">
            <Smartphone className="inline h-3.5 w-3.5 mr-1" /> Password → security verification → dashboard
          </div>
        </div>
      </Container>
    </div>
  );
}

function CodeField({ code, setCode, recoveryMode = false, setupMode = false }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-sage-muted">
      {recoveryMode ? "Recovery code" : "6-digit verification code"}
      <span className="relative flex items-center mt-1.5">
        <KeyRound className="absolute left-3.5 h-4 w-4 text-site pointer-events-none" />
        <input
          value={code}
          onChange={(event) => setCode(recoveryMode ? event.target.value.toUpperCase() : event.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={recoveryMode ? 14 : 6}
          inputMode={recoveryMode ? "text" : "numeric"}
          pattern={recoveryMode ? undefined : "[0-9]{6}"}
          placeholder={recoveryMode ? "XXXX-XXXX-XXXX" : "000000"}
          style={{ paddingLeft: "2.75rem" }}
          className="field-luxury text-sm tracking-[0.3em]"
          autoComplete="one-time-code"
          aria-describedby={setupMode ? "setup-code-help" : undefined}
          required
          autoFocus
        />
      </span>
      {setupMode && (
        <span id="setup-code-help" className="mt-2 block normal-case font-normal leading-relaxed tracking-normal text-sage-muted">
          After scanning the QR code, enter the current code shown in your authenticator app. It refreshes every 30 seconds.
        </span>
      )}
    </label>
  );
}

function SubmitButton({ loading, disabled = false, children }) {
  return (
    <button type="submit" disabled={loading || disabled} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] text-white px-6 py-3.5 text-sm font-semibold transition hover:bg-[#7C9B69] disabled:cursor-not-allowed disabled:opacity-45 shadow-soft">
      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : children}
    </button>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { GraduationCap, Users, Shield } from "lucide-react";

type Tab = "student" | "staff" | "gatekeeper";

export default function LoginPage() {
  const { signInStudentGoogle, signInStaffGoogle, signInGatekeeper } = useAuth();
  const [tab, setTab] = useState<Tab>("student");
  const [phone, setPhone] = useState("");
  const [gkPassword, setGkPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [gkError, setGkError] = useState("");

  // Listen for auth errors dispatched from useAuth (wrong tab, not in DB, etc.)
  useEffect(() => {
    function handleAuthError(e: Event) {
      const detail = (e as CustomEvent).detail as string;
      toast.error(detail, { duration: 5000 });
    }
    window.addEventListener("outpass-auth-error", handleAuthError);
    return () => window.removeEventListener("outpass-auth-error", handleAuthError);
  }, []);

  async function handleStudentGoogle() {
    setLoading(true);
    const result = await signInStudentGoogle();
    if (!result.success) toast.error(result.error || "Login failed.");
    setLoading(false);
  }

  async function handleStaffGoogle() {
    setLoading(true);
    const result = await signInStaffGoogle();
    if (!result.success) toast.error(result.error || "Login failed.");
    setLoading(false);
  }

  async function handleGatekeeperLogin(e: React.FormEvent) {
    e.preventDefault();
    setGkError("");
    setLoading(true);
    const result = await signInGatekeeper(phone, gkPassword);
    if (!result.success) {
      setGkError(result.error || "Login failed.");
      toast.error(result.error || "Login failed.");
    }
    setLoading(false);
  }

  const tabs = [
    { id: "student" as Tab, label: "Student", icon: GraduationCap },
    { id: "staff" as Tab, label: "Staff", icon: Users },
    { id: "gatekeeper" as Tab, label: "Gatekeeper", icon: Shield },
  ];

  const GoogleBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="btn-primary w-full justify-center py-3"
      style={{ background: "white", color: "#1e2535" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? "Signing in..." : label}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #5c7cfa, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #748ffc, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "radial-gradient(#5c7cfa 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #5c7cfa, #748ffc)" }}>
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold font-display tracking-tight">OutPass</span>
          </div>
          <p className="text-slate-400 text-sm">Digital Outpass Management System</p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 mb-6 rounded-xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setGkError(""); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium font-display transition-all"
              style={{
                background: tab === id ? "var(--brand)" : "transparent",
                color: tab === id ? "white" : "var(--text-secondary)",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="card">

          {/* ── STUDENT ── */}
          {tab === "student" && (
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <h2 className="text-xl font-bold font-display mb-1">Student Login</h2>
                <p className="text-slate-400 text-sm">Use your official college Google account</p>
              </div>
              <GoogleBtn onClick={handleStudentGoogle} label="Continue with Google" />
              <p className="text-xs text-slate-500 text-center">
                Only registered hostellers can access this system.
                <br />Not registered? Contact your institution admin.
              </p>
            </div>
          )}

          {/* ── STAFF ── */}
          {tab === "staff" && (
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <h2 className="text-xl font-bold font-display mb-1">Staff Login</h2>
                <p className="text-slate-400 text-sm">Advisor · HOD · Warden</p>
              </div>
              <GoogleBtn onClick={handleStaffGoogle} label="Sign in with Google" />
              <p className="text-xs text-slate-500 text-center">
                Sign in with your official college Google account.
                <br />Only registered staff can access this portal.
              </p>
            </div>
          )}

          {/* ── GATEKEEPER ── */}
          {tab === "gatekeeper" && (
            <form onSubmit={handleGatekeeperLogin} className="flex flex-col gap-4">
              <div className="text-center">
                <h2 className="text-xl font-bold font-display mb-1">Gatekeeper Login</h2>
                <p className="text-slate-400 text-sm">Security personnel access</p>
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setGkError(""); }}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={gkPassword}
                  onChange={(e) => { setGkPassword(e.target.value); setGkError(""); }}
                  required
                  disabled={loading}
                />
              </div>

              {/* Inline error message under form */}
              {gkError && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                  <p className="text-red-400">{gkError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary justify-center py-3 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} OutPass Management System
        </p>
      </div>
    </div>
  );
}

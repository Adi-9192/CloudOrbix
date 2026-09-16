import { useState } from "react";
import { Shield, Cloud, BarChart3, Users, ArrowRight, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { showCloudOrbixAlert } from "../alert";

interface LoginProps {
  onLogin: (user: { id: number; email: string; firstName: string; lastName: string; roles: string[]; isActive: boolean }, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleAuth = async (mode: "manual" | "sso") => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode === "manual" ? "login" : "sso"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "manual" ? { email, password } : { email }),
      });

      const responseText = await response.text();
      let data: { message?: string; user?: Parameters<typeof onLogin>[0]; token?: string } = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error("The server returned an invalid response. Please try again.");
        }
      }

      if (!response.ok) {
        throw new Error(data.message || "Access Denied. Contact Application Administrator.");
      }

      if (!data.user || !data.token) {
        throw new Error("The server did not return a valid login session.");
      }

      onLogin(data.user, data.token);
    } catch (err) {
      const message = err instanceof TypeError ? "Unable to reach the CloudOrbix server. Please check that the API is running." : err instanceof Error ? err.message : "Access Denied. Contact Application Administrator.";
      setError(message);
      showCloudOrbixAlert(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = () => handleAuth("sso");

  const handlePasswordReset = async () => {
    setError("");
    if (newPassword !== confirmPassword) return setError("The new passwords do not match.");
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("clmp-token") || ""}` }, body: JSON.stringify({ oldPassword: password, newPassword }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to reset password.");
      setError(data.message);
      setResetMode(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reset password."); }
  };

  const features = [
    { icon: Cloud, title: "Multi-Cloud Management", desc: "Azure, AWS, GCP lifecycle visibility" },
    { icon: BarChart3, title: "Executive Analytics", desc: "10-year trend dashboards & KPIs" },
    { icon: Users, title: "Project Lifecycle Portal", desc: "End-to-end onboarding & offboarding" },
    // { icon: Shield, title: "Enterprise Security", desc: "Role-based access with Entra ID SSO" },
  ];

  return (
    <div className="min-h-screen flex" style={{ 
      backgroundImage: "url('/bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
       backgroundRepeat: "no-repeat",
      fontFamily: "var(--font-sans)" }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[55%] p-12 relative overflow-hidden"
        style={{  }}
      >
        {/* Background decoration */}
        {/* <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #93C5FD, transparent)" }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3ad8f4, transparent)" }} />
          <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 600 800">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="600" height="800" fill="url(#grid)" />
          </svg>
        </div> */}

        <div className="relative z-10 ">
          <div className="flex items-center gap-5 mb-20 ml-0 mt-0">
              <img src="/CloudOrbix.png" alt="CloudOrbix" className="h-20 w-20 rounded-lg object-contain " />
            <div>
              <div className="text-white font-bold text-3xl leading-none">CloudOrbix</div>
              <div className="text-blue-100 text-xs font-medium">Orbiting Every Project Aroun Success</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Manage Projects<br />
            <span className="text-blue-200">Lifecycles</span> with<br />
            Precision.
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            One Platform. Unified Delivery. Measurable Results.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{title}</div>
                <div className="text-blue-200 text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-6 text-blue-200 text-xs">
          <span>v2.4.1 — Production</span>
          <span>•</span>
          <span>SOC 2 Type II Compliant</span>
          <span>•</span>
          <span>ISO 27001</span>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border m-13 " style={{ border:"1px #3ad8f4" ,  borderStyle: "solid", boxShadow: "0 1px 10px rgba(0, 0, 0, 0.1)" }}>
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-4 mb-30 lg:hidden m-3">
            <img src="/CloudOrbix.png" alt="CloudOrbix" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-bold text-slate-200">CloudOrbix</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Welcome back</h2>
            <p className="text-slate-100 text-sm">Sign in to your account to continue</p>
          </div>

          {/* SSO is temporarily disabled until enterprise identity integration is configured. */}
          {/*
          <button
            onClick={handleSSO}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 mb-6"
            style={{ background: loading ? "#93BFFF" : "#1E40AF", cursor: loading ? "wait" : "pointer" }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                Authenticating with Entra ID...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M11.4 0H0v11.4h11.4V0zm12.6 0H12.6v11.4H24V0zM11.4 12.6H0V24h11.4V12.6zM24 12.6H12.6V24H24V12.6z" />
                </svg>
                Sign in with Company Account
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>
          */}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="relative flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-cyan-100" />
              <span className="text-slate-100 text-xs font-medium">Sign in manually</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="emailAddress" className="block text-xs font-semibold text-slate-200 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-100" />
                <input
                  id="emailAddress"
                  name="email"
                  type="email"
                  value={email}
                  aria-label="Email Address"
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border text-sm outline-none transition-all"
                  style={{ borderColor: "#E2E8F0", fontSize: "14px" }}
                  onFocus={e => (e.target.style.borderColor = "#27fbff")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
            </div>
            <div>
              <label htmlFor="passwordField" className="block text-xs font-semibold text-slate-200 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                <input
                  id="passwordField"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  aria-label="Password"
                  autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-lg border text-sm outline-none transition-all"
                  style={{ borderColor: "#E2E8F0" }}
                  onFocus={e => (e.target.style.borderColor = "#27fbff")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-100 hover:text-slate-200">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {resetMode && <div className="space-y-3 mb-4">
            <label className="block text-xs font-semibold text-slate-200">New password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter a new password" className="mt-1 w-full px-3 py-2 rounded-lg border text-sm bg-white text-slate-900 placeholder:text-slate-500" style={{ borderColor: "#94A3B8" }} /></label>
            <label className="block text-xs font-semibold text-slate-200">Confirm new password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter the new password" className="mt-1 w-full px-3 py-2 rounded-lg border text-sm bg-white text-slate-900 placeholder:text-slate-500" style={{ borderColor: "#94A3B8" }} /></label>
          </div>}
          <button
            type="button"
            onClick={() => resetMode ? handlePasswordReset() : handleAuth("manual")}
            disabled={loading}
            aria-label="Sign In"
            className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-colors"
            style={{ background: loading ? "#93BFFF" : "#1E40AF" }}
            onMouseOver={e => ((e.target as HTMLElement).style.background = loading ? "#93BFFF" : "#1D3A9E")}
            onMouseOut={e => ((e.target as HTMLElement).style.background = loading ? "#93BFFF" : "#1E40AF")}
          >
            {resetMode ? "Update password" : "Sign In"}
          </button>

          <div className="mt-8 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 text-center mb-2 font-medium">Need help?</div>
            <div className="flex justify-center gap-4 text-xs text-blue-600">
              <a href="#" className="hover:underline">IT Support</a>
              <span className="text-slate-300">|</span>
              <a href="#" onClick={e => { e.preventDefault(); setResetMode(true); setError("Enter your current password above, then choose a new password."); }} className="hover:underline">Reset Password</a>
              <span className="text-slate-300">|</span>
              <a href={adminEmail ? `mailto:${adminEmail}?subject=CloudOrbix%20password%20reset` : "#"} onClick={event => { if (!adminEmail) { event.preventDefault(); setError("Administrator contact is not configured."); } }} className="hover:underline">Contact Admin</a>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            <span>CloudOrbix v1.0.0 · © 2026 Capgemini. All rights reserved.</span>
            <img src="/Capgemini_Logo_Color_RGB.svg" alt="Capgemini" className="mx-auto mt-3 h-6 w-auto" />
          </p>
        </div>
      </div>
      
    </div>
  );
}

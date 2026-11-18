import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from "react";
import { Shield, Cloud, BarChart3, Users, ArrowRight, Lock, Mail, Eye, EyeOff, X } from "lucide-react";
import { createPortal } from "react-dom";
import { showCloudOrbixAlert } from "../alert";

const Portfolio = lazy(() => import("./Portfolio"));

interface LoginProps {
  onLogin: (user: { id: number; email: string; firstName: string; lastName: string; roles: string[]; isActive: boolean }, token: string) => void;
}

const cloudProviderOrbits = [
  { name: "Microsoft Azure", src: "/cloud-providers/azure.svg", diameter: 180, phase: 0, duration: 34, clockwise: true },
  { name: "Amazon Web Services", src: "/cloud-providers/aws.svg", diameter: 275, phase: 72, duration: 48, clockwise: false },
  { name: "Oracle Cloud Infrastructure", src: "/cloud-providers/oracle-cloud.svg", diameter: 370, phase: 144, duration: 42, clockwise: true },
  { name: "Google Cloud", src: "/cloud-providers/gcp.svg", diameter: 465, phase: 216, duration: 56, clockwise: false },
  { name: "Azure DevOps", src: "/cloud-providers/azure-devops.svg", diameter: 560, phase: 288, duration: 38, clockwise: true },
];

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
  const [showPortfolio, setShowPortfolio] = useState(false);
  const portfolioCloseButtonRef = useRef<HTMLButtonElement>(null);
  const portfolioTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showPortfolio) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    portfolioCloseButtonRef.current?.focus();

    const handleModalKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const nestedPortfolioDialog = document.querySelector(
          ".login-portfolio-modal [role='dialog'][aria-modal='true']:not(#login-portfolio-dialog)",
        );
        if (nestedPortfolioDialog) return;
        event.preventDefault();
        setShowPortfolio(false);
        return;
      }

      if (event.key !== "Tab") return;
      const modal = document.getElementById("login-portfolio-dialog");
      const nestedModal = modal?.querySelector<HTMLElement>(
        "[role='dialog'][aria-modal='true']:not(#login-portfolio-dialog)",
      );
      const focusScope = nestedModal || modal;
      const focusableElements = focusScope
        ? Array.from(
            focusScope.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((element) => element.getClientRects().length > 0)
        : [];
      if (!focusableElements.length) {
        event.preventDefault();
        portfolioCloseButtonRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (nestedModal && !nestedModal.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleModalKeys);
    return () => {
      window.removeEventListener("keydown", handleModalKeys);
      document.body.style.overflow = previousOverflow;
      (previouslyFocused && previouslyFocused !== document.body
        ? previouslyFocused
        : portfolioTriggerRef.current
      )?.focus();
    };
  }, [showPortfolio]);

  const openPortfolio = (event: MouseEvent<HTMLButtonElement>) => {
    portfolioTriggerRef.current = event.currentTarget;
    setShowPortfolio(true);
  };

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

  // const features = [
  //   // { icon: Cloud, title: "Multi-Cloud Management", desc: "Azure, AWS, GCP lifecycle visibility" },
  //   // { icon: BarChart3, title: "Executive Analytics", desc: "10-year trend dashboards & KPIs" },
  //   // { icon: Users, title: "Project Lifecycle Portal", desc: "End-to-end onboarding & offboarding" },
  //   // { icon: Shield, title: "Enterprise Security", desc: "Role-based access with Entra ID SSO" },
  // ];

  return (
    <>
    <div aria-hidden={showPortfolio || undefined} className="min-h-screen flex" style={{
      backgroundImage: "linear-gradient(rgba(2, 8, 24, 0.32), rgba(2, 8, 24, 0.32)), url('/bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
       backgroundRepeat: "no-repeat",
      fontFamily: "var(--font-sans)" }}>
      {/* Left Panel */}
      <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden p-8 lg:flex xl:p-10">
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

        <div className="relative z-10 flex flex-col items-center">
          <div
            className="cloud-orbit relative mb-5 h-[620px] w-[620px] max-w-full"
          >
            {cloudProviderOrbits.map((provider) => (
              <div
                key={provider.name}
                className="absolute inset-0"
                style={{ transform: `rotate(${provider.phase}deg)` }}
              >
                <div
                  className="cloud-provider-orbit absolute left-1/2 top-1/2 rounded-full border-[1.5px] border-dashed border-cyan-100/50"
                  style={{
                    width: provider.diameter,
                    height: provider.diameter,
                    marginLeft: -provider.diameter / 2,
                    marginTop: -provider.diameter / 2,
                    animationDuration: `${provider.duration}s`,
                    animationDirection: provider.clockwise ? "normal" : "reverse",
                  }}
                >
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <div
                      style={{ transform: `rotate(-${provider.phase}deg)` }}
                    >
                      <div
                        className="cloud-orbit-provider-label flex h-10 w-10 items-center justify-center rounded-full border border-cyan-100/55 bg-slate-950/90 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                        style={{
                          animationDuration: `${provider.duration}s`,
                          animationDirection: provider.clockwise ? "normal" : "reverse",
                        }}
                      >
                        <img
                          src={provider.src}
                          alt={provider.name}
                          className="h-6 w-6 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              aria-label="About us — open the CloudOrbix portfolio"
              onClick={openPortfolio}
              className="absolute left-1/2 top-1/2 z-10 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_14px_38px_rgba(1,12,35,0.35)] transition-shadow duration-200 hover:shadow-[0_18px_44px_rgba(1,12,35,0.45)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
              <img src="/CloudOrbix.png" alt="" className="h-[68px] w-[68px] rounded-xl object-contain" />
              <span className="mt-1 text-[11px] font-bold tracking-wide text-slate-800">About us</span>
            </button>
            <style>{`
              @keyframes cloud-orbit-spin {
                to { transform: rotate(360deg); }
              }
              @keyframes cloud-orbit-counter {
                to { transform: rotate(-360deg); }
              }
              .cloud-provider-orbit {
                animation: cloud-orbit-spin 42s linear infinite;
              }
              .cloud-orbit-provider-label {
                animation: cloud-orbit-counter 42s linear infinite;
              }
              @media (min-width: 1024px) and (max-width: 1151px) {
                .cloud-orbit {
                  transform: scale(0.8);
                }
              }
              @media (min-width: 1152px) and (max-width: 1279px) {
                .cloud-orbit {
                  transform: scale(0.94);
                }
              }
              @media (prefers-reduced-motion: reduce) {
                .cloud-provider-orbit,
                .cloud-orbit-provider-label {
                  animation: none;
                }
              }
            `}</style>
          </div>

        </div>

        <div className="relative z-10 space-y-4">
          {/* {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{title}</div>
                <div className="text-blue-200 text-xs">{desc}</div>
              </div>
            </div>
          ))} */}
        </div>

        <div className="relative z-10 flex items-center gap-6 text-blue-200 text-xs">
          <span>v1.0.0 — Production</span>
          
        </div>
      </div>

      {/* Right Panel */}
      <div className="m-4 flex min-w-0 flex-1 items-center justify-center rounded-xl border border-cyan-300/70 bg-white/10 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:m-5 sm:p-5 lg:m-6 lg:max-w-[560px] lg:p-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-5 lg:hidden">
            <button
              type="button"
              aria-label="About us — open the CloudOrbix portfolio"
              onClick={openPortfolio}
              className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
            <img src="/CloudOrbix.png" alt="CloudOrbix" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-bold text-slate-200">CloudOrbix</span>
            <span className="sr-only">About us</span>
            </button>
          </div>

          <h1 className="mx-auto mb-3 max-w-sm text-center text-2xl font-bold leading-tight text-white sm:text-3xl">
            Manage Projects<br />
            <span className="text-blue-200">Lifecycles</span> with<br />
            Precision.
          </h1>

          <p className="mx-auto mb-5 max-w-sm text-center text-sm font-medium leading-relaxed text-blue-100 sm:text-base">
            One Platform. Unified Delivery. Measurable Results.
          </p>

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
            <span className="text-slate-100 text-xs font-medium">Sign in</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (resetMode) void handlePasswordReset();
              else void handleAuth("manual");
            }}
          >
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="emailAddress" className="block text-xs font-semibold text-slate-200 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-100" />
                <input
                  id="emailAddress"
                  name="email"
                  type="email"
                  required
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
                  required
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
            type="submit"
            disabled={loading}
            aria-label="Sign In"
            className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-colors"
            style={{ background: loading ? "#93BFFF" : "#1E40AF" }}
            onMouseOver={e => ((e.target as HTMLElement).style.background = loading ? "#93BFFF" : "#1D3A9E")}
            onMouseOut={e => ((e.target as HTMLElement).style.background = loading ? "#93BFFF" : "#1E40AF")}
          >
            {resetMode ? "Update password" : "Sign In"}
          </button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <div className="text-xs text-slate-500 text-center mb-2 font-medium">Need help?</div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-blue-600">
              <a href="mailto:shivendra.anand-tripathi@capgemini.com?subject=CloudOrbix%20IT%20Support" className="hover:underline">IT Support</a>
              <span className="text-slate-300">|</span>
              <a href="#" onClick={e => { e.preventDefault(); setResetMode(true); setError("Enter your current password above, then choose a new password."); }} className="hover:underline">Reset Password</a>
              <span className="text-slate-300">|</span>
              <a href={adminEmail ? `mailto:${adminEmail}?subject=CloudOrbix%20password%20reset` : "#"} onClick={event => { if (!adminEmail) { event.preventDefault(); setError("Administrator contact is not configured."); } }} className="hover:underline">Contact Admin</a>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            <span>CloudOrbix v1.0.1. All rights reserved.</span>
            {/* <img src="/Capgemini_Logo_Color_RGB.svg" alt="Capgemini" className="mx-auto mt-3 h-6 w-auto" /> */}
          </p>
        </div>
      </div>
    </div>
    {showPortfolio &&
      createPortal(
        <div
          className="login-portfolio-modal fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-md sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowPortfolio(false);
          }}
        >
          <section
            id="login-portfolio-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-portfolio-title"
            tabIndex={-1}
            className="flex h-[min(94dvh,900px)] w-full max-w-[1320px] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_32px_100px_rgba(2,12,32,0.55)] outline-none sm:rounded-3xl"
          >
            <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-7 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/CloudOrbix.png"
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-lg object-contain sm:h-10 sm:w-10"
                />
                <div className="min-w-0">
                  <h2
                    id="login-portfolio-title"
                    className="truncate text-base font-bold tracking-tight text-slate-950 sm:text-lg"
                  >
                    Cloud Professional Services 

                  </h2>
                  <p className="hidden text-xs text-slate-500 sm:block">
                    Architecting, Transforming & Operating the Modern Enterprise
                  </p>
                </div>
              </div>
              <button
                ref={portfolioCloseButtonRef}
                type="button"
                onClick={() => setShowPortfolio(false)}
                aria-label="Close portfolio"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <Suspense
                fallback={
                  <p className="p-8 text-center text-sm text-slate-500" role="status">
                    Loading portfolio…
                  </p>
                }
              >
                <Portfolio hideHeader hideFooter className="!min-h-0" />
              </Suspense>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

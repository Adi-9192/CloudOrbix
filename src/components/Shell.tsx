import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, Users, FileArchive,
  FileText, Settings, HelpCircle, Bell, Search, Moon, Sun,
  ChevronLeft, ChevronRight, LogOut, ChevronDown, Upload,
  ClipboardList, Shield, Menu, X, BookOpen, FolderKanban, UserCircle2
} from "lucide-react";
import { type CloudOrbixAlert } from "../alert";

export type Page =
  | "dashboard" | "clients" | "projectframework" | "reports" | "excel" | "audit" | "admin" | "help" | "project" | "documents" | "repository" | "servicecatalogue" | "profile";

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "servicecatalogue", label: "Service Catalogue", icon: BookOpen },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "excel", label: "Excel Import", icon: Upload },
  { id: "audit", label: "Audit Logs", icon: ClipboardList },
  { id: "admin", label: "Admin", icon: Shield },
  { id: "help", label: "Help", icon: HelpCircle },
];

const projectManagementItems: { id: Page; label: string }[] = [
  { id: "projectframework", label: "Project Framework" },
  { id: "clients", label: "Projects" },
  { id: "repository", label: "Project Repository" },
];

interface ShellProps {
  page: Page;
  onPageChange: (p: Page) => void;
  onLogout: () => void;
  dark: boolean;
  user?: { firstName: string; lastName: string; email: string; roles: string[] };
  onToggleDark: () => void;
  children: React.ReactNode;
  onSearch?: (query: string) => void;
}

export default function Shell({ page, onPageChange, onLogout, dark, user, onToggleDark, children, onSearch }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [projectManagementOpen, setProjectManagementOpen] = useState(true);
  const [screenAlert, setScreenAlert] = useState<CloudOrbixAlert | null>(null);
  const [alertTimer, setAlertTimer] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handleAlert = (event: Event) => {
      const alert = (event as CustomEvent<CloudOrbixAlert>).detail;
      setScreenAlert(alert);
      if (alertTimer) window.clearTimeout(alertTimer);
      setAlertTimer(window.setTimeout(() => setScreenAlert(null), 4500));
    };
    window.addEventListener("cloudorbix-alert", handleAlert);
    return () => window.removeEventListener("cloudorbix-alert", handleAlert);
  }, [alertTimer]);

  const bg = dark ? "#0F172A" : "#FFFFFF";
  const sidebarBg = dark ? "#1E293B" : "#FFFFFF";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const textMuted = dark ? "#94A3B8" : "#64748B";
  const textBody = dark ? "#E2E8F0" : "#0F172A";
  const pageBg = dark ? "#0F172A" : "#F1F5F9";
  const roleLabel = user?.roles?.[0] === "Admin" ? "System Administrator" : (user?.roles?.[0] || "Account Manager");

  const [notifications, setNotifications] = useState<{ id: string; text: string; type: string; time: string }[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("clmp-token");
    if (!token) return;
    fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((payload) => {
      const alerts = (payload?.upcomingActivities || []).map((item: any, index: number) => ({ id: `${item.client}-${index}`, text: item.type === "delay" ? `Project delay requires attention: ${item.client}` : `${item.type === "offboarding" ? "Offboarding" : "Onboarding"} due for ${item.client}`, type: item.type === "delay" ? "warning" : item.type === "offboarding" ? "warning" : "info", time: item.date }));
      setNotifications(alerts);
    }).catch(() => undefined);
  }, [user]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: pageBg, color: textBody, fontFamily: "var(--font-sans)" }}>
      {screenAlert && (
        <div className="fixed top-20 right-5 z-[100] w-[min(380px,calc(100vw-2rem))] rounded-2xl border shadow-2xl overflow-hidden" role="alert" style={{ background: bg, borderColor: screenAlert.tone === "error" ? "#FECACA" : screenAlert.tone === "warning" ? "#FDE68A" : screenAlert.tone === "success" ? "#BBF7D0" : borderColor }}>
          <div className="flex items-start gap-3 p-4">
            <div className="w-2 self-stretch rounded-full" style={{ background: screenAlert.tone === "error" ? "#DC2626" : screenAlert.tone === "warning" ? "#D97706" : screenAlert.tone === "success" ? "#16A34A" : "#1E40AF" }} />
            <div className="flex-1"><div className="text-xs font-bold" style={{ color: "#1E40AF" }}>CloudOrbix Alert</div><div className="text-sm mt-1" style={{ color: textBody }}>{screenAlert.message}</div></div>
            <button onClick={() => setScreenAlert(null)} className="p-1" aria-label="Dismiss alert" style={{ color: textMuted }}><X className="w-4 h-4" /></button>
          </div>
          <div className="h-1" style={{ background: screenAlert.tone === "error" ? "#DC2626" : screenAlert.tone === "warning" ? "#D97706" : screenAlert.tone === "success" ? "#16A34A" : "#1E40AF" }} />
        </div>
      )}
      {/* Top Nav */}
      <header className="flex items-center h-14 px-4 gap-4 flex-shrink-0 border-b z-30" style={{ background: bg, borderColor }}>
        <button className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <button className="flex items-center gap-2 flex-shrink-0" onClick={() => onPageChange("dashboard")} aria-label="Go to dashboard">
          <img src="/CloudOrbix.png" alt="CloudOrbix" className="h-7 w-7 object-contain" />
          {!collapsed && <span className="font-bold text-sm hidden lg:block" style={{ color: "#1E40AF" }}>CloudOrbix</span>}
        </button>

        {/* Search */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: textMuted }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); onSearch?.(e.target.value); }}
            placeholder="Search projects, reports, actions…"
            className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs border outline-none"
            style={{ background: dark ? "#1E293B" : "#F8FAFC", borderColor, color: textBody }}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Dark mode */}
          <button onClick={onToggleDark} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: textMuted }}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: textMuted }}>
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-[360px] rounded-2xl shadow-2xl border z-50 overflow-hidden" style={{ background: bg, borderColor, boxShadow: dark ? "0 18px 50px rgba(0,0,0,.35)" : "0 18px 50px rgba(15,23,42,.16)" }}>
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor, background: dark ? "#172554" : "#EFF6FF" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1E40AF", color: "#FFFFFF" }}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: textBody }}>CloudOrbix Alert</div>
                      <div className="text-[10px] mt-0.5" style={{ color: textMuted }}>Important project activity</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white text-blue-700 font-bold">4 new</span>
                </div>
                {notifications.map(n => (
                  <div key={n.id} className="px-5 py-3 border-b flex gap-3 hover:bg-slate-50 cursor-pointer" style={{ borderColor }}>
                    <div className="w-1 rounded-full flex-shrink-0" style={{ background: n.type === "warning" ? "#D97706" : n.type === "success" ? "#16A34A" : "#3B82F6" }} />
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: textBody }}>{n.text}</div>
                      <div className="text-[10px]" style={{ color: textMuted }}>{n.time}</div>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2 text-center">
                  <button className="text-xs font-semibold" style={{ color: "#1E40AF" }}>View all alerts</button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#1E40AF" }}>SC</div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold" style={{ color: textBody }}>{user ? `${user.firstName} ${user.lastName}` : ""}</div>
                <div className="text-[10px]" style={{ color: textMuted }}>{roleLabel}</div>
              </div>
              <ChevronDown className="w-3 h-3" style={{ color: textMuted }} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 w-48 rounded-xl shadow-xl border z-50 overflow-hidden" style={{ background: bg, borderColor }}>
                <div className="p-3 border-b" style={{ borderColor }}>
                  <div className="text-xs font-semibold" style={{ color: textBody }}>{user ? `${user.firstName} ${user.lastName}` : ""}</div>
                  <div className="text-[10px]" style={{ color: textMuted }}>{user ? user.email : "s.chen@enterprise.com"}</div>
                  <div className="mt-1 text-[10px] font-medium" style={{ color: textMuted }}>{roleLabel}</div>
                </div>
                <button onClick={() => { onPageChange("profile"); setProfileOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2" style={{ color: textBody }}>
                  <UserCircle2 className="w-3.5 h-3.5" /> My Profile
                </button>
                <button onClick={() => { onPageChange("admin"); setProfileOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2" style={{ color: textBody }}>
                  <Settings className="w-3.5 h-3.5" /> Settings
                </button>
                <button onClick={onLogout} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`flex-shrink-0 flex flex-col border-r transition-all duration-200 z-20 ${mobileOpen ? "fixed inset-y-0 left-0 top-14 w-56" : "hidden lg:flex"} ${collapsed ? "lg:w-14" : "lg:w-52"}`}
          style={{ background: sidebarBg, borderColor }}
        >
          <div className="flex-1 py-3 overflow-y-auto">
            {navItems.filter(({ id }) => id === "dashboard").map(({ id, label, icon: Icon }) => {
              const active = page === id;
              return (
                <button
                  key={id}
                  onClick={() => { onPageChange(id); setMobileOpen(false); }}
                  title={collapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg text-xs font-medium transition-all mb-0.5 ${collapsed ? "justify-center" : ""}`}
                  style={{
                    width: "calc(100% - 12px)",
                    background: active ? "#EFF6FF" : "transparent",
                    color: active ? "#1E40AF" : textMuted,
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#1E40AF" }} />}
                </button>
              );
            })}
            <div className="mb-1">
              <button
                onClick={() => setProjectManagementOpen(!projectManagementOpen)}
                aria-expanded={projectManagementOpen}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg text-xs font-medium transition-all ${collapsed ? "justify-center" : ""}`}
                style={{ width: "calc(100% - 12px)", color: textMuted }}
                title={collapsed ? "Project Management" : undefined}
              >
                <FolderKanban className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="flex-1 text-left">Project Management</span>}
                {!collapsed && (projectManagementOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
              </button>
              {projectManagementOpen && !collapsed && (
                <div className="ml-5 border-l" style={{ borderColor }}>
                  {projectManagementItems.map(({ id, label }) => {
                    const active = page === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { onPageChange(id); setMobileOpen(false); }}
                        className="w-[calc(100%-1rem)] ml-2 flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{ background: active ? "#EFF6FF" : "transparent", color: active ? "#1E40AF" : textMuted }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {navItems.filter(({ id }) => id !== "dashboard" && (!(["admin", "excel", "audit"] as Page[]).includes(id) || user?.roles.includes("Admin"))).map(({ id, label, icon: Icon }) => {
              const active = page === id;
              return (
                <button
                  key={id}
                  onClick={() => { onPageChange(id); setMobileOpen(false); }}
                  title={collapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg text-xs font-medium transition-all mb-0.5 ${collapsed ? "justify-center" : ""}`}
                  style={{
                    width: "calc(100% - 12px)",
                    background: active ? "#EFF6FF" : "transparent",
                    color: active ? "#1E40AF" : textMuted,
                  }}
                  onMouseOver={e => { if (!active) (e.currentTarget as HTMLElement).style.background = dark ? "#1E293B" : "#F8FAFC"; }}
                  onMouseOut={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#1E40AF" }} />}
                </button>
              );
            })}
          </div>

          {/* Collapse toggle */}
          <div className="p-2 border-t" style={{ borderColor }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 transition-colors"
              style={{ color: textMuted }}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto" style={{ background: pageBg }}>
          {children}
         
        </main>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  HelpCircle,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Shield,
  Menu,
  X,
  FolderKanban,
  UserCircle2,
  Calculator,
  Home,
} from "lucide-react";
import { showCloudOrbixAlert, type CloudOrbixAlert } from "../alert";

export type Page =
  | "dashboard"
  | "projects"
  | "projectframework"
  | "excel"
  | "audit"
  | "admin"
  | "help"
  | "project"
  | "documents"
  | "repository"
  | "portfolio"
  | "profile"
  | "risks"
  | "rfp";

export type DashboardView = "project" | "risk" | "rfp";

const navigationGroups: {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: { id: Page; label: string; adminOnly?: boolean }[];
}[] = [
  {
    id: "projects",
    label: "Project Management",
    icon: FolderKanban,
    items: [
      { id: "projectframework", label: "Project Framework" },
      { id: "projects", label: "Projects" },
      { id: "repository", label: "Project Repository" },
      { id: "risks", label: "Risk Register" },
      { id: "excel", label: "Excel Import", adminOnly: true },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: Shield,
    items: [
      { id: "admin", label: "Admin", adminOnly: true },
      { id: "audit", label: "Audit Logs", adminOnly: true },
    ],
  },
];

interface ShellProps {
  page: Page;
  onPageChange: (p: Page) => void;
  onLogout: () => void;
  dark: boolean;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
  };
  onToggleDark: () => void;
  children: React.ReactNode;
  onOpenProject?: (clientId: string) => void;
  repositoryDocuments?: boolean;
  dashboardView: DashboardView;
  onDashboardViewChange: (view: DashboardView) => void;
}

type NotificationItem = {
  id: string;
  text: string;
  message: string;
  type: string;
  time: string;
  read: boolean;
  metadata?: Record<string, unknown>;
};

export default function Shell({
  page,
  onPageChange,
  onLogout,
  dark,
  user,
  onToggleDark,
  children,
  onOpenProject,
  repositoryDocuments = false,
  dashboardView,
  onDashboardViewChange,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openNavMenu, setOpenNavMenu] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [screenAlert, setScreenAlert] = useState<CloudOrbixAlert | null>(null);
  const [alertTimer, setAlertTimer] = useState<number | null>(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [clearingNotifications, setClearingNotifications] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.roles.includes("Admin") ?? false;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenNavMenu(null);
        setMobileOpen(false);
      }
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
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const textMuted = dark ? "#94A3B8" : "#64748B";
  const textBody = dark ? "#E2E8F0" : "#0F172A";
  const pageBg = dark ? "#0F172A" : "#F1F5F9";
  const portfolioOnly = Boolean(
    user?.roles.some((role) => role === "Reader" || role === "Viewer") &&
      !user.roles.includes("Admin"),
  );
  const roleLabel =
    user?.roles?.[0] === "Admin"
      ? "System Administrator"
      : user?.roles?.[0] || "Account Manager";
  const userInitials = `${user?.firstName || ""} ${user?.lastName || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((namePart) => namePart[0])
    .join("");
  const visibleNavigationGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.adminOnly || isAdmin) &&
          (!portfolioOnly || item.id === "portfolio"),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const breadcrumbPaths: Record<Page, { label: string; page?: Page }[]> = {
    portfolio: [{ label: "Home" }],
    dashboard: [
      { label: "Home", page: "portfolio" },
      { label: "Dashboard", page: "dashboard" },
      { label: `${dashboardView === "risk" ? "Risk" : dashboardView === "rfp" ? "RFP" : "Project"} Dashboard` },
    ],
    projectframework: [{ label: "Home", page: "portfolio" }, { label: "Project Framework" }],
    projects: [{ label: "Home", page: "portfolio" }, { label: "Projects" }],
    project: [{ label: "Home", page: "portfolio" }, { label: "Projects", page: "projects" }, { label: "Project Details" }],
    documents: [
      { label: "Home", page: "portfolio" },
      repositoryDocuments
        ? { label: "Project Repository", page: "repository" }
        : { label: "Project Details", page: "project" },
      { label: "Documents" },
    ],
    repository: [{ label: "Home", page: "portfolio" }, { label: "Project Repository" }],
    excel: [{ label: "Home", page: "portfolio" }, { label: "Project Management", page: "projects" }, { label: "Excel Import" }],
    audit: [{ label: "Home", page: "portfolio" }, { label: "Administration", page: "admin" }, { label: "Audit Logs" }],
    admin: [{ label: "Home", page: "portfolio" }, { label: "Administration" }],
    help: [{ label: "Home", page: "portfolio" }, { label: "Help" }],
    rfp: [{ label: "Home", page: "portfolio" }, { label: "RFP" }],
    risks: [{ label: "Home", page: "portfolio" }, { label: "Risk Register" }],
    profile: [{ label: "Home", page: "portfolio" }, { label: "My Profile" }],
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  useEffect(() => {
    if (portfolioOnly) return;
    const token = localStorage.getItem("clmp-token");
    if (!token) return;
    fetch("/api/users/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const alerts = (payload?.notifications || [])
          .map((item: any) => ({
            id: String(item.id ?? `${item.title || item.message || "notification"}-${item.createdAt || item.created_at || ""}`),
            text: item.title || item.message || "Project update",
            message: item.message || "",
            type: item.type === "approval" ? "info" : "warning",
            time: new Date(
              item.createdAt || item.created_at || Date.now(),
            ).toLocaleDateString(),
            read: Boolean(item.read),
            metadata:
              item.metadata && typeof item.metadata === "object"
                ? item.metadata
                : {},
          }));
        setNotifications(alerts);
      })
      .catch(() => setNotifications([]));
  }, [user, notifOpen, portfolioOnly]);

  const clearNotifications = async () => {
    const token = localStorage.getItem("clmp-token");
    if (!token) {
      showCloudOrbixAlert("Sign in again to clear notifications.", "error");
      return;
    }

    setClearingNotifications(true);
    try {
      const response = await fetch("/api/users/notifications", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Unable to clear notifications. Please try again.");
      }
      setNotifications([]);
      setShowAllNotifications(false);
    } catch (error) {
      showCloudOrbixAlert(
        error instanceof Error ? error.message : "Unable to clear notifications. Please try again.",
        "error",
      );
    } finally {
      setClearingNotifications(false);
    }
  };

  const openNotification = (notification: NotificationItem) => {
    const metadata = notification.metadata || {};
    const action = String(metadata.action || "");
    const clientId = String(metadata.projectId || metadata.clientId || "");
    const requestId = metadata.requestId ? String(metadata.requestId) : "";
    setNotifOpen(false);

    if (action === "access_request" && user?.roles.includes("Admin")) {
      const focus = { kind: "access", id: requestId, clientId };
      localStorage.setItem("clmp-admin-approval-focus", JSON.stringify(focus));
      window.dispatchEvent(
        new CustomEvent("cloudorbix-focus-approval", { detail: focus }),
      );
      onPageChange("admin");
      return;
    }
    if (action === "request" && user?.roles.includes("Admin")) {
      const focus = { kind: "project", id: clientId };
      localStorage.setItem("clmp-admin-approval-focus", JSON.stringify(focus));
      window.dispatchEvent(
        new CustomEvent("cloudorbix-focus-approval", { detail: focus }),
      );
      onPageChange("admin");
      return;
    }
    if (action === "rfp_approval" && user?.roles.includes("Admin")) {
      const focus = { kind: "rfp", id: requestId };
      localStorage.setItem("clmp-admin-approval-focus", JSON.stringify(focus));
      window.dispatchEvent(
        new CustomEvent("cloudorbix-focus-approval", { detail: focus }),
      );
      onPageChange("admin");
      return;
    }
    if (clientId) {
      onOpenProject?.(clientId);
      return;
    }
    if (user?.roles.includes("Admin")) onPageChange("admin");
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: pageBg,
        color: textBody,
        fontFamily: "var(--font-sans)",
      }}
    >
      {screenAlert && (
        <div
          className="fixed top-20 right-5 z-[100] w-[min(380px,calc(100vw-2rem))] rounded-2xl border shadow-2xl overflow-hidden"
          role="alert"
          style={{
            background: bg,
            borderColor:
              screenAlert.tone === "error"
                ? "#FECACA"
                : screenAlert.tone === "warning"
                  ? "#FDE68A"
                  : screenAlert.tone === "success"
                    ? "#BBF7D0"
                    : borderColor,
          }}
        >
          <div className="flex items-start gap-3 p-4">
            <div
              className="w-2 self-stretch rounded-full"
              style={{
                background:
                  screenAlert.tone === "error"
                    ? "#DC2626"
                    : screenAlert.tone === "warning"
                      ? "#D97706"
                      : screenAlert.tone === "success"
                        ? "#16A34A"
                        : "#1E40AF",
              }}
            />
            <div className="flex-1">
              <div className="text-xs font-bold" style={{ color: "#1E40AF" }}>
                CloudOrbix Alert
              </div>
              <div className="text-sm mt-1" style={{ color: textBody }}>
                {screenAlert.message}
              </div>
            </div>
            <button
              onClick={() => setScreenAlert(null)}
              className="p-1"
              aria-label="Dismiss alert"
              style={{ color: textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div
            className="h-1"
            style={{
              background:
                screenAlert.tone === "error"
                  ? "#DC2626"
                  : screenAlert.tone === "warning"
                    ? "#D97706"
                    : screenAlert.tone === "success"
                      ? "#16A34A"
                      : "#1E40AF",
            }}
          />
        </div>
      )}
      {/* Top Nav */}
      <header
        className="relative flex flex-wrap items-center min-h-14 px-4 gap-3 flex-shrink-0 border-b z-30"
        style={{ background: bg, borderColor }}
      >
        <button
          className="lg:hidden p-1.5 rounded-md hover:bg-slate-100"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
        <button
          type="button"
          className="flex items-center gap-2 flex-shrink-0"
          onClick={() => {
            onPageChange("portfolio");
            setOpenNavMenu(null);
            setMobileOpen(false);
          }}
          aria-label="Go to Home"
          title="Go to Home"
        >
          <img
            src="/CloudOrbix.png"
            alt="CloudOrbix"
            className="h-7 w-7 object-contain"
          />
          <span className="font-bold text-sm" style={{ color: "#1E40AF" }}>
            CloudOrbix
          </span>
        </button>

        <nav
          ref={navRef}
          aria-label="Main navigation"
          className={`${mobileOpen ? "flex" : "hidden"} order-last basis-full flex-col gap-1 border-t py-2 lg:order-none lg:flex lg:basis-auto lg:flex-row lg:items-center lg:gap-1 lg:border-0 lg:py-0`}
        >
          <button
            type="button"
            onClick={() => {
              onPageChange("portfolio");
              setOpenNavMenu(null);
              setMobileOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            style={{
              background: page === "portfolio" ? (dark ? "#1E3A5F" : "#EFF6FF") : "transparent",
              color: page === "portfolio" ? (dark ? "#93C5FD" : "#1E40AF") : textMuted,
            }}
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          {!portfolioOnly && (
            <>
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={openNavMenu === "dashboard"}
                  onClick={() => setOpenNavMenu(openNavMenu === "dashboard" ? null : "dashboard")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors lg:w-auto"
                  style={{
                    background: page === "dashboard" ? (dark ? "#1E3A5F" : "#EFF6FF") : "transparent",
                    color: page === "dashboard" ? (dark ? "#93C5FD" : "#1E40AF") : textMuted,
                  }}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openNavMenu === "dashboard" ? "rotate-180" : ""}`}
                  />
                </button>
                {openNavMenu === "dashboard" && (
                  <div
                    className="nav-dropdown-enter absolute left-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded-xl border py-1 shadow-xl"
                    style={{ background: bg, borderColor }}
                  >
                    {([
                      ["project", "Project Dashboard"],
                      ["risk", "Risk Dashboard"],
                      ["rfp", "RFP Dashboard"],
                    ] as const).map(([view, label]) => {
                      const selected = dashboardView === view;
                      return (
                        <button
                          key={view}
                          type="button"
                          aria-current={selected ? "page" : undefined}
                          onClick={() => {
                            onDashboardViewChange(view);
                            onPageChange("dashboard");
                            setOpenNavMenu(null);
                            setMobileOpen(false);
                          }}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-50"
                          style={{
                            background: selected ? (dark ? "#1E3A5F" : "#EFF6FF") : "transparent",
                            color: selected ? (dark ? "#93C5FD" : "#1E40AF") : textBody,
                          }}
                        >
                          {label}
                          {selected && (
                            <span className="ml-4 h-1.5 w-1.5 rounded-full bg-blue-700" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  onPageChange("rfp");
                  setOpenNavMenu(null);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: page === "rfp" ? (dark ? "#1E3A5F" : "#EFF6FF") : "transparent",
                  color: page === "rfp" ? (dark ? "#93C5FD" : "#1E40AF") : textMuted,
                }}
              >
                <Calculator className="h-4 w-4" />
                RFP
              </button>
            </>
          )}
          {visibleNavigationGroups.map((group) => {
            const Icon = group.icon;
            const active = group.items.some((item) => item.id === page);
            const expanded = openNavMenu === group.id;
            return (
              <div className="relative" key={group.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenNavMenu(expanded ? null : group.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors lg:w-auto"
                  style={{
                    background: active ? (dark ? "#1E3A5F" : "#EFF6FF") : "transparent",
                    color: active ? (dark ? "#93C5FD" : "#1E40AF") : textMuted,
                  }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                {expanded && (
                  <div
                    className="nav-dropdown-enter absolute left-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded-xl border py-1 shadow-xl"
                    style={{ background: bg, borderColor }}
                  >
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onPageChange(item.id);
                          setOpenNavMenu(null);
                          setMobileOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-slate-50"
                        style={{
                          background: page === item.id ? (dark ? "#1E3A5F" : "#EFF6FF") : "transparent",
                          color: page === item.id ? (dark ? "#93C5FD" : "#1E40AF") : textBody,
                        }}
                      >
                        {item.label}
                        {page === item.id && (
                          <span className="ml-4 h-1.5 w-1.5 rounded-full bg-blue-700" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!portfolioOnly && (
            <button
              type="button"
              onClick={() => {
                onPageChange("help");
                setOpenNavMenu(null);
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{
                background: page === "help" ? (dark ? "#1E3A5F" : "#EFF6FF") : "transparent",
                color: page === "help" ? (dark ? "#93C5FD" : "#1E40AF") : textMuted,
              }}
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Dark mode */}
          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            style={{ color: textMuted }}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          {!portfolioOnly && <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
              style={{ color: textMuted }}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            {notifOpen && (
              <div
                className="absolute right-0 top-11 w-[360px] rounded-2xl shadow-2xl border z-50 overflow-hidden"
                style={{
                  background: bg,
                  borderColor,
                  boxShadow: dark
                    ? "0 18px 50px rgba(0,0,0,.35)"
                    : "0 18px 50px rgba(15,23,42,.16)",
                }}
              >
                <div
                  className="px-5 py-4 border-b flex items-center justify-between"
                  style={{
                    borderColor,
                    background: dark ? "#172554" : "#EFF6FF",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "#1E40AF", color: "#FFFFFF" }}
                    >
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div
                        className="font-bold text-sm"
                        style={{ color: textBody }}
                      >
                        CloudOrbix Alert
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: textMuted }}
                      >
                        Important project activity
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white text-blue-700 font-bold">{notifications.filter((notification) => !notification.read).length} new</span>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void clearNotifications()}
                        disabled={clearingNotifications}
                        className="p-1 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
                        style={{ color: textMuted }}
                        title="Clear all notifications"
                        aria-label="Clear all notifications"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length ? (showAllNotifications ? notifications : notifications.slice(0, 6)).map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className="w-full px-5 py-3 border-b flex gap-3 text-left hover:bg-slate-50 cursor-pointer"
                      style={{ borderColor }}
                    >
                      <div className="w-1 rounded-full flex-shrink-0" style={{ background: n.type === "warning" ? "#D97706" : n.type === "success" ? "#16A34A" : "#3B82F6" }} />
                      <div>
                        <div className="text-xs font-semibold mb-1" style={{ color: textBody }}>{n.text}</div>
                        {n.message && <div className="text-[11px] mb-1" style={{ color: textMuted }}>{n.message}</div>}
                        <div className="text-[10px]" style={{ color: textMuted }}>{n.time}</div>
                      </div>
                    </button>
                  )) : <div className="px-5 py-4 text-xs" style={{ color: textMuted }}>No new alerts</div>}
                </div>
                {notifications.length > 6 && (
                  <div className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllNotifications((showAll) => !showAll)}
                      className="text-xs font-semibold"
                      style={{ color: "#1E40AF" }}
                    >
                      {showAllNotifications ? "Show fewer alerts" : "View all alerts"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>}

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "#1E40AF" }}
              >
                {userInitials || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <div
                  className="text-xs font-semibold"
                  style={{ color: textBody }}
                >
                  {user ? `${user.firstName} ${user.lastName}` : ""}
                </div>
                <div className="text-[10px]" style={{ color: textMuted }}>
                  {roleLabel}
                </div>
              </div>
              <ChevronDown className="w-3 h-3" style={{ color: textMuted }} />
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-11 w-48 rounded-xl shadow-xl border z-50 overflow-hidden"
                style={{ background: bg, borderColor }}
              >
                <div className="p-3 border-b" style={{ borderColor }}>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: textBody }}
                  >
                    {user ? `${user.firstName} ${user.lastName}` : ""}
                  </div>
                  <div className="text-[10px]" style={{ color: textMuted }}>
                    {user ? user.email : "s.chen@enterprise.com"}
                  </div>
                  <div
                    className="mt-1 text-[10px] font-medium"
                    style={{ color: textMuted }}
                  >
                    {roleLabel}
                  </div>
                </div>
                {!portfolioOnly && <>
                  <button
                  onClick={() => {
                    onPageChange("profile");
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                  style={{ color: textBody }}
                >
                  <UserCircle2 className="w-3.5 h-3.5" /> My Profile
                  </button>
                </>}
                {isAdmin && <button
                  onClick={() => {
                    onPageChange("admin");
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                  style={{ color: textBody }}
                >
                  <Settings className="w-3.5 h-3.5" /> Settings
                </button>}
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Page directory"
        className="flex h-10 flex-shrink-0 items-center gap-2 border-b px-5 text-xs"
        style={{ background: bg, borderColor }}
      >
        {breadcrumbPaths[page].map((crumb, index) => {
          const current = index === breadcrumbPaths[page].length - 1;
          return (
            <span className="flex items-center gap-2" key={`${crumb.label}-${index}`}>
              {index > 0 && <span aria-hidden="true" style={{ color: textMuted }}>/</span>}
              {crumb.page && !current ? (
                <button
                  type="button"
                  onClick={() => onPageChange(crumb.page!)}
                  className="font-medium hover:underline"
                  style={{ color: textMuted }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={current ? "font-semibold" : ""}
                  style={{ color: current ? textBody : textMuted }}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto" style={{ background: pageBg }}>
          {children}
        </main>
      </div>
    </div>
  );
}

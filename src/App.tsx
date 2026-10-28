import { lazy, Suspense, useEffect, useState } from "react";
import Login from "./components/Login";
import Shell, { type Page } from "./components/Shell";
import LoadingScreen from "./components/LoadingScreen";
import type { RfpProjectPrefill } from "./components/RfpEstimation";

const Dashboard = lazy(() => import("./components/Dashboard"));
const Clients = lazy(() => import("./components/Clients"));
const ExcelImport = lazy(() => import("./components/ExcelImport"));
const Reports = lazy(() => import("./components/Reports"));
const AuditLogs = lazy(() => import("./components/AuditLogs"));
const Admin = lazy(() => import("./components/Admin"));
const SimplePage = lazy(() => import("./components/SimplePage"));
const ProjectPage = lazy(() => import("./components/ProjectPage"));
const DocumentsPage = lazy(() => import("./components/DocumentsPage"));
const ProjectRepository = lazy(() => import("./components/ProjectRepository"));
const ServiceCatalogue = lazy(() => import("./components/ServiceCatalogue"));
const ProjectFramework = lazy(() => import("./components/ProjectFramework"));
const ProfilePage = lazy(() => import("./components/ProfilePage"));
const RiskRegisterPage = lazy(() => import("./components/RiskRegisterPage"));
const RfpEstimation = lazy(() => import("./components/RfpEstimation"));

type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
};

const IDLE_LOGOUT_MS = 2 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "clmp-last-activity";

const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem("clmp-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const hasViewerOnlyAccess = (authUser: AuthUser | null): boolean =>
  Boolean(
    authUser?.roles.some((role) => role === "Viewer" || role === "Reader") &&
      !authUser.roles.includes("Admin"),
  );

const getInitialPage = (): Page => {
  if (hasViewerOnlyAccess(getStoredUser())) return "servicecatalogue";
  const hash = window.location.hash.replace(/^#/, "") as Page;
  const validPages: Page[] = ["dashboard", "clients", "projectframework", "reports", "excel", "audit", "admin", "help", "project", "documents", "repository", "servicecatalogue", "profile", "risks", "rfp"];
  return validPages.includes(hash) ? hash : "dashboard";
};

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("clmp-token")));
  const [page, setPage] = useState<Page>(getInitialPage);
  const [dark, setDark] = useState(() => localStorage.getItem("clmp-theme") !== "light");
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [projectId, setProjectId] = useState<string | null>(() => localStorage.getItem("clmp-project-id"));
  const [requestedEditProjectId, setRequestedEditProjectId] = useState<string | null>(null);
  const [repositoryDocuments, setRepositoryDocuments] = useState(() => localStorage.getItem("clmp-repository-documents") === "true");
  const [globalSearch, setGlobalSearch] = useState("");
  const [rfpProjectSeed, setRfpProjectSeed] = useState<RfpProjectPrefill | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("clmp-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const nextPage = (event.state?.page || window.location.hash.replace(/^#/, "")) as Page | undefined;
      const accessiblePage = hasViewerOnlyAccess(getStoredUser())
        ? "servicecatalogue"
        : nextPage || "dashboard";
      setPage(accessiblePage);
      if (accessiblePage !== nextPage) {
        window.history.replaceState({ page: accessiblePage }, "", `#${accessiblePage}`);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = (nextPage: Page) => {
    const accessiblePage = hasViewerOnlyAccess(user) ? "servicecatalogue" : nextPage;
    setPage(accessiblePage);
    window.history.pushState({ page: accessiblePage }, "", accessiblePage === "dashboard" ? "/" : `#${accessiblePage}`);
  };

  const openProject = (id: string, destination: Page = "project") => {
    setProjectId(id);
    localStorage.setItem("clmp-project-id", id);
    const readOnly = destination === "documents";
    setRepositoryDocuments(readOnly);
    localStorage.setItem("clmp-repository-documents", String(readOnly));
    navigateTo(destination);
  };

  const openRfpProject = (seed: RfpProjectPrefill) => {
    setRfpProjectSeed(seed);
    navigateTo("clients");
  };

  const handleGlobalSearch = (query: string) => {
    setGlobalSearch(query);
    if (hasViewerOnlyAccess(user)) return;
    if (query && page !== "clients") {
      setPage("clients");
      window.history.replaceState({ page: "clients" }, "", "#clients");
    }
  };

  useEffect(() => {
    if (!loggedIn) {
      localStorage.removeItem("clmp-token");
      localStorage.removeItem("clmp-user");
      setUser(null);
    }
  }, [loggedIn]);

  const handleLogin = (authUser: AuthUser, token: string) => {
    localStorage.setItem("clmp-token", token);
    localStorage.setItem("clmp-user", JSON.stringify(authUser));
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    setUser(authUser);
    setPage("servicecatalogue");
    window.history.replaceState({ page: "servicecatalogue" }, "", "#servicecatalogue");
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("clmp-token");
    localStorage.removeItem("clmp-user");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem("clmp-project-id");
    localStorage.removeItem("clmp-repository-documents");
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("clmp-rfp-draft-")) sessionStorage.removeItem(key);
    }
    setPage("dashboard");
    window.history.replaceState({ page: "dashboard" }, "", "/");
    setLoggedIn(false);
    setUser(null);
  };

  useEffect(() => {
    if (!loggedIn) return;

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
    let lastActivityAt = Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now();
    let lastActivityWrite = 0;
    const recordActivity = () => {
      const now = Date.now();
      const lastActivity = Math.max(
        lastActivityAt,
        Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0,
      );
      if (Number.isFinite(lastActivity) && lastActivity > 0 && now - lastActivity >= IDLE_LOGOUT_MS) {
        handleLogout();
        return;
      }
      lastActivityAt = now;
      if (now - lastActivityWrite >= 5_000) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        lastActivityWrite = now;
      }
    };
    const checkIdleTimeout = () => {
      const lastActivity = Math.max(
        lastActivityAt,
        Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0,
      );
      if (Number.isFinite(lastActivity) && lastActivity > 0 && Date.now() - lastActivity >= IDLE_LOGOUT_MS) {
        handleLogout();
      }
    };
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === "clmp-token" && !event.newValue) {
        handleLogout();
      } else if (event.key === LAST_ACTIVITY_KEY) {
        checkIdleTimeout();
      }
    };
    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    const idleCheck = window.setInterval(checkIdleTimeout, 30_000);
    window.addEventListener("storage", onStorageChange);
    checkIdleTimeout();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.clearInterval(idleCheck);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [loggedIn]);

  if (booting) {
    return <LoadingScreen />;
  }

  if (!loggedIn || !user) {
    return <Login onLogin={handleLogin} />;
  }

  const visiblePage: Page = hasViewerOnlyAccess(user) ? "servicecatalogue" : page;
  const renderPage = () => {
    switch (visiblePage) {
      case "dashboard":   return <Dashboard dark={dark} onNavigate={p => navigateTo(p as Page)} user={user} />;
      case "clients":     return <Clients dark={dark} user={user} initialSearch={globalSearch} requestedEditId={requestedEditProjectId} onEditRequestHandled={() => setRequestedEditProjectId(null)} newProjectSeed={rfpProjectSeed} onProjectSeedConsumed={() => setRfpProjectSeed(null)} onOpenProject={(id) => openProject(id)} />;
      case "project":     return projectId ? <ProjectPage dark={dark} clientId={projectId} user={user} onBack={() => navigateTo("clients")} onOpenDocuments={() => navigateTo("documents")} onEditProject={() => { setRequestedEditProjectId(projectId); navigateTo("clients"); }} /> : <Clients dark={dark} user={user} initialSearch={globalSearch} requestedEditId={requestedEditProjectId} onEditRequestHandled={() => setRequestedEditProjectId(null)} newProjectSeed={rfpProjectSeed} onProjectSeedConsumed={() => setRfpProjectSeed(null)} onOpenProject={(id) => openProject(id)} />;
      case "documents":  return projectId ? <DocumentsPage dark={dark} clientId={projectId} readOnly={repositoryDocuments} onBack={() => navigateTo(repositoryDocuments ? "repository" : "project")} /> : <Clients dark={dark} user={user} initialSearch={globalSearch} onOpenProject={(id) => openProject(id)} />;
      case "repository": return <ProjectRepository dark={dark} onOpenProject={(id) => openProject(id, "documents")} />;
      case "projectframework": return <ProjectFramework dark={dark} />;
      case "servicecatalogue": return <ServiceCatalogue dark={dark} />;
      case "excel":       return user.roles.includes("Admin") ? <ExcelImport dark={dark} /> : <Clients dark={dark} user={user} initialSearch={globalSearch} onOpenProject={(id) => openProject(id)} />;
      case "reports":     return <Reports dark={dark} />;
      case "audit":       return user.roles.includes("Admin") ? <AuditLogs dark={dark} /> : <Dashboard dark={dark} onNavigate={p => navigateTo(p as Page)} user={user} />;
      case "admin":       return user.roles.includes("Admin") ? <Admin dark={dark} user={user} onOpenProject={(id) => openProject(id)} /> : <Dashboard dark={dark} onNavigate={p => navigateTo(p as Page)} user={user} />;
      case "rfp":         return <RfpEstimation dark={dark} isAdmin={user.roles.includes("Admin")} userId={user.id} onMoveToProject={openRfpProject} />;
      case "profile":     return <ProfilePage dark={dark} user={user} onOpenProject={(id) => openProject(id)} />;
      case "risks":       return <RiskRegisterPage dark={dark} user={user} onOpenProject={(id) => openProject(id, "project")} />;
      case "help":        return <SimplePage page={page} dark={dark} />;
      default:            return <Dashboard dark={dark} onNavigate={p => setPage(p as Page)} user={user} />;
    }
  };

  return (
    <Shell
      page={visiblePage}
      onPageChange={navigateTo}
      onLogout={handleLogout}
      dark={dark}
      user={user}
      onToggleDark={() => setDark(d => !d)}
      onSearch={handleGlobalSearch}
      onOpenProject={(id) => openProject(id)}
    >
      <Suspense fallback={<LoadingScreen />}>{renderPage()}</Suspense>
    </Shell>
  );
}

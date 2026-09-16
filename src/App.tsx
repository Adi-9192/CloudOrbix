import { lazy, Suspense, useEffect, useState } from "react";
import Login from "./components/Login";
import Shell, { type Page } from "./components/Shell";
import LoadingScreen from "./components/LoadingScreen";

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

type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
};

const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem("clmp-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getInitialPage = (): Page => {
  const hash = window.location.hash.replace(/^#/, "") as Page;
  const validPages: Page[] = ["dashboard", "clients", "projectframework", "reports", "excel", "audit", "admin", "help", "project", "documents", "repository", "servicecatalogue", "profile"];
  return validPages.includes(hash) ? hash : "dashboard";
};

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("clmp-token")));
  const [page, setPage] = useState<Page>(getInitialPage);
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [projectId, setProjectId] = useState<string | null>(() => localStorage.getItem("clmp-project-id"));
  const [repositoryDocuments, setRepositoryDocuments] = useState(() => localStorage.getItem("clmp-repository-documents") === "true");
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const nextPage = (event.state?.page || window.location.hash.replace(/^#/, "")) as Page | undefined;
      if (nextPage) setPage(nextPage);
      else setPage("dashboard");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = (nextPage: Page) => {
    setPage(nextPage);
    window.history.pushState({ page: nextPage }, "", nextPage === "dashboard" ? "/" : `#${nextPage}`);
  };

  const openProject = (id: string, destination: Page = "project") => {
    setProjectId(id);
    localStorage.setItem("clmp-project-id", id);
    const readOnly = destination === "documents";
    setRepositoryDocuments(readOnly);
    localStorage.setItem("clmp-repository-documents", String(readOnly));
    navigateTo(destination);
  };

  const handleGlobalSearch = (query: string) => {
    setGlobalSearch(query);
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
    setUser(authUser);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("clmp-token");
    localStorage.removeItem("clmp-user");
    localStorage.removeItem("clmp-project-id");
    localStorage.removeItem("clmp-repository-documents");
    setPage("dashboard");
    window.history.replaceState({ page: "dashboard" }, "", "/");
    setLoggedIn(false);
    setUser(null);
  };

  if (booting) {
    return <LoadingScreen />;
  }

  if (!loggedIn || !user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard":   return <Dashboard dark={dark} onNavigate={p => navigateTo(p as Page)} user={user} />;
      case "clients":     return <Clients dark={dark} user={user} initialSearch={globalSearch} onOpenProject={(id) => openProject(id)} />;
      case "project":     return projectId ? <ProjectPage dark={dark} clientId={projectId} user={user} onBack={() => navigateTo("clients")} onOpenDocuments={() => navigateTo("documents")} /> : <Clients dark={dark} user={user} initialSearch={globalSearch} onOpenProject={(id) => openProject(id)} />;
      case "documents":  return projectId ? <DocumentsPage dark={dark} clientId={projectId} readOnly={repositoryDocuments} onBack={() => navigateTo(repositoryDocuments ? "repository" : "project")} /> : <Clients dark={dark} user={user} initialSearch={globalSearch} onOpenProject={(id) => openProject(id)} />;
      case "repository": return <ProjectRepository dark={dark} onOpenProject={(id) => openProject(id, "documents")} />;
      case "projectframework": return <ProjectFramework dark={dark} />;
      case "servicecatalogue": return <ServiceCatalogue />;
      case "excel":       return user.roles.includes("Admin") ? <ExcelImport dark={dark} /> : <Dashboard dark={dark} onNavigate={p => navigateTo(p as Page)} user={user} />;
      case "reports":     return <Reports dark={dark} />;
      case "audit":       return user.roles.includes("Admin") ? <AuditLogs dark={dark} /> : <Dashboard dark={dark} onNavigate={p => navigateTo(p as Page)} user={user} />;
      case "admin":       return user.roles.includes("Admin") ? <Admin dark={dark} user={user} /> : <Dashboard dark={dark} onNavigate={p => navigateTo(p as Page)} user={user} />;
      case "profile":     return <ProfilePage dark={dark} user={user} onOpenProject={(id) => openProject(id)} />;
      case "help":        return <SimplePage page={page} dark={dark} />;
      default:            return <Dashboard dark={dark} onNavigate={p => setPage(p as Page)} user={user} />;
    }
  };

  return (
    <Shell
      page={page}
      onPageChange={navigateTo}
      onLogout={handleLogout}
      dark={dark}
      user={user}
      onToggleDark={() => setDark(d => !d)}
      onSearch={handleGlobalSearch}
    >
      <Suspense fallback={<LoadingScreen />}>{renderPage()}</Suspense>
    </Shell>
  );
}

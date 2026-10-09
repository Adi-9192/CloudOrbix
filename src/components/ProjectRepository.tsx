import { useCallback, useEffect, useState } from "react";
import { FolderOpen, RefreshCw, Search } from "lucide-react";
import { showCloudOrbixAlert } from "../alert";

type RepositoryProps = { dark: boolean; onOpenProject: (clientId: string) => void };
type RepositoryProject = {
  client_id: string;
  client_name: string;
  project_manager?: string;
  account_manager?: string;
  region?: string;
  year?: number;
  hyperscaler?: string;
  completion?: number;
  current_status: string;
  document_count: number;
};

export default function ProjectRepository({ dark, onOpenProject }: RepositoryProps) {
  const [projects, setProjects] = useState<RepositoryProject[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";

  const loadProjects = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setRefreshing(true);
    const token = localStorage.getItem("clmp-token");
    try {
      const response = await fetch("/api/projects/repository", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Unable to load repository.");
      }
      setProjects(body.projects || []);
      setMessage("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to load repository.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    const refresh = () => void loadProjects(true);
    window.addEventListener("focus", refresh);
    window.addEventListener("cloudorbix-projects-updated", refresh);
    const refreshInterval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("cloudorbix-projects-updated", refresh);
      window.clearInterval(refreshInterval);
    };
  }, [loadProjects]);

  const searchTerm = search.trim().toLowerCase();
  const filtered = projects.filter((project) =>
    `${project.client_name} ${project.client_id} ${project.project_manager || ""} ${project.account_manager || ""} ${project.region || ""} ${project.hyperscaler || ""} ${project.current_status || ""} ${project.year || ""}`
      .toLowerCase()
      .includes(searchTerm),
  );

  return (
    <div className="p-6 space-y-5" style={{ color: text }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Project Repository</h1>
          <p className="text-xs mt-1" style={{ color: muted }}>
            Approved projects and their associated documents
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadProjects(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: border, background: bg, color: text }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: muted }} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects"
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs"
          style={{ background: bg, borderColor: border, color: text }}
        />
      </div>

      {message && (
        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#FCA5A5", color: "#B91C1C" }}>
          {message}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
        {loading ? (
          <p className="p-5 text-xs" style={{ color: muted }}>Loading projects…</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-xs" style={{ color: muted }}>
            {message || "No approved projects found."}
          </p>
        ) : filtered.map((project) => (
          <button
            key={project.client_id}
            onClick={() => onOpenProject(project.client_id)}
            className="w-full flex items-center gap-4 px-5 py-4 border-b text-left hover:bg-slate-50"
            style={{ borderColor: border }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: project.current_status === "Completed" ? "#DCFCE7" : "#DBEAFE" }}
            >
              <FolderOpen
                className="w-5 h-5"
                style={{ color: project.current_status === "Completed" ? "#16A34A" : "#1E40AF" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{project.client_name}</div>
              <div className="text-[10px] mt-1 truncate" style={{ color: muted }}>
                {project.client_id}
                {" · PM: "}
                {project.project_manager || project.account_manager || "Unassigned"}
                {project.region ? ` · ${project.region}` : ""}
                {project.year ? ` · ${project.year}` : ""}
                {project.hyperscaler ? ` · ${project.hyperscaler}` : ""}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-semibold">{project.current_status || "On-track"}</div>
              <div className="text-[10px] mt-1" style={{ color: muted }}>
                {project.completion || 0}% complete · {project.document_count} documents
              </div>
            </div>
            <FolderOpen className="w-4 h-4 shrink-0" style={{ color: "#1E40AF" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

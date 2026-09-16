import { useEffect, useState } from "react";
import { CheckCircle2, FolderOpen, Search } from "lucide-react";
import { showCloudOrbixAlert } from "../alert";

type RepositoryProps = { dark: boolean; onOpenProject: (clientId: string) => void };
type RepositoryProject = { client_id: string; client_name: string; project_manager?: string; completion?: number; current_status: string; document_count: number };

export default function ProjectRepository({ dark, onOpenProject }: RepositoryProps) {
  const [projects, setProjects] = useState<RepositoryProject[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";

  useEffect(() => {
    const token = localStorage.getItem("clmp-token");
    fetch("/api/projects/repository", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || "Unable to load repository."); return body; })
      .then((body) => setProjects(body.projects || []))
      .catch((error) => { setMessage(error.message); showCloudOrbixAlert(error.message, "error"); });
  }, []);

  const filtered = projects.filter((project) => `${project.client_name} ${project.client_id} ${project.project_manager || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="p-6 space-y-5" style={{ color: text }}>
    <div><h1 className="text-xl font-bold">Project Repository</h1><p className="text-xs mt-1" style={{ color: muted }}>Completed projects and their archived documents</p></div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: muted }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search completed projects" className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs" style={{ background: bg, borderColor: border, color: text }} /></div>
    {message && <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#FCA5A5", color: "#B91C1C" }}>{message}</div>}
    <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
      {filtered.length === 0 ? <p className="p-5 text-xs" style={{ color: muted }}>{message || "No completed projects found."}</p> : filtered.map((project) => <button key={project.client_id} onClick={() => onOpenProject(project.client_id)} className="w-full flex items-center gap-4 px-5 py-4 border-b text-left hover:bg-slate-50" style={{ borderColor: border }}><div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-100"><CheckCircle2 className="w-5 h-5 text-green-600" /></div><div className="flex-1"><div className="text-xs font-semibold">{project.client_name}</div><div className="text-[10px] mt-1" style={{ color: muted }}>{project.client_id} · PM: {project.project_manager || "Unassigned"}</div></div><div className="text-right"><div className="text-xs font-semibold">{project.document_count} documents</div><div className="text-[10px] mt-1" style={{ color: muted }}>{project.completion || 0}% complete</div></div><FolderOpen className="w-4 h-4" style={{ color: "#1E40AF" }} /></button>)}
    </div>
  </div>;
}
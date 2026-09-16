import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckSquare,
  FolderOpen,
  ListTodo,
  UserCircle2,
} from "lucide-react";

interface ProfilePageProps {
  dark: boolean;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
  };
  onOpenProject?: (clientId: string) => void;
}

type ProjectAlert = {
  projectId: string;
  projectName: string;
  label: string;
  severity: "warning" | "danger" | "info";
  message: string;
};

type TodoItem = {
  id: string;
  projectId?: string;
  text: string;
  dueDate: string;
  done: boolean;
};

type ApiProject = {
  clientId: string;
  clientName: string;
  accountManager?: string | null;
  projectManager?: string | null;
  currentStatus?: string | null;
  completion?: number | null;
  plannedOnboardDate?: string | null;
  plannedOffboardDate?: string | null;
  estimatedEndDate?: string | null;
  updatedDate?: string | null;
  projectBrief?: string | null;
};

const formatProjectStatus = (status?: string | null) => {
  const value = (status || "").trim();
  if (!value) return "On Track";
  if (/delay|delayed|risk|at risk|blocked|overdue|issue/i.test(value)) {
    if (/risk|at risk/i.test(value)) return "At Risk";
    if (/blocked/i.test(value)) return "Blocked";
    return "Delayed";
  }
  return value;
};

const getProjectDueDate = (project: ApiProject) => {
  return project.estimatedEndDate || project.plannedOffboardDate || project.plannedOnboardDate || "TBD";
};

export default function ProfilePage({ dark, user, onOpenProject }: ProfilePageProps) {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskText, setTaskText] = useState("");
  const [taskDate, setTaskDate] = useState("");

  const bg = dark ? "#0F172A" : "#FFFFFF";
  const panel = dark ? "#111827" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const borderColor = border;
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const soft = dark ? "#1E293B" : "#F8FAFC";

  useEffect(() => {
    const token = localStorage.getItem("clmp-token");
    if (!token) {
      setLoading(false);
      return;
    }

    const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
    const currentUserEmail = user?.email || "";

    const loadProjects = async () => {
      try {
        const response = await fetch("/api/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setProjects([]);
          setSelectedProjectId(null);
          setLoading(false);
          return;
        }

        const payload = await response.json();
        const allProjects = Array.isArray(payload?.clients) ? payload.clients : [];
        const assignedProjects = allProjects.filter((project: ApiProject) => {
          const managerSet = [project.accountManager, project.projectManager];
          return managerSet.some((value) => {
            if (!value) return false;
            return value === currentUserName || value === currentUserEmail || value.toLowerCase() === currentUserName.toLowerCase();
          });
        });

        const mappedProjects: ApiProject[] = assignedProjects.filter(Boolean) as ApiProject[];
        setProjects(mappedProjects);
        setSelectedProjectId(mappedProjects[0]?.clientId || null);
      } catch {
        setProjects([]);
        setSelectedProjectId(null);
      }
    };

    const loadTasks = async () => {
      try {
        const response = await fetch("/api/profile-tasks", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setTodos([]);
          return;
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.tasks) ? payload.tasks : [];
        setTodos(items.map((task: any) => ({
          id: String(task.id),
          text: String(task.text || "Untitled task"),
          dueDate: task.dueDate || "No due date",
          done: Boolean(task.done),
        })));
      } catch {
        setTodos([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
    loadTasks();
  }, [user]);

  const alerts = useMemo<ProjectAlert[]>(() => {
    return projects.flatMap((project) => {
      const items: ProjectAlert[] = [];
      const projectStatus = formatProjectStatus(project.currentStatus);
      const clientId = project.clientId;
      const name = project.clientName || clientId;

      if (projectStatus === "Delayed") {
        items.push({
          projectId: clientId,
          projectName: name,
          label: "delayed",
          severity: "warning",
          message: `${clientId} : delayed`,
        });
      }

      if (projectStatus === "At Risk") {
        items.push({
          projectId: clientId,
          projectName: name,
          label: "risk",
          severity: "danger",
          message: `${clientId} : risk`,
        });
      }

      if (projectStatus === "Blocked") {
        items.push({
          projectId: clientId,
          projectName: name,
          label: "blocked",
          severity: "danger",
          message: `${clientId} : blocked`,
        });
      }

      const completion = Number(project.completion || 0);
      if (completion >= 90 && projectStatus !== "Delayed" && projectStatus !== "At Risk" && projectStatus !== "Blocked") {
        items.push({
          projectId: clientId,
          projectName: name,
          label: "milestone",
          severity: "info",
          message: `${clientId} : nearing milestone`,
        });
      }

      return items;
    });
  }, [projects]);

  const toggleTask = async (taskId: string) => {
    const task = todos.find((item) => item.id === taskId);
    if (!task) return;

    const token = localStorage.getItem("clmp-token");
    if (!token) return;

    try {
      const response = await fetch(`/api/profile-tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: task.text, dueDate: task.dueDate === "No due date" ? null : task.dueDate, done: !task.done }),
      });

      if (!response.ok) return;
      const payload = await response.json();
      const updated = payload.task;
      setTodos((current) => current.map((item) => item.id === taskId ? {
        ...item,
        done: Boolean(updated.done),
        dueDate: updated.dueDate || "No due date",
        text: updated.text || item.text,
      } : item));
    } catch {
      // no-op: user can retry after reloading
    }
  };

  const addTask = async () => {
    const trimmed = taskText.trim();
    if (!trimmed) return;

    const token = localStorage.getItem("clmp-token");
    if (!token) return;

    try {
      const response = await fetch("/api/profile-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: trimmed, dueDate: taskDate || null, done: false }),
      });

      if (!response.ok) return;
      const payload = await response.json();
      const task = payload.task;
      setTodos((current) => [{
        id: String(task.id),
        text: String(task.text),
        dueDate: task.dueDate || "No due date",
        done: Boolean(task.done),
      }, ...current]);
      setTaskText("");
      setTaskDate("");
    } catch {
      // no-op
    }
  };

  const animatedAlerts = alerts.length ? [...alerts, ...alerts] : [];

  const safeName = user ? `${user.firstName} ${user.lastName}`.trim() : "User";
  const initials = safeName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[280px]" style={{ color: text }}>
        Loading profile…
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.5fr_0.85fr]" style={{ color: text }}>
      <div className="grid gap-6">
        <section className="rounded-2xl border p-5" style={{ background: panel, borderColor: border }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: muted }}>Profile</div>
              <h2 className="mt-2 text-2xl font-bold">{safeName}</h2>
              <div className="text-sm" style={{ color: muted }}>{user?.email || "No email available"}</div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
              {initials || "U"}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(user?.roles || ["Manager"]).map((role) => (
              <span key={role} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: dark ? "#1E293B" : "#EFF6FF", color: "#1E40AF" }}>
                {role === "Admin" ? "System Administrator" : role}
              </span>
            ))}
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: dark ? "#1E293B" : "#EFF6FF", color: "#1E40AF" }}>
              {projects.length} active project{projects.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: dark ? "#1E293B" : "#EFF6FF", color: "#1E40AF" }}>
              {todos.filter((item) => !item.done).length} open tasks
            </span>
          </div>
        </section>

        <section className="rounded-2xl border p-5" style={{ background: panel, borderColor: border }}>
          <div className="mb-4 flex items-center gap-2">
            <FolderOpen className="h-4 w-4" style={{ color: "#1E40AF" }} />
            <h3 className="text-lg font-semibold">Projects I maintain</h3>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm" style={{ borderColor, color: muted }}>
              You are not assigned to any active projects yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map((project) => {
                const projectStatus = formatProjectStatus(project.currentStatus);
                const completion = Number(project.completion || 0);
                const isSelected = selectedProjectId === project.clientId;
                const statusTone =
                  projectStatus === "Delayed"
                    ? { bg: "#FEF3C7", text: "#92400E" }
                    : projectStatus === "At Risk" || projectStatus === "Blocked"
                      ? { bg: "#FEE2E2", text: "#991B1B" }
                      : { bg: "#DCFCE7", text: "#166534" };

                return (
                  <button
                    key={project.clientId}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.clientId);
                      onOpenProject?.(project.clientId);
                    }}
                    className="w-full rounded-xl border p-4 text-left transition-colors"
                    style={{
                      background: isSelected ? "rgba(96,165,250,0.12)" : soft,
                      borderColor: isSelected ? "#60A5FA" : border,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: muted }}>{project.clientId}</div>
                        <div className="mt-2 text-base font-semibold">{project.clientName}</div>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: statusTone.bg, color: statusTone.text }}>
                        {projectStatus}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-xs" style={{ color: muted }}>
                        <span>Completion</span>
                        <strong style={{ color: text }}>{Math.min(completion, 100)}%</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full" style={{ background: dark ? "#334155" : "#E2E8F0" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(completion, 100)}%`,
                            background: projectStatus === "Delayed" ? "#F59E0B" : "#2563EB",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: muted }}>
                        <span>Due</span>
                        <strong style={{ color: text }}>{getProjectDueDate(project)}</strong>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold" style={{ color: "#1E40AF" }}>
                      Open project <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6">
        <section className="rounded-2xl border p-5" style={{ background: panel, borderColor: border }}>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: "#F59E0B" }} />
            <h3 className="text-lg font-semibold">Project alerts</h3>
          </div>

          <div className="alert-container overflow-hidden rounded-xl border" style={{ borderColor, background: dark ? "#0F172A" : "#F8FAFC" }}>
            {alerts.length === 0 ? (
              <div className="p-4 text-sm" style={{ color: muted }}>
                No active project alerts for your portfolio.
              </div>
            ) : (
              <div className="alert-list">
                {animatedAlerts.map((alert, index) => (
                  <div
                    key={`${alert.projectId}-${index}`}
                    className="rounded-lg border px-3 py-2 mx-2 my-1"
                    style={{
                      borderColor,
                      background:
                        alert.severity === "danger"
                          ? dark ? "rgba(127, 29, 29, 0.22)" : "#FEF2F2"
                          : alert.severity === "warning"
                            ? dark ? "rgba(146, 64, 14, 0.22)" : "#FFF7ED"
                            : dark ? "rgba(30,64,175,0.18)" : "#EFF6FF",
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: muted }}>{alert.label}</div>
                    <div className="mt-1 font-semibold">{alert.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border p-5" style={{ background: panel, borderColor: border }}>
          <div className="mb-4 flex items-center gap-2">
            <ListTodo className="h-4 w-4" style={{ color: "#1E40AF" }} />
            <h3 className="text-lg font-semibold">My tasks</h3>
          </div>

          <div className="mb-4 grid gap-2 rounded-xl border p-3" style={{ borderColor, background: dark ? "#0F172A" : "#F8FAFC" }}>
            <input
              value={taskText}
              onChange={(event) => setTaskText(event.target.value)}
              placeholder="Add a personal task"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor, background: bg, color: text }}
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={taskDate}
                onChange={(event) => setTaskDate(event.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor, background: bg, color: text }}
              />
              <button
                type="button"
                onClick={addTask}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                style={{ background: "#1E40AF" }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {todos.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor, color: muted }}>
                No personal tasks yet. Add your next action item.
              </div>
            ) : (
              todos.map((task) => (
                <div key={task.id} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor, background: task.done ? dark ? "#0F172A" : "#F8FAFC" : bg }}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    aria-label={task.text}
                    className="mt-1 h-4 w-4"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold" style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? muted : text }}>
                      {task.text}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: muted }}>
                      <CalendarClock className="h-3 w-3" />
                      {task.dueDate}
                    </div>
                  </div>

                  <div className="text-[10px] font-medium" style={{ color: muted }}>
                    Personal
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

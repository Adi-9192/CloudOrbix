import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  FolderOpen,
  Lock,
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
  const [taskText, setTaskText] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

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

    const managerIdentifiers = [
      user ? `${user.firstName} ${user.lastName}`.trim() : "",
      user?.email || "",
    ].map((value) => value.trim().toLocaleLowerCase()).filter(Boolean);

    const loadProjects = async () => {
      try {
        const response = await fetch("/api/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setProjects([]);
          return;
        }

        const payload = await response.json();
        const allProjects = Array.isArray(payload?.clients) ? payload.clients : [];
        const assignedProjects = allProjects.filter((project: ApiProject) => {
          const managers = [project.accountManager, project.projectManager]
            .flatMap((value) => (value || "").split(/[,;/|]+/))
            .map((value) => value.trim().toLocaleLowerCase())
            .filter(Boolean);
          return managers.some((manager) => managerIdentifiers.includes(manager));
        });

        const mappedProjects: ApiProject[] = assignedProjects.filter(Boolean) as ApiProject[];
        setProjects(mappedProjects);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
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
  }, [user]);

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    const token = localStorage.getItem("clmp-token");
    if (!token) {
      setPasswordError("Your session has expired. Please sign in again.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });
      const responseText = await response.text();
      let payload: { message?: string } = {};
      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          throw new Error("The server returned an invalid response. Please try again.");
        }
      }
      if (!response.ok) {
        throw new Error(payload.message || "Unable to change password.");
      }

      setPasswordMessage(payload.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(
        error instanceof TypeError
          ? "Unable to reach the server. Please try again."
          : error instanceof Error
            ? error.message
            : "Unable to change password.",
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

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
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border p-5" style={{ background: panel, borderColor: border }}>
          <div className="mb-4 flex items-center gap-2">
            <FolderOpen className="h-4 w-4" style={{ color: "#1E40AF" }} />
            <h3 className="text-lg font-semibold">Projects assigned to me</h3>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm" style={{ borderColor, color: muted }}>
              No projects are assigned to you yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map((project) => {
                const projectStatus = formatProjectStatus(project.currentStatus);
                const completion = Number(project.completion || 0);
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
                    onClick={() => onOpenProject?.(project.clientId)}
                    className="group w-full rounded-xl border p-4 text-left transition-colors hover:border-blue-400"
                    style={{
                      background: soft,
                      borderColor: border,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: muted }}>{project.clientId}</div>
                        <div className="mt-2 text-base font-semibold group-hover:text-blue-600">{project.clientName}</div>
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
            <Lock className="h-4 w-4" style={{ color: "#1E40AF" }} />
            <h3 className="text-lg font-semibold">Reset password</h3>
          </div>
          <form onSubmit={handlePasswordChange} className="grid gap-3">
            <label className="grid gap-1 text-xs font-medium" style={{ color: muted }}>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor, background: soft, color: text }}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium" style={{ color: muted }}>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor, background: soft, color: text }}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium" style={{ color: muted }}>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor, background: soft, color: text }}
              />
            </label>
            <p className="text-xs" style={{ color: muted }}>Use at least 8 characters for your new password.</p>
            {passwordError && <p role="alert" className="text-sm text-red-500">{passwordError}</p>}
            {passwordMessage && <p role="status" className="text-sm text-green-600">{passwordMessage}</p>}
            <button
              type="submit"
              disabled={passwordSubmitting}
              className="justify-self-start rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "#1E40AF" }}
            >
              {passwordSubmitting ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}

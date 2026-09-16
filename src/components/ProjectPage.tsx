import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Check,
  Download,
  Pencil,
  Plus,
  Upload,
  X,
} from "lucide-react";

import { MANDATORY_DOCUMENTS } from "../data/projectDocuments";
import { showCloudOrbixAlert } from "../alert";

type ProjectPageProps = {
  dark: boolean;
  clientId: string;
  onBack: () => void;
  onOpenDocuments: () => void;
  user: { firstName: string; lastName: string; email: string };
};

type Task = {
  id: number;
  task_title: string;
  assigned_to: string;
  expected_start_date: string;
  expected_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  progress: number;
  status: string;
  remark: string;
};

type Project = {
  client_id: string;
  client_name: string;
  account_manager: string;
  project_manager: string;
  project_progress: number;
  project_brief: string;
  current_status: string;
  completion: number;
  hyperscaler: string;
  project_type: string;
};

type TaskDraft = {
  taskTitle: string;
  assignedTo: string;
  expectedStartDate: string;
  expectedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  progress: string;
  status: string;
  remark: string;
};

type ProjectUpdate = {
  id: number;
  update_text: string;
  updated_by: string;
  created_at: string;
};

type Risk = {
  id: number;
  customer_name: string;
  initiative_name: string;
  risk_title: string;
  risk_category: string;
  date_raised: string;
  raised_by: string;
  description: string;
  probability: string;
  owner: string;
  level: string;
  impact: string;
  impact_description: string;
  status: string;
  mitigation: string;
  comments_actions: string;
};

type RiskDraft = {
  customerName: string;
  initiativeName: string;
  pm: string;
  riskTitle: string;
  riskCategory: string;
  dateRaised: string;
  raisedBy: string;
  description: string;
  probability: string;
  owner: string;
  level: string;
  impact: string;
  impactDescription: string;
  status: string;
  mitigation: string;
  commentsActions: string;
};

const emptyTask: TaskDraft = {
  taskTitle: "",
  assignedTo: "",
  expectedStartDate: "",
  expectedEndDate: "",
  actualStartDate: "",
  actualEndDate: "",
  progress: "0",
  status: "Not Started",
  remark: "",
};

const statuses = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Completed",
  "delayed",
  "On Hold",
  "Cancelled",
  "Closed",
];

const riskStatuses = ["Open", "Closed", "On Hold"];

const riskLevels = ["Low", "Medium", "High"];

const emptyRisk: RiskDraft = {
  customerName: "",
  initiativeName: "",
  pm: "",
  riskTitle: "",
  riskCategory: "",
  dateRaised: new Date().toISOString().slice(0, 10),
  raisedBy: "",
  description: "",
  probability: "Medium",
  owner: "",
  level: "Medium",
  impact: "Medium",
  impactDescription: "",
  status: "Open",
  mitigation: "",
  commentsActions: "",
};

const toDraft = (task: Task): TaskDraft => ({
  taskTitle: task.task_title || "",
  assignedTo: task.assigned_to || "",
  expectedStartDate: task.expected_start_date || "",
  expectedEndDate: task.expected_end_date || "",
  actualStartDate: task.actual_start_date || "",
  actualEndDate: task.actual_end_date || "",
  progress: String(task.progress || 0),
  status: task.status || "Not Started",
  remark: task.remark || "",
});

export default function ProjectPage({
  dark,
  clientId,
  onBack,
  onOpenDocuments,
  user,
}: ProjectPageProps) {
  const [project, setProject] = useState<Project | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);

  const [documents, setDocuments] = useState<
    {
      id: number;
      file_name: string;
      blob_url: string;
      document_type?: string;
    }[]
  >([]);

  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);

  const [risks, setRisks] = useState<Risk[]>([]);

  const [updateText, setUpdateText] = useState("");

  const [risk, setRisk] = useState<RiskDraft>(emptyRisk);

  const [task, setTask] = useState<TaskDraft>(emptyTask);

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [showAllTasks, setShowAllTasks] = useState(false);

  const [showAllRisks, setShowAllRisks] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);

  const alerts: string[] = [];

  tasks.forEach((task) => {
    const today = new Date();

    const startDate = task.expected_start_date
      ? new Date(task.expected_start_date)
      : null;

    const endDate = task.expected_end_date
      ? new Date(task.expected_end_date)
      : null;

    const status = task.status?.toLowerCase();

    if (startDate && today > startDate && status === "not started") {
      const daysLate = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      alerts.push(`⚠️ ${task.task_title}: Start delayed by ${daysLate} days`);
    }

    if (status === "blocked") {
      alerts.push(`⛔ ${task.task_title}: is currently blocked`);
    }

    if (
      endDate &&
      today > endDate &&
      status !== "completed" &&
      status !== "closed"
    ) {
      const daysLate = Math.floor(
        (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      alerts.push(`🔴 ${task.task_title}: End delayed by ${daysLate} days`);
    }
  });

  const bg = dark ? "#1E293B" : "#FFFFFF";

  const border = dark ? "#334155" : "#E2E8F0";

  const borderColor = border;

  const text = dark ? "#E2E8F0" : "#0F172A";

  const muted = dark ? "#94A3B8" : "#64748B";

  const inputBg = dark ? "#0F172A" : "#F8FAFC";

  const token = localStorage.getItem("clmp-token");

  const headers = { Authorization: `Bearer ${token}` };

  // Dashboard Statistics

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (t) => t.status?.toLowerCase() === "completed",
  ).length;

  const inProgressTasks = tasks.filter(
    (t) => t.status?.toLowerCase() === "in progress",
  ).length;

  const notStartedTasks = tasks.filter(
    (t) => t.status?.toLowerCase() === "not started",
  ).length;

  const blockedTasks = tasks.filter(
    (t) => t.status?.toLowerCase() === "blocked",
  ).length;

  const delayedTasks = tasks.filter(
    (t) => t.status?.toLowerCase() === "delayed",
  ).length;

  const overallProgress =
    totalTasks > 0
      ? Math.round(
          tasks.reduce(
            (sum, task) => sum + Number(task.progress || 0),

            0,
          ) / totalTasks,
        )
      : 0;

  const completedPercent =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const inProgressPercent =
    totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0;

  const notStartedPercent =
    totalTasks > 0 ? (notStartedTasks / totalTasks) * 100 : 0;

  const blockedPercent = totalTasks > 0 ? (blockedTasks / totalTasks) * 100 : 0;

  const delayedPercent = totalTasks > 0 ? (delayedTasks / totalTasks) * 100 : 0;

  const load = async () => {
    const response = await fetch(`/api/projects/${clientId}`, { headers });

    const body = await response.json();

    if (!response.ok)
      throw new Error(body.message || "Unable to load project.");

    setProject(body.project);

    setTasks(body.tasks || []);

    setDocuments(body.documents || []);

    setUpdates(body.updates || []);

    setRisks(body.risks || []);

    setTask((current) =>
      current.assignedTo
        ? current
        : {
            ...current,
            assignedTo:
              body.project.project_manager ||
              body.project.account_manager ||
              "",
          },
    );
  };

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error.message);
      showCloudOrbixAlert(error.message, "error");
    });
  }, [clientId]);

  const saveTask = async () => {
    setMessage("");

    const path = editingTaskId
      ? `/api/projects/${clientId}/tasks/${editingTaskId}`
      : `/api/projects/${clientId}/tasks`;

    const response = await fetch(path, {
      method: editingTaskId ? "PUT" : "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });

    const body = await response.json();

    if (!response.ok) {
      const errorMessage = body.message || "Unable to save task.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
      return;
    }

    setEditingTaskId(null);

    setTask({
      ...emptyTask,
      assignedTo: project?.project_manager || project?.account_manager || "",
    });

    await load();
  };

  const editTask = (item: Task) => {
    setEditingTaskId(item.id);
    setTask(toDraft(item));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setTask({
      ...emptyTask,
      assignedTo: project?.project_manager || project?.account_manager || "",
    });
  };

  const deleteTask = async (taskId: number) => {
    const response = await fetch(`/api/projects/${clientId}/tasks/${taskId}`, {
      method: "DELETE",
      headers,
    });

    const body = await response.json();

    if (!response.ok)
      return (
        setMessage(body.message || "Unable to delete task."),
        showCloudOrbixAlert(body.message || "Unable to delete task.", "error")
      );

    await load();
  };

  const requestTaskDeletion = (taskId: number) => {
    setConfirmDialog({
      message: "This task is about to be deleted. Do you want to continue?",
      onConfirm: () => {
        setConfirmDialog(null);
        void deleteTask(taskId);
      },
    });
  };

  const addUpdate = async () => {
    if (!updateText.trim()) return;

    const response = await fetch(`/api/projects/${clientId}/updates`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ updateText }),
    });

    const body = await response.json();

    if (!response.ok) {
      const errorMessage = body.message || "Unable to add update.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
      return;
    }

    setUpdates((current) => [body.update, ...current]);

    setUpdateText("");
  };

  const downloadUpdates = () => {
    if (!project) return;

    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[character] || character,
      );

    const updateRows = updates
      .map(
        (update) => `
          <article>
            <p>${escapeHtml(update.update_text)}</p>
            <p><small>${escapeHtml(update.updated_by)} &middot; ${escapeHtml(new Date(update.created_at).toLocaleString())}</small></p>
          </article>`,
      )
      .join("");

    const csvEscape = (value: unknown) => JSON.stringify(String(value ?? ""));
    const rows = [
      ["Project", project.client_id, project.client_name, project.current_status, project.completion],
      ...tasks.map((task) => ["Task", task.id, task.task_title, task.status, task.progress, task.expected_end_date, task.actual_end_date]),
      ...risks.map((risk) => ["Risk", risk.id, risk.risk_title, risk.status, risk.level, risk.impact, risk.owner]),
      ...updates.map((update) => ["Update", update.id, update.update_text, update.updated_by, update.created_at]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`Type,ID,Name or Description,Status,Value,Date,Actual Date\n${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${project.client_id}-project-details.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addRisk = async () => {
    if (!risk.description.trim())
      return (
        setMessage("Risk description is required."),
        showCloudOrbixAlert("Risk description is required.", "warning")
      );

    const response = await fetch(`/api/projects/${clientId}/risks`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(risk),
    });

    const body = await response.json();

    if (!response.ok) {
      const errorMessage = body.message || "Unable to add risk.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
      return;
    }

    setRisks((current) => [body.risk, ...current]);

    setRisk(emptyRisk);
  };

  const updateRisk = async (
    riskId: number,
    fieldName: string,
    value: string,
  ) => {
    const response = await fetch(`/api/projects/${clientId}/risks/${riskId}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldName]: value }),
    });

    const body = await response.json();

    if (!response.ok)
      return (
        setMessage(body.message || "Unable to update risk."),
        showCloudOrbixAlert(body.message || "Unable to update risk.", "error")
      );

    setRisks((current) =>
      current.map((item) => (item.id === riskId ? body.risk : item)),
    );
  };

  const importTasks = async (file: File) => {
    const form = new FormData();

    form.append("file", file);

    const response = await fetch(`/api/projects/${clientId}/tasks/import`, {
      method: "POST",
      headers,
      body: form,
    });

    const body = await response.json();

    if (!response.ok)
      return setMessage(body.message || "Unable to import tasks.");

    setMessage(`${body.imported} tasks imported successfully.`);
    showCloudOrbixAlert(
      `${body.imported} tasks imported successfully.`,
      "success",
    );

    await load();
  };

  const mandatoryDocumentTypes = MANDATORY_DOCUMENTS.map(
    (document) => document.id,
  );

  const uploadedMandatoryDocuments = mandatoryDocumentTypes.filter(
    (documentType) =>
      documents.some((document) => document.document_type === documentType),
  ).length;

  const documentProgress = Math.round(
    (uploadedMandatoryDocuments / mandatoryDocumentTypes.length) * 100,
  );

  const openRisks = risks.filter((item) => item.status === "Open").length;

  const riskColor = (value: string) =>
    value === "High" ? "#DC2626" : value === "Medium" ? "#D97706" : "#CA8A04";

  const riskField = (label: string, key: keyof RiskDraft, type = "text") => (
    <label className="space-y-1">
      <span
        className="block text-[10px] font-semibold"
        style={{ color: muted }}
      >
        {label}
      </span>
      <input
        type={type}
        value={
          label === "Customer Name"
            ? project?.client_name || ""
            : label === "Raised By"
              ? `${user.firstName} ${user.lastName}`.trim() || user.email
              : label === "PM"
                ? project?.project_manager ||
                  project?.account_manager ||
                  "Unassigned"
                : risk[key]
        }
        readOnly={
          label === "Customer Name" || label === "Raised By" || label === "PM"
        }
        onChange={(event) =>
          setRisk((current) => ({ ...current, [key]: event.target.value }))
        }
        className="w-full rounded-lg border px-3 py-2 text-xs"
        style={{ background: inputBg, borderColor: border, color: text }}
      />
    </label>
  );

  const field = (label: string, key: keyof TaskDraft, type = "text") => (
    <label className="space-y-1">
      <span
        className="block text-[10px] font-semibold"
        style={{ color: muted }}
      >
        {label}
      </span>
      <input
        type={type}
        value={task[key]}
        onChange={(event) =>
          setTask((current) => ({ ...current, [key]: event.target.value }))
        }
        className="w-full rounded-lg border px-3 py-2 text-xs"
        style={{ background: inputBg, borderColor: border, color: text }}
      />
    </label>
  );

  if (!project)
    return (
      <div className="p-6 text-sm" style={{ color: muted }}>
        {message || "Loading project..."}
      </div>
    );

  return (
    <div
      className="project-page p-6 space-y-5 flex flex-col"
      style={{ color: text }}
    >
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl"
            style={{ borderColor: "#BFDBFE" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
          >
            <div className="h-1.5" style={{ background: "#1E40AF" }} />
            <div className="p-6">
              <div
                className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "#1E40AF" }}
              >
                CloudOrbix Alert
              </div>
              <h2
                id="delete-task-title"
                className="text-base font-bold"
                style={{ color: "#0F172A" }}
              >
                Please confirm
              </h2>
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: "#475569" }}
              >
                {confirmDialog.message}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setConfirmDialog(null);
                    showCloudOrbixAlert("Task deletion cancelled.", "info");
                  }}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold"
                  style={{ borderColor: "#CBD5E1", color: "#475569" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                  style={{ background: "#1E40AF" }}
                >
                  Delete task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold"
        style={{ color: "#1E40AF" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">{project.client_name}</h1>
          <p className="text-xs mt-1" style={{ color: muted }}>
            {project.client_id} · PM:{" "}
            {project.project_manager || project.account_manager || "Unassigned"}{" "}
            · {project.hyperscaler || "No hyperscaler"}
          </p>
        </div>
        <div className="flex justify-end items-center w-[180px]">
          {(() => {
            const progress = overallProgress;
            const radius = 42;

            const circumference = 2 * Math.PI * radius;

            const offset = circumference * (1 - progress / 100);

            const alerts: string[] = [];

            tasks.forEach((task) => {
              const today = new Date();

              const startDate = task.expected_start_date
                ? new Date(task.expected_start_date)
                : null;

              const endDate = task.expected_end_date
                ? new Date(task.expected_end_date)
                : null;

              const status = task.status?.toLowerCase();

              // Start delayed

              if (startDate && today > startDate && status === "not started") {
                const daysLate = Math.floor(
                  (today.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                );

                alerts.push(
                  `⚠️ ${task.task_title}: Start delayed by ${daysLate} day${
                    daysLate > 1 ? "s" : ""
                  }`,
                );
              }

              // End delayed

              if (
                endDate &&
                today > endDate &&
                status !== "completed" &&
                status !== "closed"
              ) {
                const daysLate = Math.floor(
                  (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
                );

                alerts.push(
                  `🔴 ${task.task_title}: End delayed by ${daysLate} day${
                    daysLate > 1 ? "s" : ""
                  }`,
                );
              }

              // Blocked task

              if (status === "blocked") {
                alerts.push(`⛔ ${task.task_title}: is currently blocked`);
              }
            });

            return (
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                  {/* Background */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="10"
                  />

                  {/* Progress */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#1E40AF"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: "#1E40AF" }}
                  >
                    {progress}%
                  </div>

                  <div className="text-[11px]" style={{ color: muted }}>
                    Progress
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      {message && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {message}
        </div>
      )}
      <div
        className={
          showRiskForm ? "risk-form-primary rounded-xl border p-5" : "hidden"
        }
        style={{ background: bg, borderColor: border }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm">Add risk</h2>
            <p className="text-xs mt-1" style={{ color: muted }}>
              Capture the full risk register record.
            </p>
          </div>
          <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
            Risk ID: Generated on save
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {riskField("Customer Name", "customerName")}{" "}
          {riskField("Initiative Name", "initiativeName")}{" "}
          {riskField("Raised By", "raisedBy")}{" "}
          {riskField("Risk category", "riskCategory")}{" "}
          {riskField("Date Raised", "dateRaised", "date")}{" "}
          {riskField("Risk Owner", "owner")}{" "}
          {riskField("Risk Description", "description")}{" "}
          {riskField("Impact Description", "impactDescription")}{" "}
          {riskField("Mitigation plan", "mitigation")}{" "}
          {riskField("Comments/Actions", "commentsActions")}
          <label className="space-y-1">
            <span
              className="block text-[10px] font-semibold"
              style={{ color: muted }}
            >
              Probability of converting into Issue
            </span>
            <select
              value={risk.probability}
              onChange={(event) =>
                setRisk((current) => ({
                  ...current,
                  probability: event.target.value,
                }))
              }
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={{
                background: inputBg,
                borderColor: riskColor(risk.probability),
                color: riskColor(risk.probability),
              }}
            >
              {riskLevels.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {(["level", "impact", "status"] as const).map((key) => (
            <label key={key} className="space-y-1">
              <span
                className="block text-[10px] font-semibold capitalize"
                style={{ color: muted }}
              >
                {key}
              </span>
              <select
                value={risk[key]}
                onChange={(event) =>
                  setRisk((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className="w-full rounded-lg border px-3 py-2 text-xs"
                style={{
                  background: inputBg,
                  borderColor: key === "status" ? border : riskColor(risk[key]),
                  color: key === "status" ? text : riskColor(risk[key]),
                }}
              >
                {(key === "status" ? riskStatuses : riskLevels).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
          <div className="flex items-end">
            <button
              onClick={() => void addRisk()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "#1E40AF" }}
            >
              <Plus className="w-3.5 h-3.5" /> Save risk
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-xl border p-5"
          style={{ background: bg, borderColor: border }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm">Daily updates</h2>
              <p className="text-xs mt-1" style={{ color: muted }}>
                Latest project activity and handover trail
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold"
                style={{ color: "#1E40AF" }}
              >
                {updates.length} updates
              </span>
              <button
                onClick={downloadUpdates}
                className="p-1.5 rounded-lg border"
                style={{ borderColor: border, color: muted }}
                title="Export project details"
                aria-label="Export project details"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              value={updateText}
              onChange={(event) => setUpdateText(event.target.value)}
              rows={2}
              placeholder="Add today's project update..."
              className="flex-1 rounded-lg border px-3 py-2 text-xs resize-none"
              style={{ background: inputBg, borderColor: border, color: text }}
            />
            <button
              onClick={() => void addUpdate()}
              className="self-end px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "#1E40AF" }}
            >
              Add update
            </button>
          </div>
          <div className="mt-4 space-y-3 max-h-40 overflow-y-auto pr-1">
            {updates.length ? (
              updates.map((update) => (
                <div
                  key={update.id}
                  className="border-l-2 pl-3"
                  style={{ borderColor: "#3B82F6" }}
                >
                  <p className="text-xs">{update.update_text}</p>
                  <p className="text-[10px] mt-1" style={{ color: muted }}>
                    {update.updated_by} ·{" "}
                    {new Date(update.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs" style={{ color: muted }}>
                No daily updates recorded yet.
              </p>
            )}
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ background: bg, borderColor: border }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Open risks</h2>
              <p className="text-xs mt-1" style={{ color: muted }}>
                Current risk tracker
              </p>
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: openRisks ? "#DC2626" : "#16A34A" }}
            >
              {openRisks}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5">
            {riskLevels.map((level) => (
              <div
                key={level}
                className="rounded-lg p-3 text-center"
                style={{ background: `${riskColor(level)}18` }}
              >
                <div
                  className="text-lg font-bold"
                  style={{ color: riskColor(level) }}
                >
                  {
                    risks.filter(
                      (item) => item.status === "Open" && item.level === level,
                    ).length
                  }
                </div>
                <div className="text-[10px]" style={{ color: muted }}>
                  {level}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="rounded-xl border p-5"
        style={{ background: bg, borderColor: border }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div
              className="text-xs uppercase font-semibold mb-3"
              style={{ color: muted }}
            >
              Project Summary
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span style={{ color: muted }}>Project Manager:</span>{" "}
                <strong>
                  {project.project_manager || project.account_manager || "-"}
                </strong>
              </div>

              <div>
                <span style={{ color: muted }}>Current Status:</span>{" "}
                <span
                  className="px-2 py-1 rounded-full text-white text-xs font-semibold"
                  style={{ background: "#1E40AF" }}
                >
                  {project.current_status}
                </span>
              </div>

              <div>
                <span style={{ color: muted }}>Hyperscaler:</span>{" "}
                {project.hyperscaler || "-"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Total Tasks</span>
              <strong>{totalTasks}</strong>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Completed</span>
                <span>{completedTasks}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${completedPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>In Progress</span>
                <span>{inProgressTasks}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${inProgressPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Not Started</span>
                <span>{notStartedTasks}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full">
                <div
                  className="h-2 rounded-full bg-slate-500"
                  style={{ width: `${notStartedPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* <div className="flex flex-col items-center justify-center">
      <div
        className="text-5xl font-bold"
        style={{ color: "#1E40AF" }}
      >
        {overallProgress}%
      </div>

      <div
        className="text-xs mt-2"
        style={{ color: muted }}
      >
        Overall Progress
      </div>
    </div> */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: "#FEF2F2",

              borderColor: "#FECACA",
            }}
          >
            <div
              className="px-4 py-2 text-xs font-semibold"
              style={{
                background: "#DC2626",

                color: "white",
              }}
            >
              CloudOrbix Alert
            </div>

            <div className="alert-container">
              <div className="alert-list">
                {alerts.length ? (
                  alerts.map((alert, index) => (
                    <div key={index} className="alert-item">
                      {alert}
                    </div>
                  ))
                ) : (
                  <div className="alert-item">✅ No project risks detected</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-xl border p-5"
          style={{ background: bg, borderColor: border }}
        >
          <h2 className="font-semibold text-sm mb-3">Project lifecycle</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span style={{ color: muted }}>Status</span>
              <div className="font-semibold mt-1">{project.current_status}</div>
            </div>
            <div>
              <span style={{ color: muted }}>Project type</span>
              <div className="font-semibold mt-1">
                {project.project_type || "-"}
              </div>
            </div>
            <div className="col-span-2">
              <span style={{ color: muted }}>Brief</span>
              <div className="mt-1">{project.project_brief || "-"}</div>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ background: bg, borderColor: border }}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-sm">Project documents</h2>
            <span
              className="text-xs font-semibold"
              style={{
                color: documentProgress === 100 ? "#16A34A" : "#1E40AF",
              }}
            >
              {uploadedMandatoryDocuments}/{mandatoryDocumentTypes.length}
            </span>
          </div>
          <div
            className="h-2 rounded-full mb-3"
            style={{ background: dark ? "#334155" : "#E2E8F0" }}
          >
            <div
              className="h-2 rounded-full"
              style={{
                width: `${documentProgress}%`,
                background: documentProgress === 100 ? "#16A34A" : "#1E40AF",
              }}
            />
          </div>
          <button
            onClick={onOpenDocuments}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: "#1E40AF" }}
          >
            View project documents
          </button>
        </div>
      </div>
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: bg, borderColor: border }}
      >
        <div
          className="px-5 py-4 border-b flex justify-between"
          style={{ borderColor: border }}
        >
          <div>
            <h2 className="font-semibold text-sm">Task manager</h2>
            <span className="text-xs" style={{ color: muted }}>
              {tasks.length} tasks
            </span>
          </div>
          <button
            onClick={() => setShowTaskForm((current) => !current)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: "#1E40AF" }}
          >
            {showTaskForm ? "Close task form" : "Add task"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: border }}>
                <th className="p-3 text-left">Task</th>
                <th className="p-3 text-left">Assigned to</th>
                <th className="p-3 text-left">Expected dates</th>
                <th className="p-3 text-left">Actual dates</th>
                <th className="p-3 text-left">Progress</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Remark</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, showAllTasks ? tasks.length : 3).map((item) => (
                <tr
                  key={item.id}
                  className="border-b"
                  style={{ borderColor: border }}
                >
                  <td className="p-3 font-semibold">{item.task_title}</td>
                  <td className="p-3">
                    {item.assigned_to ||
                      project.project_manager ||
                      project.account_manager ||
                      "-"}
                  </td>
                  <td className="p-3">
                    {item.expected_start_date || "-"} to{" "}
                    {item.expected_end_date || "-"}
                  </td>
                  <td className="p-3">
                    {item.actual_start_date || "-"} to{" "}
                    {item.actual_end_date || "-"}
                  </td>
                  <td className="p-3">{item.progress}%</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3">{item.remark || "-"}</td>
                  <td className="p-3 flex gap-1">
                    <button
                      onClick={() => editTask(item)}
                      className="p-1.5 rounded-md hover:bg-blue-50"
                      style={{ color: "#1E40AF" }}
                      title="Edit task"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => requestTaskDeletion(item.id)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                      title="Delete task"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className={
            showTaskForm
              ? "grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 border-t"
              : "hidden"
          }
          style={{ borderColor: border }}
        >
          {field("Task title", "taskTitle")}
          {field("Assigned to", "assignedTo")}
          {field("Expected start", "expectedStartDate", "date")}
          {field("Expected end", "expectedEndDate", "date")}
          {field("Actual start", "actualStartDate", "date")}
          {field("Actual end", "actualEndDate", "date")}
          {field("Progress %", "progress", "number")}
          <label className="space-y-1">
            <span
              className="block text-[10px] font-semibold"
              style={{ color: muted }}
            >
              Status
            </span>
            <select
              value={task.status}
              onChange={(event) =>
                setTask((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={{ background: inputBg, borderColor: border, color: text }}
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {field("Remark", "remark")}
          <div className="flex items-end gap-2">
            <button
              onClick={() => void saveTask()}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "#1E40AF" }}
            >
              {editingTaskId ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {editingTaskId ? "Update task" : "Add task"}
            </button>
            {editingTaskId && (
              <button
                onClick={cancelEdit}
                className="p-2 rounded-lg border"
                style={{ borderColor: border, color: muted }}
                title="Cancel edit"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="task-list-toggle">
        {tasks.length > 3 && (
          <button
            onClick={() => setShowAllTasks((current) => !current)}
            className="px-5 py-3 text-xs font-semibold"
            style={{ color: "#1E40AF" }}
          >
            {showAllTasks
              ? "Show fewer tasks"
              : `View all ${tasks.length} tasks`}
          </button>
        )}
      </div>
      <div
        className="rounded-xl border p-4 flex items-center justify-between"
        style={{ background: bg, borderColor: border }}
      >
        <div>
          <h2 className="font-semibold text-sm">Task manager import</h2>
          <p className="text-xs mt-1" style={{ color: muted }}>
            Import tasks from an Excel workbook.
          </p>
        </div>
        <label
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
          style={{ background: "#1E40AF" }}
        >
          <Upload className="w-3.5 h-3.5" /> Import tasks
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importTasks(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <div
        className="risk-details rounded-xl border overflow-hidden"
        style={{ background: bg, borderColor: border }}
      >
        <div
          className="sticky top-0 z-10 px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: border, background: bg }}
        >
          <h2 className="font-semibold text-sm">Risk details</h2>
          <button
            onClick={() => setShowRiskForm((current) => !current)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: "#1E40AF" }}
          >
            {showRiskForm ? "Close risk form" : "Add risk"}
          </button>
        </div>
        {risks.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-[10px] border-collapse">
            <thead>
              <tr style={{ background: "#E6370F", color: "#FFFFFF" }}>
                {[
                  "Risk ID",
                  "Customer Name",
                  "Initiative Name",
                  "Status",
                  "Risk category",
                  "PM",
                  "Date Raised",
                  "Raised By",
                  "Risk Description",
                  "Probability of converting into Issue",
                  "Impact",
                  "Impact Description",
                  "Mitigation plan",
                  "Risk Owner",
                  "Comments/Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="p-2 text-left border"
                    style={{ borderColor: "#111827" }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.slice(0, showAllRisks ? risks.length : 3).map((item) => (
                <tr
                  key={item.id}
                  className="border-b align-top"
                  style={{
                    borderColor: border,
                    background: dark ? "#334155" : "#E5E7EB",
                  }}
                >
                  <td className="p-2 border" style={{ borderColor: border }}>
                    R{item.id}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.customer_name || project.client_name}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.initiative_name || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    <select
                      value={item.status}
                      onChange={(event) =>
                        void updateRisk(item.id, "status", event.target.value)
                      }
                      className="bg-transparent"
                      style={{ color: text }}
                    >
                      {riskStatuses.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.risk_category || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {project.project_manager || project.account_manager || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.date_raised || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.raised_by || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.risk_title || item.description}
                  </td>
                  <td
                    className="p-2 border"
                    style={{
                      borderColor: border,
                      color: riskColor(item.probability),
                    }}
                  >
                    {item.probability || "-"}
                  </td>
                  <td
                    className="p-2 border"
                    style={{
                      borderColor: border,
                      color: riskColor(item.impact),
                    }}
                  >
                    {item.impact || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.impact_description || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.mitigation || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.owner || "-"}
                  </td>
                  <td className="p-2 border" style={{ borderColor: border }}>
                    {item.comments_actions || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-xs" style={{ color: muted }}>
            No risks recorded yet.
          </p>
        )}
        {risks.length > 3 && (
          <button
            onClick={() => setShowAllRisks((current) => !current)}
            className="px-5 py-3 text-xs font-semibold"
            style={{ color: "#1E40AF" }}
          >
            {showAllRisks
              ? "Show fewer risks"
              : `View all ${risks.length} risks`}
          </button>
        )}
      </div>
      <div
        className="risk-register rounded-xl border p-5"
        style={{ background: bg, borderColor: border }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm">Risk register</h2>
            <p className="text-xs mt-1" style={{ color: muted }}>
              Track, assign, and resolve project risks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
              style={{ background: "#1E40AF" }}
            >
              <Upload className="w-3.5 h-3.5" /> Import tasks
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importTasks(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <span
              className="text-xs font-semibold"
              style={{ color: openRisks ? "#DC2626" : "#16A34A" }}
            >
              {openRisks} open
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["Risk title", "Description", "Owner", "Mitigation"] as const).map(
            (label) => {
              const key = (
                {
                  "Risk title": "riskTitle",
                  Description: "description",
                  Owner: "owner",
                  Mitigation: "mitigation",
                } as const
              )[label];
              return (
                <label key={label} className="space-y-1">
                  <span
                    className="block text-[10px] font-semibold"
                    style={{ color: muted }}
                  >
                    {label}
                  </span>
                  <input
                    value={risk[key]}
                    onChange={(event) =>
                      setRisk((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-xs"
                    style={{
                      background: inputBg,
                      borderColor: border,
                      color: text,
                    }}
                  />
                </label>
              );
            },
          )}
          {(["level", "impact", "status"] as const).map((key) => (
            <label key={key} className="space-y-1">
              <span
                className="block text-[10px] font-semibold capitalize"
                style={{ color: muted }}
              >
                {key}
              </span>
              <select
                value={risk[key]}
                onChange={(event) =>
                  setRisk((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className="w-full rounded-lg border px-3 py-2 text-xs"
                style={{
                  background: inputBg,
                  borderColor: border,
                  color: key === "status" ? text : riskColor(risk[key]),
                }}
              >
                {(key === "status" ? riskStatuses : riskLevels).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
          <div className="flex items-end">
            <button
              onClick={() => void addRisk()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "#1E40AF" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add risk
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {risks.length ? (
            risks.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3 items-center border-t pt-3"
                style={{ borderColor: border }}
              >
                <div>
                  <div className="text-xs font-semibold">{item.risk_title}</div>
                  <div className="text-[10px] mt-1" style={{ color: muted }}>
                    {item.owner || "Unassigned"}{" "}
                    {item.description ? `· ${item.description}` : ""}
                  </div>
                </div>
                <select
                  value={item.level}
                  onChange={(event) =>
                    void updateRisk(item.id, "level", event.target.value)
                  }
                  className="rounded border px-2 py-1 text-[10px]"
                  style={{
                    borderColor: riskColor(item.level),
                    color: riskColor(item.level),
                    background: bg,
                  }}
                >
                  {riskLevels.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <select
                  value={item.impact}
                  onChange={(event) =>
                    void updateRisk(item.id, "impact", event.target.value)
                  }
                  className="rounded border px-2 py-1 text-[10px]"
                  style={{
                    borderColor: riskColor(item.impact),
                    color: riskColor(item.impact),
                    background: bg,
                  }}
                >
                  {riskLevels.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <select
                  value={item.status}
                  onChange={(event) =>
                    void updateRisk(item.id, "status", event.target.value)
                  }
                  className="rounded border px-2 py-1 text-[10px]"
                  style={{ borderColor, color: text, background: bg }}
                >
                  {riskStatuses.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            <p className="text-xs" style={{ color: muted }}>
              No risks recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

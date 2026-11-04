import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Send,
  Target,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { MANDATORY_DOCUMENTS } from "../data/projectDocuments";
import { showCloudOrbixAlert } from "../alert";
import {
  normalizeProjectStatus,
  PROJECT_STATUSES,
} from "../../shared/project-status.js";
import { calculateRevenueRecovery } from "../../shared/revenue-recovery.js";
import { normalizeHyperscaler } from "../../shared/hyperscalers.js";
import { convertCurrencyAmount } from "../../shared/currency-conversion.js";

type ProjectPageProps = {
  dark: boolean;
  clientId: string;
  onBack: () => void;
  onOpenDocuments: () => void;
  onEditProject: () => void;
  user: { firstName: string; lastName: string; email: string; roles: string[] };
};

type Project = {
  client_id: string;
  client_name: string;
  account_manager: string;
  project_manager: string;
  region?: string | null;
  industry?: string | null;
  project_progress?: number;
  project_brief: string;
  current_status: string;
  completion: number;
  hyperscaler: string;
  project_type: string;
  service_category?: string | null;
  project_billing_code?: string | null;
  year?: number | null;
  revenue?: number | string | null;
  revenue_recovery_percentage?: number | string | null;
  currency_code?: string | null;
  project_overview?: string | null;
  in_scope?: string | null;
  out_of_scope?: string | null;
  assumption?: string | null;
  isow?: string | null;
  estimated_start_date?: string | null;
  estimated_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  remarks?: string | null;
  services?: string[];
  resources?: {
    resourceName: string;
    fte: number | null;
    roleForProject?: string;
    infrastructureAccess?: boolean;
  }[];
  voumetric?: number | null;
  rfp_project_id?: number | null;
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

type ProjectManagerOption = {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
};

type TemporaryAccessEntry = {
  id: number;
  clientId: string;
  clientName: string;
  managerId: number;
  managerName: string;
  managerEmail: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  status: "pending" | "approved";
  createdAt: string;
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

type ProjectDocument = {
  id: number;
  file_name: string;
  blob_url: string;
  document_type?: string;
  created_at?: string;
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

type Tab = "Overview" | "Tasks" | "Risks" | "Documents" | "RFP";

const emptyTask: TaskDraft = {
  taskTitle: "",
  assignedTo: "",
  expectedStartDate: "",
  expectedEndDate: "",
  actualStartDate: "",
  actualEndDate: "",
  progress: "0",
  status: "On Track",
  remark: "",
};

const emptyRisk = (project?: Project | null, user?: ProjectPageProps["user"]): RiskDraft => ({
  customerName: project?.client_name || "",
  initiativeName: project?.client_name || "",
  pm: project?.project_manager || project?.account_manager || "",
  riskTitle: "",
  riskCategory: "",
  dateRaised: new Date().toISOString().slice(0, 10),
  raisedBy: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "",
  description: "",
  probability: "Medium",
  owner: "",
  level: "Medium",
  impact: "Medium",
  impactDescription: "",
  status: "On Track",
  mitigation: "",
  commentsActions: "",
});

const dateLabel = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};

const initialsFor = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";

const taskDraftFromTask = (task: Task): TaskDraft => ({
  taskTitle: task.task_title || "",
  assignedTo: task.assigned_to || "",
  expectedStartDate: task.expected_start_date?.slice(0, 10) || "",
  expectedEndDate: task.expected_end_date?.slice(0, 10) || "",
  actualStartDate: task.actual_start_date?.slice(0, 10) || "",
  actualEndDate: task.actual_end_date?.slice(0, 10) || "",
  progress: String(task.progress || 0),
  status: normalizeProjectStatus(task.status),
  remark: task.remark || "",
});

export default function ProjectPage({
  dark,
  clientId,
  onBack,
  onOpenDocuments,
  onEditProject,
  user,
}: ProjectPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessRequestSent, setAccessRequestSent] = useState(false);
  const [sendingAccessRequest, setSendingAccessRequest] = useState(false);
  const [currencyRateToInr, setCurrencyRateToInr] = useState<number | null>(null);
  const [currencyRateError, setCurrencyRateError] = useState("");
  const [temporaryAccess, setTemporaryAccess] = useState<TemporaryAccessEntry[]>([]);
  const [projectManagers, setProjectManagers] = useState<ProjectManagerOption[]>([]);
  const [showTemporaryAccessForm, setShowTemporaryAccessForm] = useState(false);
  const [selectedTemporaryManager, setSelectedTemporaryManager] = useState("");
  const [temporaryAccessReason, setTemporaryAccessReason] = useState("");
  const [savingTemporaryAccess, setSavingTemporaryAccess] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [task, setTask] = useState<TaskDraft>(emptyTask);
  const [risk, setRisk] = useState<RiskDraft>(emptyRisk());
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);
  const [downloadingRisks, setDownloadingRisks] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const soft = dark ? "#0F172A" : "#F8FAFC";
  const accent = "#1E40AF";
  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("clmp-token") || ""}`,
  });
  const jsonHeaders = () => ({
    ...headers(),
    "Content-Type": "application/json",
  });

  const load = async (signal?: AbortSignal) => {
    const response = await fetch(`/api/projects/${clientId}`, {
      headers: headers(),
      signal,
    });
    const body = await response.json();
    if (response.status === 403) {
      setAccessDenied(true);
      setMessage(body.message || "Project access denied.");
      return;
    }
    if (!response.ok) throw new Error(body.message || "Unable to load project.");

    setAccessDenied(false);
    setProject(body.project);
    setTasks(body.tasks || []);
    setDocuments(body.documents || []);
    setUpdates(body.updates || []);
    setRisks(body.risks || []);

    const currencyCode = body.project.currency_code?.trim().toUpperCase() || "INR";
    setCurrencyRateError("");
    if (currencyCode === "INR") {
      setCurrencyRateToInr(1);
    } else {
      setCurrencyRateToInr(null);
      try {
        const rateResponse = await fetch(
          `/api/rfp/rates/currency/${Number(body.project.year) || new Date().getFullYear()}`,
          { headers: headers(), signal },
        );
        const rateBody = await rateResponse.json();
        if (!rateResponse.ok) {
          throw new Error(rateBody.message || "Unable to load currency rates for INR display.");
        }
        const rate = (rateBody.rates || []).find(
          (item: { currency: string }) => item.currency === currencyCode,
        )?.rateToInr;
        if (Number.isFinite(Number(rate)) && Number(rate) > 0) {
          setCurrencyRateToInr(Number(rate));
        } else {
          setCurrencyRateError(`No ${currencyCode}/INR rate is configured for ${body.project.year}.`);
        }
      } catch (error) {
        if (signal?.aborted) return;
        setCurrencyRateError(
          error instanceof Error ? error.message : "Unable to load currency rates for INR display.",
        );
      }
    }

    const temporaryAccessResponse = await fetch(
      `/api/projects/${clientId}/temporary-access`,
      { headers: headers(), signal },
    );
    const temporaryAccessBody = await temporaryAccessResponse.json();
    if (!temporaryAccessResponse.ok) {
      throw new Error(temporaryAccessBody.message || "Unable to load temporary project access.");
    }
    const accessEntries: TemporaryAccessEntry[] = temporaryAccessBody.access || [];
    setTemporaryAccess(accessEntries);

    const currentName = `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase();
    const assignedIdentities = [body.project.project_manager, body.project.account_manager]
      .filter(Boolean)
      .flatMap((value: string) => value.split(/[,;/|]+/))
      .map((value: string) => value.trim().toLowerCase());
    const isAssignedManager = assignedIdentities.some(
      (identity: string) => identity === currentName || identity === user.email.toLowerCase(),
    );
    if (user.roles.includes("Admin") || (user.roles.includes("Manager") && isAssignedManager)) {
      const usersResponse = await fetch("/api/users", { headers: headers(), signal });
      const usersBody = await usersResponse.json();
      if (!usersResponse.ok) {
        throw new Error(usersBody.message || "Unable to load project managers.");
      }
      setProjectManagers(
        (usersBody.users || [])
          .filter((candidate: ProjectManagerOption) =>
            candidate.isActive &&
            candidate.roles.includes("Manager") &&
            candidate.email.toLowerCase() !== user.email.toLowerCase(),
          )
          .sort((a: ProjectManagerOption, b: ProjectManagerOption) =>
            a.fullName.localeCompare(b.fullName),
          ),
      );
    } else {
      setProjectManagers([]);
    }
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setProject(null);
    setTasks([]);
    setDocuments([]);
    setUpdates([]);
    setRisks([]);
    setTemporaryAccess([]);
    setProjectManagers([]);
    setShowTemporaryAccessForm(false);
    setSelectedTemporaryManager("");
    setTemporaryAccessReason("");
    setActiveTab("Overview");
    setLoading(true);
    setMessage("");
    setAccessDenied(false);
    setAccessRequestSent(false);
    void load(controller.signal)
      .catch((error: unknown) => {
        if (!active) return;
        const errorMessage = error instanceof Error ? error.message : "Unable to load project.";
        setMessage(errorMessage);
        showCloudOrbixAlert(errorMessage, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [clientId]);

  const requestProjectAccess = async () => {
    setSendingAccessRequest(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/access-request`, {
        method: "POST",
        headers: headers(),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to request project access.");
      setAccessRequestSent(true);
      showCloudOrbixAlert("Your access request was sent to all administrators.", "success");
    } catch (error) {
      showCloudOrbixAlert(
        error instanceof Error ? error.message : "Unable to request project access.",
        "error",
      );
    } finally {
      setSendingAccessRequest(false);
    }
  };

  const submitTemporaryAccess = async () => {
    if (!selectedTemporaryManager || !temporaryAccessReason.trim()) {
      showCloudOrbixAlert("Select a manager and enter a reason.", "error");
      return;
    }
    setSavingTemporaryAccess(true);
    try {
      const response = await fetch(`/api/projects/${clientId}/temporary-access`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: Number(selectedTemporaryManager),
          reason: temporaryAccessReason.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to assign temporary manager access.");
      }
      setShowTemporaryAccessForm(false);
      setSelectedTemporaryManager("");
      setTemporaryAccessReason("");
      showCloudOrbixAlert(
        payload.status === "approved"
          ? "Temporary project access granted."
          : "Temporary access request sent to administrators for approval.",
        "success",
      );
      await load();
    } catch (error) {
      showCloudOrbixAlert(
        error instanceof Error ? error.message : "Unable to assign temporary manager access.",
        "error",
      );
    } finally {
      setSavingTemporaryAccess(false);
    }
  };

  const revokeTemporaryAccess = async (entry: TemporaryAccessEntry) => {
    try {
      const response = await fetch(
        `/api/projects/${clientId}/temporary-access/${entry.id}`,
        { method: "DELETE", headers: headers() },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to revoke temporary access.");
      }
      showCloudOrbixAlert("Temporary project access revoked.", "success");
      await load();
    } catch (error) {
      showCloudOrbixAlert(
        error instanceof Error ? error.message : "Unable to revoke temporary access.",
        "error",
      );
    }
  };

  const saveTask = async () => {
    if (!task.taskTitle.trim()) {
      showCloudOrbixAlert("Task title is required.", "warning");
      return;
    }
    setSavingTask(true);
    try {
      const path = editingTaskId
        ? `/api/projects/${clientId}/tasks/${editingTaskId}`
        : `/api/projects/${clientId}/tasks`;
      const response = await fetch(path, {
        method: editingTaskId ? "PUT" : "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(task),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to save task.");
      setEditingTaskId(null);
      setShowTaskForm(false);
      setTask(emptyTask);
      await load();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save task.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    } finally {
      setSavingTask(false);
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/projects/${clientId}/tasks/${taskId}`, {
        method: "DELETE",
        headers: headers(),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to delete task.");
      await load();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to delete task.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    }
  };

  const importTasks = async (file: File) => {
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/projects/${clientId}/tasks/import`, {
        method: "POST",
        headers: headers(),
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to import tasks.");
      setMessage(`${body.imported} tasks imported successfully.`);
      showCloudOrbixAlert(`${body.imported} tasks imported successfully.`, "success");
      await load();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to import tasks.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    }
  };

  const addUpdate = async () => {
    if (!updateText.trim()) return;
    try {
      const response = await fetch(`/api/projects/${clientId}/updates`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ updateText }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to add update.");
      setUpdates((current) => [body.update, ...current]);
      setUpdateText("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to add update.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    }
  };

  const deleteUpdate = async (updateId: number) => {
    try {
      const response = await fetch(`/api/projects/${clientId}/updates/${updateId}`, {
        method: "DELETE",
        headers: headers(),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to delete update.");
      setUpdates((current) => current.filter((update) => update.id !== updateId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to delete update.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    }
  };

  const downloadFile = async (url: string, fileName: string) => {
    const response = await fetch(url, { headers: headers() });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Unable to download file (HTTP ${response.status}).`);
    }
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = window.document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  };

  const downloadUpdates = async () => {
    try {
      await downloadFile(
        `/api/projects/${clientId}/export`,
        `${project?.client_id || clientId}-project-updates.xlsx`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to download project updates.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    }
  };

  const addRisk = async () => {
    if (!risk.description.trim()) {
      showCloudOrbixAlert("Risk description is required.", "warning");
      return;
    }
    setSavingRisk(true);
    try {
      const response = await fetch(`/api/projects/${clientId}/risks`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(risk),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to add risk.");
      setRisks((current) => [body.risk, ...current]);
      setRisk(emptyRisk(project, user));
      setShowRiskForm(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to add risk.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    } finally {
      setSavingRisk(false);
    }
  };

  const updateRisk = async (riskId: number, status: string) => {
    try {
      const response = await fetch(`/api/projects/${clientId}/risks/${riskId}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to update risk.");
      setRisks((current) => current.map((item) => item.id === riskId ? body.risk : item));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to update risk.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    }
  };

  const downloadProjectRisks = async () => {
    setDownloadingRisks(true);
    try {
      await downloadFile(
        `/api/projects/${clientId}/risks/export`,
        `${project?.client_id || clientId}-risks.xlsx`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to download project risks.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    } finally {
      setDownloadingRisks(false);
    }
  };

  const completedTasks = tasks.filter((item) => item.status?.toLowerCase() === "completed").length;
  const progress = tasks.length
    ? Math.round(tasks.reduce((total, item) => total + Number(item.progress || 0), 0) / tasks.length)
    : Math.round(Number(project?.completion || project?.project_progress || 0));
  const openRisks = risks.filter(
    (item) => !["completed", "cancelled", "canceled"].includes(item.status?.toLowerCase()),
  ).length;
  const uploadedMandatoryTypes = new Set(
    documents.map((document) => document.document_type).filter(Boolean),
  );
  const uploadedMandatoryDocuments = MANDATORY_DOCUMENTS.filter((item) =>
    uploadedMandatoryTypes.has(item.id),
  ).length;
  const documentProgress = Math.round(
    (uploadedMandatoryDocuments / MANDATORY_DOCUMENTS.length) * 100,
  );
  const attentionItems = useMemo(() => {
    const today = new Date();
    const items: { kind: "task" | "risk" | "document"; text: string; detail: string }[] = [];
    tasks.forEach((item) => {
      const status = item.status?.toLowerCase();
      if (status === "blocked") {
        items.push({ kind: "task", text: item.task_title, detail: "Task is blocked" });
      } else if (
        item.expected_end_date &&
        new Date(item.expected_end_date) < today &&
        status !== "completed"
      ) {
        items.push({ kind: "task", text: item.task_title, detail: "Task is past its expected end date" });
      }
    });
    risks
      .filter((item) => item.level === "High" && !["completed", "cancelled", "canceled"].includes(item.status?.toLowerCase()))
      .forEach((item) => items.push({
        kind: "risk",
        text: item.risk_title || item.description,
        detail: `${item.level} priority risk · ${item.status || "Open"}`,
      }));
    MANDATORY_DOCUMENTS.filter((item) => !uploadedMandatoryTypes.has(item.id))
      .slice(0, 3)
      .forEach((item) => items.push({
        kind: "document",
        text: item.name,
        detail: "Mandatory document not uploaded",
      }));
    return items.slice(0, 5);
  }, [tasks, risks, documents]);

  const riskColor = (value: string) =>
    value === "High" ? "#DC2626" : value === "Medium" ? "#D97706" : "#64748B";
  const statusColor = (value: string) => {
    const status = normalizeProjectStatus(value);
    if (status === "Completed" || status === "On Track") return "#16A34A";
    if (status.toLowerCase().includes("delay") || status === "Blocked") return "#DC2626";
    if (status === "At Risk" || status === "On Hold") return "#D97706";
    return accent;
  };
  const formatCurrency = (amount: number) => {
    if (currencyRateToInr === null) {
      return currencyRateError
        ? `Conversion unavailable (${currencyRateError})`
        : "Loading INR conversion…";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(convertCurrencyAmount(amount, currencyRateToInr, 1));
  };
  const sectionStyle = { background: bg, borderColor: border };
  const labelStyle = { color: muted };
  const inputStyle = { background: soft, borderColor: border, color: text };
  const inputClass = "w-full rounded-lg border px-3 py-2 text-xs outline-none";
  const tabs: Tab[] = ["Overview", "Tasks", "Risks", "Documents", "RFP"];

  if (!project && accessDenied) {
    return (
      <div className="p-6" style={{ color: text }}>
        <section className="max-w-2xl rounded-xl border p-6" style={sectionStyle}>
          <p className="text-sm" style={{ color: muted }}>
            {message === "Project access denied."
              ? "Project access denied. Only the assigned project manager or an administrator can access this project."
              : message || "Project access denied."}
          </p>
          {user.roles.includes("Manager") && (
            <button
              type="button"
              onClick={() => void requestProjectAccess()}
              disabled={sendingAccessRequest || accessRequestSent}
              className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: accent }}
            >
              {accessRequestSent ? "Access request sent" : sendingAccessRequest ? "Sending request…" : "Request access"}
            </button>
          )}
        </section>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-sm" style={{ color: muted }}>
        {message || (loading ? "Loading project…" : "Project could not be loaded.")}
      </div>
    );
  }

  const revenue = Number(project.revenue || 0);
  const recoveryPercentage = Number(project.revenue_recovery_percentage || 0);
  const recovery = calculateRevenueRecovery(revenue, recoveryPercentage);
  const manager = project.project_manager || project.account_manager || "Unassigned";
  const projectStatus = normalizeProjectStatus(project.current_status);
  const currentUserName = `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase();
  const primaryManagerIdentities = [project.project_manager, project.account_manager]
    .filter(Boolean)
    .flatMap((value) => value.split(/[,;/|]+/))
    .map((value) => value.trim().toLowerCase());
  const isPrimaryProjectManager = primaryManagerIdentities.some(
    (identity) => identity === currentUserName || identity === user.email.toLowerCase(),
  );
  const isAdmin = user.roles.includes("Admin");
  const canManageTemporaryAccess = isAdmin ||
    (user.roles.includes("Manager") && isPrimaryProjectManager);
  const availableTemporaryManagers = projectManagers.filter(
    (candidate) => !temporaryAccess.some((entry) => entry.managerId === candidate.id),
  );
  const taskField = (
    label: string,
    key: keyof TaskDraft,
    type = "text",
  ) => (
    <label key={key} className="space-y-1">
      <span className="block text-[10px] font-semibold" style={labelStyle}>{label}</span>
      <input
        type={type}
        value={task[key]}
        onChange={(event) => setTask((current) => ({ ...current, [key]: event.target.value }))}
        className={inputClass}
        style={{ ...inputStyle, colorScheme: type === "date" && dark ? "dark" : "light" }}
      />
    </label>
  );

  const requestDelete = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  const renderProjectDetails = (compact = false) => {
    const groups = [
      {
        title: "Project information",
        fields: [
          ["Project ID", project.client_id],
          ["Project name", project.client_name],
          ["Project type", project.project_type || "—"],
          ["Service category", project.service_category || "—"],
          ["Services", project.services?.join(", ") || "—"],
          ["Hyperscaler", normalizeHyperscaler(project.hyperscaler) || "—"],
          ["Billing code", project.project_billing_code || "—"],
          ["Year", project.year || "—"],
        ],
      },
      {
        title: "Ownership & commercial",
        fields: [
          ["Project manager", manager],
          ["Account manager", project.account_manager || "—"],
          ["Region", project.region || "—"],
          ["Industry", project.industry || "—"],
          ["Revenue", formatCurrency(revenue)],
          ["Revenue recovery", `${recoveryPercentage}%`],
          ["Recovered revenue", formatCurrency(recovery.recoveredRevenue)],
          ["Pending revenue", formatCurrency(recovery.pendingRevenue)],
        ],
      },
      {
        title: "Schedule & delivery",
        fields: [
          ["Estimated start", dateLabel(project.estimated_start_date)],
          ["Estimated end", dateLabel(project.estimated_end_date)],
          ["Actual start", dateLabel(project.actual_start_date)],
          ["Actual end", dateLabel(project.actual_end_date)],
          ["Contract start", dateLabel(project.contract_start_date)],
          ["Contract end", dateLabel(project.contract_end_date)],
          ["Resources", project.resources?.map((resource) => resource.resourceName).filter(Boolean).join(", ") || "—"],
          ["Total FTE", project.resources?.length
            ? project.resources.reduce((total, resource) => total + (Number(resource.fte) || 0), 0).toFixed(2)
            : "—"],
          ["Volumetric", project.voumetric ?? "—"],
        ],
      },
    ];
    return (
      <div className={`grid divide-y ${compact ? "" : "lg:grid-cols-3 lg:divide-x lg:divide-y-0"}`} style={{ borderColor: border }}>
        {groups.map((group) => (
          <div key={group.title} className="p-5">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: accent }}>
              {group.title}
            </h3>
            <dl className="space-y-3">
              {group.fields.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-[11px]" style={labelStyle}>{label}</dt>
                  <dd className="max-w-[62%] whitespace-pre-wrap text-right text-[11px] font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    );
  };

  const renderTaskForm = () => (
    <div className="grid gap-3 border-t p-5 sm:grid-cols-2 xl:grid-cols-4" style={{ borderColor: border }}>
      {taskField("Task title", "taskTitle")}
      {taskField("Assigned to", "assignedTo")}
      {taskField("Expected start", "expectedStartDate", "date")}
      {taskField("Expected end", "expectedEndDate", "date")}
      {taskField("Actual start", "actualStartDate", "date")}
      {taskField("Actual end", "actualEndDate", "date")}
      {taskField("Progress %", "progress", "number")}
      <label className="space-y-1">
        <span className="block text-[10px] font-semibold" style={labelStyle}>Status</span>
        <select
          value={task.status}
          onChange={(event) => setTask((current) => ({ ...current, status: event.target.value }))}
          className={inputClass}
          style={inputStyle}
        >
          {!PROJECT_STATUSES.includes(task.status) && <option value={task.status}>{task.status}</option>}
          {PROJECT_STATUSES.map((status: string) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="block text-[10px] font-semibold" style={labelStyle}>Notes</span>
        <input
          value={task.remark}
          onChange={(event) => setTask((current) => ({ ...current, remark: event.target.value }))}
          className={inputClass}
          style={inputStyle}
        />
      </label>
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => void saveTask()}
          disabled={savingTask}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: accent }}
        >
          {editingTaskId ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {savingTask ? "Saving…" : editingTaskId ? "Update task" : "Add task"}
        </button>
        {editingTaskId && (
          <button
            type="button"
            onClick={() => { setEditingTaskId(null); setTask(emptyTask); setShowTaskForm(false); }}
            className="rounded-lg border p-2"
            style={{ borderColor: border, color: muted }}
            aria-label="Cancel task edit"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  const renderTaskTable = (items: Task[], showActions: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b text-[10px] font-bold uppercase tracking-[0.1em]" style={{ borderColor: border, color: muted }}>
            <th className="px-5 py-3">Task</th>
            <th className="px-5 py-3">Owner</th>
            <th className="px-5 py-3">Due date</th>
            <th className="px-5 py-3">Progress</th>
            <th className="px-5 py-3">Status</th>
            {showActions && <th className="px-5 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-0" style={{ borderColor: border }}>
              <td className="px-5 py-4 text-xs font-semibold">{item.task_title}</td>
              <td className="px-5 py-4 text-xs" style={{ color: muted }}>
                {item.assigned_to || manager}
              </td>
              <td className="px-5 py-4 text-xs" style={{ color: muted }}>
                {dateLabel(item.expected_end_date)}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: dark ? "#334155" : "#E2E8F0" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, Number(item.progress) || 0))}%`, background: accent }} />
                  </div>
                  <span className="w-8 text-[10px] font-semibold" style={{ color: muted }}>{Number(item.progress || 0)}%</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ color: statusColor(item.status), background: `${statusColor(item.status)}18` }}>
                  {normalizeProjectStatus(item.status)}
                </span>
              </td>
              {showActions && (
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => { setTask(taskDraftFromTask(item)); setEditingTaskId(item.id); setShowTaskForm(true); }}
                      className="rounded-md p-1.5 hover:bg-blue-50"
                      style={{ color: accent }}
                      title="Edit task"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete("Delete this project task?", () => { setConfirmDialog(null); void deleteTask(item.id); })}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={showActions ? 6 : 5} className="px-5 py-10 text-center text-xs" style={{ color: muted }}>
                No project tasks have been recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const riskDraftFields: [string, keyof RiskDraft, string?][] = [
    ["Risk title", "riskTitle"],
    ["Category", "riskCategory"],
    ["Raised by", "raisedBy"],
    ["Risk owner", "owner"],
    ["Date raised", "dateRaised", "date"],
    ["Description", "description"],
    ["Impact description", "impactDescription"],
    ["Mitigation plan", "mitigation"],
    ["Comments / actions", "commentsActions"],
  ];

  return (
    <div className="project-page flex flex-col gap-5 p-5 md:p-6" style={{ color: text }}>
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <section className="w-full max-w-md rounded-xl border p-5 shadow-2xl" style={sectionStyle} role="dialog" aria-modal="true">
            <h2 className="text-sm font-bold">Confirm action</h2>
            <p className="mt-2 text-xs" style={{ color: muted }}>{confirmDialog.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDialog(null)} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: border, color: muted }}>Cancel</button>
              <button type="button" onClick={confirmDialog.onConfirm} className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: accent }}>Confirm</button>
            </div>
          </section>
        </div>
      )}

      {showTemporaryAccessForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4">
          <section
            className="w-full max-w-lg rounded-xl border p-5 shadow-2xl"
            style={sectionStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="temporary-access-title"
          >
            <h2 id="temporary-access-title" className="text-sm font-bold">
              Add temporary manager
            </h2>
            <p className="mt-1 text-xs" style={{ color: muted }}>
              {isAdmin
                ? "As an administrator, access will be granted immediately."
                : "Your request will be sent to an administrator for approval."}
            </p>
            <label className="mt-4 block text-xs font-semibold" style={{ color: muted }}>
              Project manager
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
                value={selectedTemporaryManager}
                onChange={(event) => setSelectedTemporaryManager(event.target.value)}
              >
                <option value="">Select a manager</option>
                {availableTemporaryManagers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.fullName} ({candidate.email})
                  </option>
                ))}
              </select>
              {availableTemporaryManagers.length === 0 && (
                <span className="mt-1 block font-normal">
                  No eligible managers are available for assignment.
                </span>
              )}
            </label>
            <label className="mt-4 block text-xs font-semibold" style={{ color: muted }}>
              Reason
              <textarea
                className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
                maxLength={1000}
                value={temporaryAccessReason}
                onChange={(event) => setTemporaryAccessReason(event.target.value)}
                placeholder="Explain why temporary project access is needed"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={savingTemporaryAccess}
                onClick={() => setShowTemporaryAccessForm(false)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold"
                style={{ borderColor: border, color: muted }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingTemporaryAccess || !selectedTemporaryManager || !temporaryAccessReason.trim()}
                onClick={() => void submitTemporaryAccess()}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: accent }}
              >
                {savingTemporaryAccess ? "Submitting…" : isAdmin ? "Grant access" : "Send for approval"}
              </button>
            </div>
          </section>
        </div>
      )}

      <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-2 text-xs font-semibold" style={{ color: accent }}>
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </button>

      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: accent }}>
            {initialsFor(project.client_name)}
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{project.client_name}</h1>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ color: statusColor(projectStatus), background: `${statusColor(projectStatus)}18` }}>
                {projectStatus}
              </span>
            </div>
            <p className="text-xs" style={{ color: muted }}>
              {project.client_id}
              {project.service_category ? ` · ${project.service_category}` : ""}
              {normalizeHyperscaler(project.hyperscaler) ? ` · ${normalizeHyperscaler(project.hyperscaler)}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]" style={{ color: muted }}>
              <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{manager}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateLabel(project.estimated_start_date)} – {dateLabel(project.estimated_end_date)}</span>
              {project.project_type && <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />{project.project_type}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void downloadUpdates()} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold" style={{ borderColor: border, background: bg }}>
            <Download className="h-4 w-4" /> Export
          </button>
          <button type="button" onClick={onEditProject} className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white" style={{ background: accent }}>
            <Pencil className="h-3.5 w-3.5" /> Edit project
          </button>
        </div>
      </header>

      {message && (
        <div role="status" className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: border, background: bg, color: muted }}>
          {message}
        </div>
      )}

      <nav className="border-b" style={{ borderColor: border }} aria-label="Project details sections">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              className="relative shrink-0 pb-3 text-xs font-semibold"
              style={{ color: activeTab === tab ? accent : muted }}
            >
              {tab}
              {tab === "Tasks" && <span className="ml-1.5 text-[10px] opacity-70">{tasks.length}</span>}
              {tab === "Risks" && <span className="ml-1.5 text-[10px] opacity-70">{risks.length}</span>}
              {tab === "Documents" && <span className="ml-1.5 text-[10px] opacity-70">{documents.length}</span>}
              {activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full" style={{ background: accent }} />}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "Overview" && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
            <section className="overflow-hidden rounded-xl border" style={sectionStyle}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: border }}>
                <div>
                  <h2 className="text-sm font-bold">Project details</h2>
                  <p className="mt-1 text-[11px]" style={{ color: muted }}>Ownership, commercial, and delivery information</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ color: statusColor(projectStatus), background: `${statusColor(projectStatus)}18` }}>
                  {projectStatus}
                </span>
              </div>
              {renderProjectDetails()}
              <div className="border-t px-5 py-4" style={{ borderColor: border }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: muted }}>Project brief</p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5" style={{ color: text }}>
                  {project.project_brief || "No project brief has been added."}
                </p>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="flex flex-col items-center rounded-xl border p-5 text-center" style={sectionStyle}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: muted }}>Overall progress</p>
                <div className="relative my-4 h-28 w-28">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-label={`${progress}% complete`}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke={dark ? "#334155" : "#E2E8F0"} strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - progress / 100)} />
                  </svg>
                  <div className="absolute inset-0 grid place-content-center">
                    <strong className="text-2xl">{progress}%</strong>
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: muted }}>complete</span>
                  </div>
                </div>
                <p className="text-xs font-semibold">Project completion</p>
                <p className="mt-1 text-[10px]" style={{ color: muted }}>{completedTasks} of {tasks.length} tasks completed</p>
                <button type="button" onClick={() => setActiveTab("Tasks")} className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: accent }}>
                  View project tasks <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </section>

              <section className="overflow-hidden rounded-xl border" style={sectionStyle}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: border }}>
                  <h2 className="text-sm font-bold">Attention needed</h2>
                  {attentionItems.length > 0 && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                </div>
                <div className="space-y-1 p-2">
                  {attentionItems.length ? attentionItems.map((item, index) => {
                    const ItemIcon = item.kind === "task" ? Clock3 : item.kind === "risk" ? AlertTriangle : FileText;
                    return (
                      <button
                        key={`${item.kind}-${item.text}-${index}`}
                        type="button"
                        onClick={() => setActiveTab(item.kind === "task" ? "Tasks" : item.kind === "risk" ? "Risks" : "Documents")}
                        className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-slate-50"
                      >
                        <ItemIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: item.kind === "risk" ? "#DC2626" : "#D97706" }} />
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-semibold">{item.text}</span>
                          <span className="mt-1 block text-[10px]" style={{ color: muted }}>{item.detail}</span>
                        </span>
                      </button>
                    );
                  }) : <p className="px-3 py-5 text-center text-xs" style={{ color: muted }}>No outstanding items need attention.</p>}
                </div>
              </section>

              <section className="rounded-xl border p-4" style={sectionStyle}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold">Mandatory documents</h2>
                  <span className="text-[10px] font-bold" style={{ color: documentProgress === 100 ? "#16A34A" : accent }}>
                    {uploadedMandatoryDocuments}/{MANDATORY_DOCUMENTS.length}
                  </span>
                </div>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: dark ? "#334155" : "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: `${documentProgress}%`, background: documentProgress === 100 ? "#16A34A" : accent }} />
                </div>
                <div className="space-y-2">
                  {MANDATORY_DOCUMENTS.slice(0, 5).map((item) => {
                    const uploaded = uploadedMandatoryTypes.has(item.id);
                    return (
                      <div key={item.id} className="flex items-center gap-2 text-[10px]">
                        {uploaded ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5" style={{ color: muted }} />}
                        <span className="flex-1 truncate" style={{ color: uploaded ? text : muted }}>{item.name}</span>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setActiveTab("Documents")} className="mt-4 w-full rounded-lg py-2 text-[10px] font-bold" style={{ color: accent, background: `${accent}12` }}>
                  View all documents
                </button>
              </section>

              {(canManageTemporaryAccess || temporaryAccess.length > 0) && (
                <section className="rounded-xl border p-4" style={sectionStyle} aria-label="Temporary project manager access">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold">Temporary manager access</h2>
                      <p className="mt-1 text-[10px]" style={{ color: muted }}>
                        Approved managers can access this project until their access is revoked.
                      </p>
                    </div>
                    {canManageTemporaryAccess && (
                      <button
                        type="button"
                        onClick={() => setShowTemporaryAccessForm(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-white"
                        style={{ background: accent }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add manager
                      </button>
                    )}
                  </div>
                  {temporaryAccess.length > 0 ? (
                    <div className="mt-3 divide-y" style={{ borderColor: border }}>
                      {temporaryAccess.map((entry) => {
                        const canRevoke = isAdmin ||
                          isPrimaryProjectManager ||
                          entry.managerEmail.toLowerCase() === user.email.toLowerCase();
                        const action = entry.status === "pending"
                          ? "withdraw this request"
                          : "revoke this manager's access";
                        return (
                          <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold">
                                {entry.managerName}
                                <span className="ml-1 font-normal" style={{ color: muted }}>
                                  ({entry.managerEmail})
                                </span>
                              </p>
                              <span
                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                                  entry.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {entry.status === "approved" ? "Active" : "Pending approval"}
                              </span>
                              <p className="mt-1 text-[10px]" style={{ color: muted }}>
                                Reason: {entry.reason}
                              </p>
                              {entry.status === "pending" && (
                                <p className="mt-1 text-[10px]" style={{ color: muted }}>
                                  Requested by {entry.requesterName} · {new Date(entry.createdAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                            {canRevoke && (
                              <button
                                type="button"
                                onClick={() => requestDelete(
                                  `Are you sure you want to ${action}?`,
                                  () => {
                                    setConfirmDialog(null);
                                    void revokeTemporaryAccess(entry);
                                  },
                                )}
                                className="rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold text-red-600"
                                style={{ borderColor: "#FECACA" }}
                              >
                                {entry.status === "pending" ? "Withdraw" : "Revoke"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-[10px]" style={{ color: muted }}>
                      No temporary managers have been assigned.
                    </p>
                  )}
                </section>
              )}
            </aside>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-xl border" style={sectionStyle}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: border }}>
                <div>
                  <h2 className="text-sm font-bold">Priority tasks</h2>
                  <p className="mt-1 text-[11px]" style={{ color: muted }}>Current project tasks and due dates</p>
                </div>
                <button type="button" onClick={() => { setActiveTab("Tasks"); setShowTaskForm(true); setEditingTaskId(null); setTask({ ...emptyTask, assignedTo: manager === "Unassigned" ? "" : manager }); }} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold" style={{ borderColor: border }}>
                  <Plus className="h-3.5 w-3.5" /> Add task
                </button>
              </div>
              {renderTaskTable(tasks.slice(0, 3), false)}
              {tasks.length > 3 && (
                <button type="button" onClick={() => setActiveTab("Tasks")} className="border-t px-5 py-3 text-xs font-semibold" style={{ borderColor: border, color: accent }}>
                  View all {tasks.length} tasks
                </button>
              )}
            </section>

            <section className="rounded-xl border p-5" style={sectionStyle}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">Daily updates</h2>
                  <p className="mt-1 text-[11px]" style={{ color: muted }}>Project activity and handover trail</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold" style={{ color: accent }}>{updates.length}</span>
                  <button type="button" onClick={() => void downloadUpdates()} title="Export updates" aria-label="Export updates" className="rounded-lg border p-1.5" style={{ borderColor: border, color: muted }}>
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-end gap-2 rounded-lg border p-2" style={{ borderColor: border, background: soft }}>
                <textarea
                  value={updateText}
                  onChange={(event) => setUpdateText(event.target.value)}
                  rows={2}
                  placeholder="Share a project update…"
                  className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1 text-xs outline-none"
                  style={{ color: text }}
                />
                <button type="button" onClick={() => void addUpdate()} disabled={!updateText.trim()} aria-label="Post update" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white disabled:opacity-40" style={{ background: accent }}>
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 max-h-72 space-y-4 overflow-y-auto">
                {updates.length ? updates.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ color: accent, background: `${accent}14` }}>
                      {initialsFor(item.updated_by || "Project")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-xs leading-5">{item.update_text}</p>
                      <p className="mt-1 text-[10px]" style={{ color: muted }}>{item.updated_by || "Project team"} · {new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <button type="button" onClick={() => requestDelete("Permanently delete this project update?", () => { setConfirmDialog(null); void deleteUpdate(item.id); })} title="Delete update" aria-label="Delete update" className="h-fit rounded-md p-1 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )) : <p className="py-5 text-center text-xs" style={{ color: muted }}>No project updates recorded yet.</p>}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "Tasks" && (
        <section className="overflow-hidden rounded-xl border" style={sectionStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: border }}>
            <div>
              <h2 className="text-sm font-bold">Project tasks</h2>
              <p className="mt-1 text-[11px]" style={{ color: muted }}>{tasks.length} tasks · {completedTasks} completed</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold" style={{ borderColor: border }}>
                <Upload className="h-3.5 w-3.5" /> Import tasks
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importTasks(file);
                  event.currentTarget.value = "";
                }} />
              </label>
              <button type="button" onClick={() => {
                if (showTaskForm) {
                  setShowTaskForm(false);
                  setEditingTaskId(null);
                  setTask(emptyTask);
                } else {
                  setShowTaskForm(true);
                  setEditingTaskId(null);
                  setTask({ ...emptyTask, assignedTo: manager === "Unassigned" ? "" : manager });
                }
              }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white" style={{ background: accent }}>
                {showTaskForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showTaskForm ? "Close form" : "Add task"}
              </button>
            </div>
          </div>
          {showTaskForm && renderTaskForm()}
          {renderTaskTable(tasks, true)}
        </section>
      )}

      {activeTab === "Risks" && (
        <section className="overflow-hidden rounded-xl border" style={sectionStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: border }}>
            <div>
              <h2 className="text-sm font-bold">Project risk register</h2>
              <p className="mt-1 text-[11px]" style={{ color: muted }}>{openRisks} open risks · {risks.length} total</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void downloadProjectRisks()} disabled={downloadingRisks} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold disabled:opacity-50" style={{ borderColor: border }}>
                <Download className="h-3.5 w-3.5" /> {downloadingRisks ? "Downloading…" : "Export"}
              </button>
              <button type="button" onClick={() => setShowRiskForm((current) => !current)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white" style={{ background: accent }}>
                {showRiskForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showRiskForm ? "Close form" : "Add risk"}
              </button>
            </div>
          </div>
          {showRiskForm && (
            <div className="grid gap-3 border-b p-5 sm:grid-cols-2 xl:grid-cols-3" style={{ borderColor: border }}>
              {riskDraftFields.map(([label, key, type]) => (
                <label key={key} className="space-y-1">
                  <span className="block text-[10px] font-semibold" style={labelStyle}>{label}</span>
                  <input
                    type={type || "text"}
                    value={risk[key]}
                    readOnly={key === "raisedBy"}
                    onChange={(event) => setRisk((current) => ({ ...current, [key]: event.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  />
                </label>
              ))}
              {(["probability", "level", "impact", "status"] as const).map((key) => (
                <label key={key} className="space-y-1">
                  <span className="block text-[10px] font-semibold capitalize" style={labelStyle}>{key}</span>
                  <select value={risk[key]} onChange={(event) => setRisk((current) => ({ ...current, [key]: event.target.value }))} className={inputClass} style={inputStyle}>
                    {(key === "status" ? PROJECT_STATUSES : ["Low", "Medium", "High"]).map((value: string) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              ))}
              <button type="button" onClick={() => void addRisk()} disabled={savingRisk} className="self-end rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: accent }}>
                {savingRisk ? "Saving…" : "Save risk"}
              </button>
            </div>
          )}
          {risks.length ? (
            <div className="divide-y" style={{ borderColor: border }}>
              {risks.map((item) => (
                <article key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_130px_150px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-semibold">{item.risk_title || item.description || "Untitled risk"}</h3>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ color: riskColor(item.level), background: `${riskColor(item.level)}18` }}>{item.level || "Unrated"}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px]" style={{ color: muted }}>{item.description || "No additional description."}</p>
                    <p className="mt-1 text-[10px]" style={{ color: muted }}>
                      Owner: {item.owner || "Unassigned"} · Raised {dateLabel(item.date_raised)}
                    </p>
                  </div>
                  <span className="text-[10px]" style={{ color: muted }}>{item.mitigation || "No mitigation plan"}</span>
                  <label className="text-[10px] font-semibold" style={{ color: muted }}>
                    Status
                    <select value={item.status} onChange={(event) => void updateRisk(item.id, event.target.value)} className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs" style={inputStyle}>
                      {!PROJECT_STATUSES.includes(item.status) && <option value={item.status}>{item.status}</option>}
                      {PROJECT_STATUSES.map((status: string) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          ) : <p className="px-5 py-12 text-center text-xs" style={{ color: muted }}>No project risks have been recorded.</p>}
        </section>
      )}

      {activeTab === "Documents" && (
        <section className="overflow-hidden rounded-xl border" style={sectionStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: border }}>
            <div>
              <h2 className="text-sm font-bold">Project documents</h2>
              <p className="mt-1 text-[11px]" style={{ color: muted }}>
                {uploadedMandatoryDocuments} of {MANDATORY_DOCUMENTS.length} mandatory documents uploaded · {documents.length} files total
              </p>
            </div>
            <button type="button" onClick={onOpenDocuments} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white" style={{ background: accent }}>
              <Upload className="h-3.5 w-3.5" /> Manage documents
            </button>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => (
              <article key={document.id} className="rounded-xl border p-4" style={{ borderColor: border }}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ color: accent, background: `${accent}14` }}>
                    <FileText className="h-5 w-5" />
                  </span>
                  <a href={document.blob_url} target="_blank" rel="noreferrer" className="rounded-md p-1.5" style={{ color: accent }} aria-label={`Open ${document.file_name}`}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <h3 className="break-words text-xs font-semibold">{document.file_name}</h3>
                <p className="mt-1.5 text-[10px]" style={{ color: muted }}>
                  {MANDATORY_DOCUMENTS.find((item) => item.id === document.document_type)?.name || "Project file"}
                  {document.created_at ? ` · ${dateLabel(document.created_at)}` : ""}
                </p>
              </article>
            ))}
            {!documents.length && (
              <p className="col-span-full py-10 text-center text-xs" style={{ color: muted }}>No project documents have been uploaded.</p>
            )}
          </div>
          <div className="border-t px-5 py-4" style={{ borderColor: border }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold">Mandatory document checklist</h3>
              <span className="text-[10px] font-semibold" style={{ color: documentProgress === 100 ? "#16A34A" : accent }}>{documentProgress}% complete</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MANDATORY_DOCUMENTS.map((item) => {
                const uploaded = uploadedMandatoryTypes.has(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-2 text-[10px]">
                    {uploaded ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5" style={{ color: muted }} />}
                    <span style={{ color: uploaded ? text : muted }}>{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {activeTab === "RFP" && (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border" style={sectionStyle}>
            <div className="border-b px-5 py-4" style={{ borderColor: border }}>
              <h2 className="text-sm font-bold">RFP overview & scope</h2>
              <p className="mt-1 text-[11px]" style={{ color: muted }}>Commercial context and scope saved with this project</p>
            </div>
            <div className="grid divide-y lg:grid-cols-[1.4fr_1fr] lg:divide-x lg:divide-y-0" style={{ borderColor: border }}>
              <div className="p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: accent }}>Opportunity overview</h3>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-6" style={{ color: project.project_overview ? text : muted }}>
                  {project.project_overview || "No RFP overview has been saved for this project."}
                </p>
              </div>
              <dl className="space-y-3.5 p-5">
                {[
                  ["RFP reference", project.rfp_project_id || "—"],
                  ["Project type", project.project_type || "—"],
                  ["Service category", project.service_category || "—"],
                  ["Hyperscaler", normalizeHyperscaler(project.hyperscaler) || "—"],
                  ["Proposal owner", project.account_manager || "—"],
                  ["Revenue", formatCurrency(revenue)],
                  ["Status", projectStatus],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <dt className="text-[11px]" style={{ color: muted }}>{label}</dt>
                    <dd className="text-right text-[11px] font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            {[
              { title: "In scope", content: project.in_scope, icon: Check, color: "#16A34A" },
              { title: "Out of scope", content: project.out_of_scope, icon: X, color: "#DC2626" },
            ].map((item) => (
              <section key={item.title} className="rounded-xl border p-5" style={sectionStyle}>
                <h3 className="text-sm font-bold">{item.title}</h3>
                <div className="mt-4 space-y-3">
                  {item.content?.trim() ? item.content.split(/\r?\n/).filter(Boolean).map((line, index) => (
                    <p key={`${item.title}-${index}`} className="flex gap-2 text-xs leading-5" style={{ color: text }}>
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: item.color }} />
                      {line.replace(/^\s*[-•]\s*/, "")}
                    </p>
                  )) : <p className="text-xs" style={{ color: muted }}>No {item.title.toLowerCase()} details have been saved.</p>}
                </div>
              </section>
            ))}
          </div>
          <section className="rounded-xl border p-5" style={sectionStyle}>
            <h3 className="text-sm font-bold">Assumptions</h3>
            <div className="mt-4 space-y-3">
              {project.assumption?.trim()
                ? project.assumption.split(/\r?\n/).filter(Boolean).map((line, index) => (
                    <p key={index} className="flex gap-3 rounded-lg p-3 text-xs leading-5" style={{ background: soft, color: text }}>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ color: accent, background: `${accent}18` }}>{index + 1}</span>
                      {line.replace(/^\s*[-•]\s*/, "")}
                    </p>
                  ))
                : <p className="text-xs" style={{ color: muted }}>No assumptions have been saved for this project.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

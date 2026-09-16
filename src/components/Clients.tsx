import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Download,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from "lucide-react";
import { showCloudOrbixAlert } from "../alert";

interface ClientsProps {
  dark: boolean;
  user?: { roles: string[] };
  onOpenProject?: (clientId: string) => void;
  initialSearch?: string;
}

interface ApiClient {
  clientId: string;
  clientName: string;
  accountManager: string;
  region: string;
  industry: string;
  currentStatus: string;
  plannedOnboardDate?: string | null;
  actualOnboardDate?: string | null;
  plannedOffboardDate?: string | null;
  actualOffboardDate?: string | null;
  revenue?: number | string | null;
  services?: string[];
  updatedDate?: string | null;
  lastUpdated?: string | null;
  remarks?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  year?: number | null;
  completion?: number | null;
  hyperscaler?: string | null;
  projectType?: string | null;
  projectBrief?: string | null;
  projectManager?: string | null;
  estimatedStartDate?: string | null;
  estimatedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  isow?: string | null;
}

interface ClientRow {
  id: string;
  name: string;
  accountManager: string;
  region: string;
  industry: string;
  status: string;
  plannedOnboard: string;
  actualOnboard: string;
  plannedOffboard: string;
  actualOffboard: string | null;
  contractStart: string;
  contractEnd: string;
  notes: string;
  revenue: number;
  services: string[];
  lastUpdated: string;
  [key: string]: unknown;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    Onboarded: { bg: "#DCFCE7", text: "#16A34A", dot: "#16A34A" },
    "Pending Onboarding": { bg: "#DBEAFE", text: "#1D4ED8", dot: "#1D4ED8" },
    "Offboarding Scheduled": { bg: "#FEF3C7", text: "#D97706", dot: "#D97706" },
    Offboarded: { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" },
    Completed: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
    "On-track": { bg: "rgb(233, 253, 81)", text: "#4e6310", dot: "#204b04" },
  };

const SERVICE_ICONS: Record<string, string> = {
  Azure: "🔷",
  AWS: "🟧",
  GCP: "🟩",
  Security: "🛡",
  DevOps: "⚙",
  "Managed Services": "🔧",
  FinOps: "💰",
  Migration: "🔄",
  IaaS: "🏗",
  PaaS: "📦",
  SaaS: "☁",
  "Backup & DR": "💾",
};

const ALL_SERVICES = [
  "Azure",
  "AWS",
  "GCP",
  "IaaS",
  "PaaS",
  "SaaS",
  "Security",
  "DevOps",
  "Migration",
  "Managed Services",
  "FinOps",
  "Backup & DR",
];
const REGIONS = ["North America", "Europe", "APAC", "Middle East", "LATAM"];
const INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Telecommunications",
  "Energy",
  "Education",
  "Logistics",
];
const MANAGERS: string[] = [];

const WIZARD_STEPS = ["Project Info", "Services", "Lifecycle", "Documents"];
const EMPTY_FORM = {
  name: "",
  id: "",
  industry: "",
  region: "",
  manager: "",
  revenue: "",
  services: [] as string[],
  year: new Date().getFullYear(),
  completion: "0",
  hyperscaler: "",
  projectType: "",
  projectBrief: "",
  projectManager: "",
  isow: "",
  estimatedStartDate: "",
  estimatedEndDate: "",
  actualStartDate: "",
  actualEndDate: "",
  plannedOnboard: "",
  actualOnboard: "",
  plannedOffboard: "",
  actualOffboard: "",
  contractStart: "",
  contractEnd: "",
  notes: "",
  status: "Onboarded",
};

export default function Clients({
  dark,
  user,
  onOpenProject,
  initialSearch = "",
}: ClientsProps) {
  const [clientList, setClientList] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [sortCol, setSortCol] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [managers, setManagers] = useState(MANAGERS);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const rowHover = dark ? "#1E293B" : "#F8FAFC";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const loadClients = async () => {
    const token = localStorage.getItem("clmp-token");
    if (!token) return;

    try {
      const response = await fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = response.ok ? await response.json() : null;
      if (!payload?.clients?.length) return;

      const mapped = payload.clients.map((client: ApiClient) => ({
        id: client.clientId,
        name: client.clientName,
        accountManager: client.accountManager,
        region: client.region,
        industry: client.industry,
        status: client.currentStatus,
        plannedOnboard: client.plannedOnboardDate || "",
        actualOnboard: client.actualOnboardDate || "",
        plannedOffboard: client.plannedOffboardDate || "",
        actualOffboard: client.actualOffboardDate || null,
        contractStart: client.contractStartDate || "",
        contractEnd: client.contractEndDate || "",
        notes: client.remarks || "",
        revenue: Number(client.revenue || 0),
        services: client.services || [],
        lastUpdated: client.updatedDate || client.lastUpdated || "",
        year: client.year || new Date().getFullYear(),
        completion: Number(client.completion || 0),
        hyperscaler: client.hyperscaler || "",
        projectType: client.projectType || "",
        projectBrief: client.projectBrief || "",
        projectManager: client.projectManager || "",
        isow: client.isow || "",
        estimatedStartDate: client.estimatedStartDate || "",
        estimatedEndDate: client.estimatedEndDate || "",
        actualStartDate: client.actualStartDate || "",
        actualEndDate: client.actualEndDate || "",
      }));

      setClientList(mapped);
    } catch {
      return;
    }
  };

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    void loadClients();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("clmp-token");
    if (!token) return;
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const names = (payload?.users || [])
          .filter((item: { roles?: string[] }) =>
            item.roles?.some(
              (role) => role === "Manager" || role === "Operations Team",
            ),
          )
          .map(
            (item: {
              fullName?: string;
              firstName?: string;
              lastName?: string;
            }) =>
              item.fullName ||
              `${item.firstName || ""} ${item.lastName || ""}`.trim(),
          )
          .filter(Boolean);
        if (names.length) setManagers(names);
      })
      .catch(() => undefined);
  }, []);

  const PAGE_SIZE = 8;

  const filtered = clientList
    .filter(
      (c) =>
        (statusFilter === "All" || c.status === statusFilter) &&
        (regionFilter === "All" || c.region === regionFilter),
    )
    .filter(
      (c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.accountManager.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const va = (a as any)[sortCol] ?? "";
      const vb = (b as any)[sortCol] ?? "";
      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  const toggleService = (s: string) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(s)
        ? f.services.filter((x) => x !== s)
        : [...f.services, s],
    }));

  const openAddClient = () => {
    setEditingClientId(null);
    setStep(0);
    setForm({ ...EMPTY_FORM, year: new Date().getFullYear() });
    setShowAdd(true);
  };

  const openEditClient = (client: ClientRow) => {
    setEditingClientId(client.id);
    setStep(0);
    setForm({
      ...EMPTY_FORM,
      name: client.name,
      id: client.id,
      industry: client.industry,
      region: client.region,
      manager: client.accountManager,
      revenue: String(client.revenue || ""),
      services: client.services || [],
      year: Number((client as any).year || new Date().getFullYear()),
      completion: String((client as any).completion || 0),
      hyperscaler: (client as any).hyperscaler || "",
      projectType: (client as any).projectType || "",
      projectBrief: (client as any).projectBrief || "",
      projectManager:
        (client as any).projectManager || client.accountManager || "",
      isow: (client as any).isow || "",
      estimatedStartDate: (client as any).estimatedStartDate || "",
      estimatedEndDate: (client as any).estimatedEndDate || "",
      actualStartDate: (client as any).actualStartDate || "",
      actualEndDate: (client as any).actualEndDate || "",
      plannedOnboard: client.plannedOnboard || "",
      actualOnboard: client.actualOnboard || "",
      plannedOffboard: client.plannedOffboard || "",
      actualOffboard: client.actualOffboard || "",
      contractStart: (client as any).contractStart || "",
      contractEnd: (client as any).contractEnd || "",
      notes: (client as any).notes || "",
      status: client.status,
    });
    setShowAdd(true);
  };

  const submitClient = async () => {
    const token = localStorage.getItem("clmp-token");
    if (!token) {
      setShowAdd(false);
      return;
    }

    const payload = {
      clientId:
        form.id || `CLT-${String(clientList.length + 1).padStart(3, "0")}`,
      clientName: form.name || "New Project",
      accountManager: form.manager || "Unassigned",
      region: form.region || "North America",
      industry: form.industry || "Technology",
      revenue: Number(form.revenue) || 0,
      year: Number(form.year) || new Date().getFullYear(),
      completion: Number(form.completion) || 0,
      hyperscaler: form.hyperscaler || null,
      projectType: form.projectType || null,
      projectBrief: form.projectBrief || null,
      projectManager: form.projectManager || form.manager || null,
      isow: form.isow || null,
      estimatedStartDate: form.estimatedStartDate || null,
      estimatedEndDate: form.estimatedEndDate || null,
      actualStartDate: form.actualStartDate || null,
      actualEndDate: form.actualEndDate || null,
      currentStatus: form.status || "Onboarded",
      services: form.services,
      remarks: form.notes || "",
      plannedOnboardDate: form.plannedOnboard || null,
      actualOnboardDate: form.actualOnboard || null,
      plannedOffboardDate: form.plannedOffboard || null,
      actualOffboardDate: form.actualOffboard || null,
      contractStartDate: form.contractStart || null,
      contractEndDate: form.contractEnd || null,
    };

    try {
      const response = await fetch(
        editingClientId ? `/api/clients/${editingClientId}` : "/api/clients",
        {
          method: editingClientId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Unable to create client.");
      }

      if (body.pending) {
        showCloudOrbixAlert(
          "Your project changes were submitted for admin approval.",
          "success",
        );
        setShowAdd(false);
        setEditingClientId(null);
        return;
      }

      const serverClient = body.client;
      const mappedClient: ClientRow = {
        id: serverClient?.clientId || payload.clientId,
        name: serverClient?.clientName || payload.clientName,
        accountManager: serverClient?.accountManager || payload.accountManager,
        region: serverClient?.region || payload.region,
        industry: serverClient?.industry || payload.industry,
        status: serverClient?.currentStatus || payload.currentStatus,
        plannedOnboard:
          serverClient?.plannedOnboardDate || payload.plannedOnboardDate || "",
        actualOnboard:
          serverClient?.actualOnboardDate || payload.actualOnboardDate || "",
        plannedOffboard:
          serverClient?.plannedOffboardDate ||
          payload.plannedOffboardDate ||
          "",
        actualOffboard: serverClient?.actualOffboardDate || null,
        contractStart:
          serverClient?.contractStartDate || payload.contractStartDate || "",
        contractEnd:
          serverClient?.contractEndDate || payload.contractEndDate || "",
        notes: serverClient?.remarks || payload.remarks || "",
        revenue: Number(serverClient?.revenue || payload.revenue || 0),
        services: serverClient?.services || payload.services || [],
        lastUpdated:
          serverClient?.updatedDate || new Date().toISOString().split("T")[0],
        year: serverClient?.year || new Date().getFullYear(),
        completion: Number(serverClient?.completion || 0),
        hyperscaler: serverClient?.hyperscaler || "",
        projectType: serverClient?.projectType || "",
        projectBrief: serverClient?.projectBrief || "",
        projectManager: serverClient?.projectManager || "",
        isow: serverClient?.isow || "",
        estimatedStartDate: serverClient?.estimatedStartDate || "",
        estimatedEndDate: serverClient?.estimatedEndDate || "",
        actualStartDate: serverClient?.actualStartDate || "",
        actualEndDate: serverClient?.actualEndDate || "",
      };

      setClientList((current) =>
        editingClientId
          ? current.map((client) =>
              client.id === editingClientId ? mappedClient : client,
            )
          : [mappedClient, ...current],
      );
    } catch (error) {
      console.error(error);
      showCloudOrbixAlert(
        error instanceof Error ? error.message : "Unable to save client.",
        "error",
      );
      return;
    }

    setShowAdd(false);
    setEditingClientId(null);
    setForm({ ...EMPTY_FORM, year: new Date().getFullYear() });
  };

  const deleteClient = async (clientId: string) => {
    if (!user?.roles.includes("Admin")) return;
    const token = localStorage.getItem("clmp-token");
    const response = await fetch(`/api/clients/${clientId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok)
      setClientList((current) =>
        current.filter((client) => client.id !== clientId),
      );
    if (response.ok)
      showCloudOrbixAlert("Client deleted successfully.", "success");
  };

  const requestClientDeletion = (clientId: string) => {
    setConfirmDialog({
      message: "This client is about to be deleted. Do you want to continue?",
      onConfirm: () => {
        setConfirmDialog(null);
        void deleteClient(clientId);
      },
    });
  };

  const deleteSelected = async () => {
    if (!user?.roles.includes("Admin") || !selected.length) return;
    setConfirmDialog({
      message: `These ${selected.length} projects are about to be deleted. Do you want to continue?`,
      onConfirm: () => {
        setConfirmDialog(null);
        void Promise.all(
          selected.map((clientId) => deleteClient(clientId)).concat(),
        ).then(() => setSelected([]));
      },
    });
  };

  const Th = ({ col, label }: { col: string; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
      style={{ color: muted }}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortCol === col ? (
          sortAsc ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );

  return (
    <div className="p-6" style={{ color: text }}>
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl"
            style={{ borderColor: "#BFDBFE" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-client-title"
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
                id="delete-client-title"
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
                    showCloudOrbixAlert("Deletion cancelled.", "info");
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
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">Project Management</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>
            {filtered.length} projects ·{" "}
            {selected.length > 0 && `${selected.length} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && user?.roles.includes("Admin") && (
            <button
              onClick={() => void deleteSelected()}
              className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              Delete ({selected.length})
            </button>
          )}
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{ borderColor: border, color: muted, background: bg }}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={openAddClient}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: "#1E40AF" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: muted }}
          />
            <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-9 pr-4 py-2 rounded-lg border text-xs outline-none w-56"
            style={{ background: bg, borderColor: border, color: text }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-xs outline-none"
          style={{ background: bg, borderColor: border, color: text }}
        >
          <option value="All">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-xs outline-none"
          style={{ background: bg, borderColor: border, color: text }}
        >
          <option value="All">All Regions</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: bg, borderColor: border }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr
                className="border-b"
                style={{
                  borderColor: border,
                  background: dark ? "#0F172A" : "#F8FAFC",
                }}
              >
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={() =>
                      setSelected(
                        selected.length === paged.length
                          ? []
                          : paged.map((c) => c.id),
                      )
                    }
                  >
                    {selected.length === paged.length && paged.length > 0 ? (
                      <CheckSquare
                        className="w-4 h-4"
                        style={{ color: "#1E40AF" }}
                      />
                    ) : (
                      <Square className="w-4 h-4" style={{ color: muted }} />
                    )}
                  </button>
                </th>
                <Th col="id" label="Project ID" />
                <Th col="year" label="Year" />
                <Th col="name" label="Project Name" />
                <Th col="accountManager" label="Account Manager" />
                <Th col="region" label="Region" />
                <Th col="industry" label="Industry" />
                <Th col="status" label="Status" />
                <Th col="revenue" label="Revenue" />
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Completion
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Hyperscaler
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Project Type
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Project Brief
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  PM Name
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  ISOW
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Estimated Dates
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Actual Dates
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Services
                </th>
                <Th col="lastUpdated" label="Last Updated" />
                <th
                  className="px-4 py-3 text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => {
                const sc = STATUS_COLORS[c.status] || {
                  bg: dark ? "#334155" : "#F1F5F9",
                  text: dark ? "#E2E8F0" : "#475569",
                  dot: dark ? "#94A3B8" : "#64748B",
                };
                const isSelected = selected.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    className="border-b transition-colors"
                    style={{
                      borderColor: border,
                      background: isSelected
                        ? dark
                          ? "#172554"
                          : "#EFF6FF"
                        : "transparent",
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background =
                          rowHover;
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                    }}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(c.id)}>
                        {isSelected ? (
                          <CheckSquare
                            className="w-4 h-4"
                            style={{ color: "#1E40AF" }}
                          />
                        ) : (
                          <Square
                            className="w-4 h-4"
                            style={{ color: muted }}
                          />
                        )}
                      </button>
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: muted }}
                    >
                      {c.id}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {(c as any).year || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOpenProject?.(c.id)}
                        className="font-semibold text-xs text-left hover:underline"
                        style={{ color: "#1E40AF" }}
                      >
                        {c.name}
                      </button>
                      <div
                        className="text-[10px] mt-1 leading-relaxed"
                        style={{ color: muted }}
                      >
                        {(c as any).year || "-"} ·{" "}
                        {(c as any).projectType || "Project"} ·{" "}
                        {(c as any).hyperscaler || "-"} · PM:{" "}
                        {(c as any).projectManager || c.accountManager} · ISOW:{" "}
                        {(c as any).isow || "-"}
                      </div>
                      <div className="text-[10px]" style={{ color: muted }}>
                        Progress: {(c as any).completion || 0}% · Est:{" "}
                        {(c as any).estimatedStartDate || "-"} to{" "}
                        {(c as any).estimatedEndDate || "-"} · Actual:{" "}
                        {(c as any).actualStartDate || "-"} to{" "}
                        {(c as any).actualEndDate || "-"}
                      </div>
                      <div
                        className="text-[10px] truncate max-w-[260px]"
                        style={{ color: muted }}
                      >
                        {(c as any).projectBrief || "No project brief"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.accountManager}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.region}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: muted }}>
                      {c.industry}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: sc.dot }}
                        />
                        {c.status}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-xs font-semibold"
                      style={{ color: text }}
                    >
                      {c.revenue > 0
                        ? `$${(c.revenue / 1000000).toFixed(1)}M`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative w-10 h-10 mx-auto">
                        <svg className="w-10 h-10 -rotate-90">
                          <circle
                            cx="20"
                            cy="20"
                            r="16"
                            stroke="#E5E7EB"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="20"
                            cy="20"
                            r="16"
                            stroke="#22C55E"
                            strokeWidth="4"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={100.53}
                            strokeDashoffset={
                              100.53 * (1 - ((c as any).completion || 0) / 100)
                            }
                          />
                        </svg>

                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                          {(c as any).completion || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {(c as any).hyperscaler || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {(c as any).projectType || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs max-w-[220px]"
                      style={{ color: muted }}
                    >
                      {(c as any).projectBrief || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {(c as any).projectManager || c.accountManager || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {(c as any).isow || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: muted }}
                    >
                      {(c as any).estimatedStartDate || "-"} to{" "}
                      {(c as any).estimatedEndDate || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: muted }}
                    >
                      {(c as any).actualStartDate || "-"} to{" "}
                      {(c as any).actualEndDate || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap max-w-[140px]">
                        {c.services.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: dark ? "#1E3A5F" : "#DBEAFE",
                              color: "#1E40AF",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                        {c.services.length > 3 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: dark ? "#334155" : "#F1F5F9",
                              color: muted,
                            }}
                          >
                            +{c.services.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: muted }}>
                      {c.lastUpdated}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditClient(c)}
                          className="p-1.5 rounded-md hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          style={{ color: muted }}
                          title="Edit project"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditClient(c)}
                          className="p-1.5 rounded-md hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          style={{ color: muted }}
                          title="Edit project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {user?.roles.includes("Admin") && (
                          <button
                            onClick={() => requestClientDeletion(c.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 transition-colors"
                            style={{ color: muted }}
                            title="Delete client"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: border }}
        >
          <span className="text-xs" style={{ color: muted }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-md disabled:opacity-40 hover:bg-slate-100 transition-colors"
              style={{ color: muted }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: page === i + 1 ? "#1E40AF" : "transparent",
                  color: page === i + 1 ? "#fff" : muted,
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-md disabled:opacity-40 hover:bg-slate-100 transition-colors"
              style={{ color: muted }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Project Wizard Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ background: bg }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: border }}
            >
              <div>
                <h2 className="font-bold text-base" style={{ color: text }}>
                  {editingClientId ? "Edit Project" : "Add New Project"}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: muted }}>
                  Step {step + 1} of 4 — {WIZARD_STEPS[step]}
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress */}
            <div className="px-6 pt-4 flex gap-2">
              {WIZARD_STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      background:
                        i <= step ? "#1E40AF" : dark ? "#334155" : "#E2E8F0",
                    }}
                  />
                  <div
                    className="text-[10px] mt-1.5 font-medium"
                    style={{ color: i === step ? "#1E40AF" : muted }}
                  >
                    {s}
                  </div>
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div
              className="px-6 py-5 overflow-y-auto flex-1"
              style={{ maxHeight: "65vh" }}
            >
              {step === 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Project Name",
                      key: "name",
                      placeholder: "e.g. Northgate Technologies",
                    },
                    {
                      label: "Project ID",
                      key: "id",
                      placeholder: "e.g. CLT-011",
                    },
                    {
                      label: "Year",
                      key: "year",
                      placeholder: "e.g. 2026",
                      type: "number",
                    },
                    {
                      label: "Revenue ($)",
                      key: "revenue",
                      placeholder: "e.g. 1200000",
                    },
                    {
                      label: "Account Manager / Manager",
                      key: "manager",
                      placeholder: "Select manager",
                      type: "select",
                      options: managers,
                    },
                    {
                      label: "Industry",
                      key: "industry",
                      placeholder: "Select industry",
                      type: "select",
                      options: INDUSTRIES,
                    },
                    {
                      label: "Region",
                      key: "region",
                      placeholder: "Select region",
                      type: "select",
                      options: REGIONS,
                    },
                    {
                      label: "Project Status",
                      key: "status",
                      placeholder: "Select status",
                      type: "select",
                      options: Object.keys(STATUS_COLORS),
                    },
                    {
                      label: "Hyperscaler",
                      key: "hyperscaler",
                      placeholder: "Azure, AWS, or GCP",
                    },
                    {
                      label: "Project Type",
                      key: "projectType",
                      placeholder: "e.g. Cloud Migration",
                    },
                    {
                      label: "Project Managers",
                      key: "projectManager",
                      placeholder: "Select project managers",
                      type: "multi-select",
                      options: managers,
                    },
                    {
                      label: "ISOW",
                      key: "isow",
                      placeholder: "ISOW reference",
                    },
                    {
                      label: "Completion (%)",
                      key: "completion",
                      placeholder: "Calculated from tasks",
                      type: "number",
                      readOnly: true,
                    },
                  ].map((f) => (
                    <div key={f.key}>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: text }}
                      >
                        {f.label}
                      </label>
                      {f.type === "multi-select" ? (
                        <div
                          className="w-full rounded-lg border p-2 space-y-1.5"
                          style={{ background: inputBg, borderColor: border }}
                        >
                          {f.options?.map((o) => {
                            const selectedManagers = String(
                              (form as any)[f.key] || "",
                            )
                              .split(", ")
                              .filter(Boolean);
                            const checked = selectedManagers.includes(o);
                            return (
                              <label
                                key={o}
                                className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer"
                                style={{ color: text }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setForm((fm) => ({
                                      ...fm,
                                      [f.key]: checked
                                        ? selectedManagers
                                            .filter((manager) => manager !== o)
                                            .join(", ")
                                        : [...selectedManagers, o].join(", "),
                                    }))
                                  }
                                />
                                {o}
                              </label>
                            );
                          })}
                          {!f.options?.length && (
                            <span className="text-xs" style={{ color: muted }}>
                              No project managers available
                            </span>
                          )}
                        </div>
                      ) : f.type === "select" ? (
                        <select
                          value={(form as any)[f.key]}
                          onChange={(e) =>
                            setForm((fm) => ({
                              ...fm,
                              [f.key]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                          style={{
                            background: inputBg,
                            borderColor: border,
                            color: text,
                          }}
                        >
                          <option value="">{f.placeholder}</option>
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type === "number" ? "number" : "text"}
                          readOnly={f.readOnly}
                          value={(form as any)[f.key]}
                          onChange={(e) =>
                            setForm((fm) => ({
                              ...fm,
                              [f.key]: e.target.value,
                            }))
                          }
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                          style={{
                            background: inputBg,
                            borderColor: border,
                            color: text,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div>
                  <label className="block mb-4">
                    <span
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: text }}
                    >
                      Project Brief
                    </span>
                    <textarea
                      value={form.projectBrief}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          projectBrief: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Brief about the project"
                      className="w-full rounded-lg border px-3 py-2 text-xs"
                      style={{
                        background: inputBg,
                        borderColor: border,
                        color: text,
                      }}
                    />
                  </label>
                  <p className="text-xs mb-4" style={{ color: muted }}>
                    Select all services this client will use
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_SERVICES.map((s) => {
                      const active = form.services.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => toggleService(s)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all"
                          style={{
                            background: active ? "#EFF6FF" : inputBg,
                            borderColor: active ? "#1E40AF" : border,
                            color: active ? "#1E40AF" : text,
                          }}
                        >
                          <span>{SERVICE_ICONS[s] || "📦"}</span>
                          {s}
                          {active && <Check className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Planned Onboard Date", key: "plannedOnboard" },
                    { label: "Actual Onboard Date", key: "actualOnboard" },
                    { label: "Planned Offboard Date", key: "plannedOffboard" },
                    { label: "Actual Offboard Date", key: "actualOffboard" },
                    { label: "Contract Start Date", key: "contractStart" },
                    { label: "Contract End Date", key: "contractEnd" },
                    {
                      label: "Estimated Project Start",
                      key: "estimatedStartDate",
                    },
                    { label: "Estimated Project End", key: "estimatedEndDate" },
                    { label: "Actual Project Start", key: "actualStartDate" },
                    { label: "Actual Project End", key: "actualEndDate" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: text }}
                      >
                        {f.label}
                      </label>
                      <input
                        type="date"
                        value={(form as any)[f.key]}
                        onChange={(e) =>
                          setForm((fm) => ({ ...fm, [f.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                        style={{
                          background: inputBg,
                          borderColor: border,
                          color: text,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: text }}
                    >
                      Notes & Remarks
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      rows={4}
                      placeholder="Add any relevant notes about this client engagement..."
                      className="w-full px-3 py-2 rounded-lg border text-xs outline-none resize-none"
                      style={{
                        background: inputBg,
                        borderColor: border,
                        color: text,
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-semibold mb-2"
                      style={{ color: text }}
                    >
                      Attachments
                    </label>
                    <div
                      className="border-2 border-dashed rounded-xl p-6 text-center"
                      style={{ borderColor: dark ? "#334155" : "#CBD5E1" }}
                    >
                      <div className="text-2xl mb-2">📎</div>
                      <p
                        className="text-xs font-medium"
                        style={{ color: text }}
                      >
                        Drag files here or click to browse
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: muted }}>
                        PDF, DOCX, XLSX up to 25MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex justify-between items-center px-6 py-4 border-t"
              style={{ borderColor: border }}
            >
              <button
                onClick={() =>
                  step > 0 ? setStep((s) => s - 1) : setShowAdd(false)
                }
                className="px-4 py-2 rounded-lg text-xs font-medium border transition-colors"
                style={{ borderColor: border, color: muted, background: bg }}
              >
                {step === 0 ? "Cancel" : "Back"}
              </button>
              <button
                onClick={() => {
                  if (step < 3) {
                    setStep((s) => s + 1);
                    return;
                  }

                  void submitClient();
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: "#1E40AF" }}
              >
                {step < 3 ? (
                  <>
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />{" "}
                    {editingClientId ? "Update Client" : "Save Client"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

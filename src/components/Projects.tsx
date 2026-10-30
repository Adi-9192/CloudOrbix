import { useEffect, useState } from "react"

import {
  Search,
  Plus,
  Download,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
} from "lucide-react"

import { showCloudOrbixAlert } from "../alert"

import { createProjectIdAllocator } from "../../shared/project-id.js"
import {
  normalizeProjectStatus,
  PROJECT_STATUSES,
  PROJECT_STATUS_COLORS,
} from "../../shared/project-status.js"
import { normalizeProjectName } from "../../shared/project-name.js"
import { MANDATORY_DOCUMENTS } from "../data/projectDocuments"
import type { RfpProjectPrefill } from "./RfpEstimation"

interface ClientsProps {
  dark: boolean

  user?: {
    firstName: string
    lastName: string
    email: string
    roles: string[]
  }

  onOpenProject?: (clientId: string) => void

  initialSearch?: string
  requestedEditId?: string | null
  onEditRequestHandled?: () => void

  newProjectSeed?: RfpProjectPrefill | null

  onProjectSeedConsumed?: () => void
}

interface ApiClient {
  clientId: string

  clientName: string

  accountManager: string

  region: string

  industry: string

  currentStatus: string

  plannedOnboardDate?: string | null

  actualOnboardDate?: string | null

  plannedOffboardDate?: string | null

  actualOffboardDate?: string | null

  revenue?: number | string | null
  currencyCode?: string | null

  services?: string[]

  updatedDate?: string | null

  lastUpdated?: string | null

  remarks?: string | null

  contractStartDate?: string | null

  contractEndDate?: string | null

  year?: number | null

  completion?: number | null

  hyperscaler?: string | null

  projectType?: string | null

  serviceCategory?: string | null

  projectBrief?: string | null
  projectOverview?: string | null
  inScope?: string | null
  outOfScope?: string | null
  assumption?: string | null

  projectManager?: string | null

  projectBillingCode?: string | null

  resources?: ResourceAllocation[]

  voumetric?: number | null

  estimatedStartDate?: string | null

  estimatedEndDate?: string | null

  actualStartDate?: string | null

  actualEndDate?: string | null

  isow?: string | null
}

interface ResourceAllocation {
  resourceName: string

  fte: number | null

  roleForProject: string

  infrastructureAccess: boolean
}

interface ProjectUserOption {
  email: string
  fullName: string
  roles: string[]
}

interface ClientRow {
  id: string

  name: string

  accountManager: string

  region: string

  industry: string

  status: string

  projectBillingCode: string

  year: number

  completion: number

  hyperscaler: string

  projectType: string

  serviceCategory: string

  projectBrief: string

  projectManager: string

  isow: string

  resources: ResourceAllocation[]

  voumetric: number | null

  plannedStartDate: string

  plannedEndDate: string

  actualStartDate: string

  actualEndDate: string

  contractStart: string

  contractEnd: string

  notes: string

  revenue: number
  currencyCode: string
  projectOverview: string
  inScope: string
  outOfScope: string
  assumption: string

  services: string[]

  lastUpdated: string

  [key: string]: unknown
}

const STATUS_PRIORITY = new Map(
  PROJECT_STATUSES.map((status, index) => [
    status.toLowerCase(),

    PROJECT_STATUSES.length - index,
  ]),
)

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ...Object.fromEntries(
    Object.entries(PROJECT_STATUS_COLORS).map(([status, palette]) => [
      status,
      { bg: palette.background, text: palette.color, dot: palette.color },
    ]),
  ),
}

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
}

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
]

// aDDED NEW variable og list of regions, hyperscalers,

const REGIONS = ["North America", "Europe", "APAC", "Middle East", "LATAM"]

const HYPERSCALERS = ["GCP", "AZURE", "AWS", "Oracle", "Other"]

const INDUSTRIES = [
  "Financial Services",

  "Healthcare",

  "Manufacturing",

  "Retail",

  "Telecommunications",

  "Energy",

  "Education",

  "Logistics",
]

const WIZARD_STEPS = ["Project Info", "Services", "Lifecycle", "Resources"]

const toPercentage = (value: number | string | null | undefined) => {
  const percentage = Number(value || 0)

  return percentage > 0 && percentage <= 1
    ? Math.round(percentage * 100)
    : percentage
}

const dateOnly = (value: string | null | undefined) =>
  value ? String(value).slice(0, 10) : ""

const nextProjectId = (clients: ClientRow[]) => {
  const now = new Date()

  const allocator = createProjectIdAllocator(clients.map((client) => client.id))

  return allocator.next({
    month: now.getMonth() + 1,

    year: now.getFullYear(),
  })
}

const EMPTY_FORM = {
  name: "",

  id: "",

  industry: "",

  region: "",

  manager: "",

  revenue: "",

  currencyCode: "INR",

  projectOverview: "",

  inScope: "",

  outOfScope: "",

  assumption: "",

  services: [] as string[],

  year: new Date().getFullYear(),

  completion: "0",

  hyperscaler: "",

  projectType: "",

  serviceCategory: "",

  projectBrief: "",

  projectManager: "",

  projectBillingCode: "",

  voumetric: "",

  resources: [
    {
      resourceName: "",
      fte: null,
      roleForProject: "",
      infrastructureAccess: false,
    },
  ] as ResourceAllocation[],

  isow: "",

  plannedStartDate: "",

  plannedEndDate: "",

  actualStartDate: "",

  actualEndDate: "",

  contractStart: "",

  contractEnd: "",

  notes: "",

  status: "On Track",
  rfpProjectId: null as number | null,
}

const CURRENCIES = [
  "INR", "AED", "AUD", "CAD", "CHF", "DKK", "EUR", "GBP", "NOK", "SEK", "SGD", "USD",
]
const formatRevenue = (value: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCIES.includes(currency) ? currency : "INR",
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value)

export default function Projects({
  dark,

  user,

  onOpenProject,

  initialSearch = "",
  requestedEditId = null,
  onEditRequestHandled,
  newProjectSeed,
  onProjectSeedConsumed,
}: ClientsProps) {
  const [clientList, setClientList] = useState<ClientRow[]>([])
  const [clientsLoaded, setClientsLoaded] = useState(false)

  const [search, setSearch] = useState("")

  const [statusFilter, setStatusFilter] = useState("All")

  const [regionFilter, setRegionFilter] = useState("All")

  const [sortCol, setSortCol] = useState("status")

  const [sortAsc, setSortAsc] = useState(false)

  const [selected, setSelected] = useState<string[]>([])

  const [page, setPage] = useState(1)

  const [pageSize, setPageSize] = useState(10)

  const [showAdd, setShowAdd] = useState(false)

  const [editingClientId, setEditingClientId] = useState<string | null>(null)

  const [projectUsers, setProjectUsers] = useState<ProjectUserOption[]>([])

  const [step, setStep] = useState(0)

  const [form, setForm] = useState(EMPTY_FORM)

  const [confirmDialog, setConfirmDialog] = useState<{
    message: string

    confirmLabel?: string

    cancelMessage?: string

    onConfirm: () => void
  } | null>(null)

  const bg = dark ? "#1E293B" : "#FFFFFF"

  const border = dark ? "#334155" : "#E2E8F0"

  const text = dark ? "#E2E8F0" : "#0F172A"

  const muted = dark ? "#94A3B8" : "#64748B"

  const rowHover = dark ? "#1E293B" : "#F8FAFC"

  const inputBg = dark ? "#0F172A" : "#F8FAFC"

  const loadClients = async () => {
    const token = localStorage.getItem("clmp-token")

    if (!token) return

    try {
      const response = await fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(
          "Unable to load projects. Check that the latest database migrations have been applied.",
        )
      }

      const payload = await response.json()

      const mapped = payload.clients.map((client: ApiClient) => ({
        id: client.clientId,

        name: client.clientName,

        accountManager: client.accountManager,

        region: client.region,

        industry: client.industry,

        status: normalizeProjectStatus(client.currentStatus),

        projectBillingCode: client.projectBillingCode || "",

        resources: client.resources?.length
          ? client.resources.map((resource) => ({
              ...resource,
              roleForProject: resource.roleForProject || "",
              infrastructureAccess: Boolean(resource.infrastructureAccess),
            }))
          : [{
              resourceName: "",
              fte: null,
              roleForProject: "",
              infrastructureAccess: false,
            }],

        voumetric: client.voumetric ?? null,

        plannedStartDate: dateOnly(
          client.estimatedStartDate || client.plannedOnboardDate,
        ),

        plannedEndDate: dateOnly(
          client.estimatedEndDate || client.plannedOffboardDate,
        ),

        actualStartDate: dateOnly(
          client.actualStartDate || client.actualOnboardDate,
        ),

        actualEndDate: dateOnly(
          client.actualEndDate || client.actualOffboardDate,
        ),

        contractStart: dateOnly(client.contractStartDate),

        contractEnd: dateOnly(client.contractEndDate),

        notes: client.remarks || "",

        revenue: Number(client.revenue || 0),

        currencyCode: client.currencyCode || "INR",

        projectOverview: client.projectOverview || "",

        inScope: client.inScope || "",

        outOfScope: client.outOfScope || "",

        assumption: client.assumption || "",

        services: client.services || [],

        lastUpdated: client.updatedDate || client.lastUpdated || "",

        year: client.year || new Date().getFullYear(),

        completion: toPercentage(client.completion),

        hyperscaler: client.hyperscaler || "",

        projectType: client.projectType || "",

        serviceCategory: client.serviceCategory || "",

        projectBrief: client.projectBrief || "",

        projectManager: client.projectManager || "",

        isow: client.isow || "",
      }))

      setClientList(mapped)
      setClientsLoaded(true)
    } catch (error) {
      console.error("Unable to load projects:", error)
      setClientsLoaded(true)

      showCloudOrbixAlert(
        error instanceof Error
          ? error.message
          : "Unable to load projects. Check that the latest database migrations have been applied.",

        "error",
      )
    }
  }

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, regionFilter])

  useEffect(() => {
    void loadClients()
  }, [])

  useEffect(() => {
    if (!newProjectSeed) return
    setEditingClientId(null)
    setStep(0)
    setForm({
      ...EMPTY_FORM,
      id: nextProjectId(clientList),
      name: newProjectSeed.accountName,
      manager: newProjectSeed.requestFromBy,
      region: newProjectSeed.region,
      revenue: String(newProjectSeed.revenue),
      currencyCode: newProjectSeed.currency,
      hyperscaler: newProjectSeed.cloud.toUpperCase(),
      projectType: newProjectSeed.projectType === "Non Std" ? "Non-STD" : "STD",
      projectBrief: newProjectSeed.projectOverview,
      projectOverview: newProjectSeed.projectOverview,
      assumption: newProjectSeed.assumption,
      inScope: newProjectSeed.inScope,
      outOfScope: newProjectSeed.outOfScope,
      plannedStartDate: newProjectSeed.initiatedAt,
      actualStartDate: newProjectSeed.initiatedAt,
      status: "On Track",
      rfpProjectId: newProjectSeed.rfpId,
    })
    setShowAdd(true)
    onProjectSeedConsumed?.()
  }, [newProjectSeed])

  useEffect(() => {
    const token = localStorage.getItem("clmp-token")

    if (!token) return

    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })

      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.message || "Unable to load project managers.")
        }
        const users = (payload.users || [])
          .filter((item: ProjectUserOption & { isActive?: boolean }) => item.isActive !== false)
          .map((item: ProjectUserOption & { firstName?: string; lastName?: string }) => ({
            email: item.email,
            fullName:
              item.fullName ||
              `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
              item.email,
            roles: item.roles || [],
          }))
          .filter((item: ProjectUserOption) => item.email && item.roles.length)
        setProjectUsers(users)
      })
      .catch((error: unknown) => {
        console.error("Unable to load project managers:", error)
        showCloudOrbixAlert(
          error instanceof Error ? error.message : "Unable to load project managers.",
          "error",
        )
      })
  }, [])

  const searchTerm = search.trim().toLowerCase()

  const filtered = clientList

    .filter(
      (c) =>
        (statusFilter === "All" || c.status === statusFilter) &&
        (regionFilter === "All" || c.region === regionFilter),
    )

    .filter(
      (c) =>
        !searchTerm ||
        [
          c.id,

          c.name,

          c.accountManager,

          c.region,

          c.industry,

          c.status,

          c.projectBillingCode,

          c.voumetric,

          c.hyperscaler,

          c.projectType,

          c.projectBrief,

          c.projectManager,

          c.isow,

          ...c.resources.flatMap((resource) => [
            resource.resourceName,

            resource.fte,
          ]),
        ].some((value) =>
          String(value ?? "")

            .toLowerCase()

            .includes(searchTerm),
        ),
    )

    .sort((a, b) => {
      const va = (a as any)[sortCol] ?? ""

      const vb = (b as any)[sortCol] ?? ""

      if (sortCol === "status") {
        const priorityA = STATUS_PRIORITY.get(String(va).toLowerCase()) ?? 0

        const priorityB = STATUS_PRIORITY.get(String(vb).toLowerCase()) ?? 0

        const priorityDifference = sortAsc
          ? priorityA - priorityB
          : priorityB - priorityA

        return priorityDifference || String(va).localeCompare(String(vb))
      }

      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const totalPages = Math.ceil(filtered.length / pageSize)

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else {
      setSortCol(col)

      setSortAsc(true)
    }
  }

  const toggleSelect = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    )

  const toggleService = (s: string) =>
    setForm((f) => ({
      ...f,

      services: f.services.includes(s)
        ? f.services.filter((x) => x !== s)
        : [...f.services, s],
    }))

  const openAddClient = () => {
    setEditingClientId(null)

    setStep(0)

    setForm({
      ...EMPTY_FORM,

      id: nextProjectId(clientList),

      year: new Date().getFullYear(),
    })

    setShowAdd(true)
  }

  const openEditClient = (client: ClientRow) => {
    const roles = user?.roles || []
    const hasAdministrativeAccess = roles.some((role) =>
      ["Admin", "Operations Team"].includes(role),
    )
    const identities = [
      user?.email,
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
    ]
      .filter((identity): identity is string => Boolean(identity))
      .map((identity) => identity.trim().toLowerCase().replace(/\s+/g, " "))
    const assignedUsers = [client.projectManager, client.accountManager]
      .filter(Boolean)
      .flatMap((assignment) => String(assignment).split(/[,;/|]+/))
      .map((assignment) => assignment.trim().toLowerCase().replace(/\s+/g, " "))
    const isAssignedManager =
      roles.includes("Manager") &&
      identities.some((identity) => assignedUsers.includes(identity))

    if (!hasAdministrativeAccess && !isAssignedManager) {
      if (!roles.includes("Manager")) {
        showCloudOrbixAlert(
          "You are not authorized to update this project.",
          "error",
        )
        return
      }
      setConfirmDialog({
        message: `You are not authorized to update ${client.name}. Request access from all administrators?`,
        confirmLabel: "Request access",
        cancelMessage: "Access request cancelled.",
        onConfirm: () => {
          setConfirmDialog(null)
          void requestProjectAccess(client.id)
        },
      })
      return
    }

    setEditingClientId(client.id)

    setStep(0)

    setForm({
      ...EMPTY_FORM,

      name: client.name,

      id: client.id,

      industry: client.industry,

      region: client.region,

      manager: (client as any).projectManager || client.accountManager,

      revenue: String(client.revenue || ""),

      currencyCode: client.currencyCode || "INR",

      projectOverview: client.projectOverview || "",

      inScope: client.inScope || "",

      outOfScope: client.outOfScope || "",

      assumption: client.assumption || "",

      services: client.services || [],

      year: Number((client as any).year || new Date().getFullYear()),

      completion: String(toPercentage((client as any).completion)),

      hyperscaler: (client as any).hyperscaler || "",

      projectType: (client as any).projectType || "",

      serviceCategory: (client as any).serviceCategory || "",

      projectBrief: (client as any).projectBrief || "",

      projectManager:
        (client as any).projectManager || client.accountManager || "",

      projectBillingCode: client.projectBillingCode || "",

      resources: client.resources?.length
        ? client.resources.map((resource) => ({
            ...resource,
            roleForProject: resource.roleForProject || "",
            infrastructureAccess: Boolean(resource.infrastructureAccess),
          }))
        : [{
            resourceName: "",
            fte: null,
            roleForProject: "",
            infrastructureAccess: false,
          }],

      voumetric:
        client.voumetric === null || client.voumetric === undefined
          ? ""
          : String(client.voumetric),

      isow: (client as any).isow || "",

      plannedStartDate: client.plannedStartDate || "",

      plannedEndDate: client.plannedEndDate || "",

      actualStartDate: client.actualStartDate || "",

      actualEndDate: client.actualEndDate || "",

      contractStart: client.contractStart || "",

      contractEnd: client.contractEnd || "",

      notes: (client as any).notes || "",

      status: normalizeProjectStatus(client.status),
    })

    setShowAdd(true)
  }

  useEffect(() => {
    if (!requestedEditId || !clientsLoaded) return
    const client = clientList.find((item) => item.id === requestedEditId)
    if (client) {
      openEditClient(client)
    } else {
      showCloudOrbixAlert(
        "Unable to find this project in the project list.",
        "error",
      )
    }
    onEditRequestHandled?.()
  }, [requestedEditId, clientsLoaded, clientList, onEditRequestHandled])

  const requestProjectAccess = async (clientId: string) => {
    const token = localStorage.getItem("clmp-token")
    if (!token) {
      showCloudOrbixAlert("Your session has expired. Please sign in again.", "error")
      return
    }
    try {
      const response = await fetch(`/api/clients/${clientId}/access-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(body.message || "Unable to request project access.")
      }
      showCloudOrbixAlert(
        "Your access request was sent to all administrators.",
        "success",
      )
    } catch (error) {
      showCloudOrbixAlert(
        error instanceof Error ? error.message : "Unable to request project access.",
        "error",
      )
    }
  }

  const submitClient = async () => {
    if (!form.name.trim()) {
      setStep(0)

      showCloudOrbixAlert("Project Name is required.", "warning")

      return
    }

    const normalizedName = normalizeProjectName(form.name)
    const duplicateName = clientList.some((client) =>
      client.id !== editingClientId &&
      normalizeProjectName(client.name) === normalizedName
    )
    if (duplicateName) {
      setStep(0)
      showCloudOrbixAlert("A project with this name already exists. Enter a unique project name.", "warning")
      return
    }

    if (
      normalizeProjectStatus(form.status) === "Completed" &&
      !form.actualEndDate.trim()
    ) {
      setStep(2)
      showCloudOrbixAlert("Actual End Date is required to mark a project as completed.", "warning")
      return
    }

    if (!form.manager.trim()) {
      setStep(0)
      showCloudOrbixAlert("Project Manager is required.", "warning")
      return
    }

    const token = localStorage.getItem("clmp-token")

    if (!token) {
      setShowAdd(false)

      return
    }

    const payload = {
      clientId: form.id || nextProjectId(clientList),

      clientName: form.name.trim(),

      accountManager: form.manager,

      region: form.region || "North America",

      industry: form.industry || "Technology",

      revenue: Number(form.revenue) || 0,

      currencyCode: form.currencyCode,

      projectOverview: form.projectOverview || null,

      inScope: form.inScope || null,

      outOfScope: form.outOfScope || null,

      assumption: form.assumption || null,

      year: Number(form.year) || new Date().getFullYear(),

      completion: toPercentage(form.completion),

      hyperscaler: form.hyperscaler || null,

      projectType: form.projectType || null,

      serviceCategory: form.serviceCategory || null,

      projectBrief: form.projectBrief || null,

      projectManager: form.manager,

      projectBillingCode: form.projectBillingCode || null,

      voumetric: form.voumetric === "" ? null : Number(form.voumetric),

      resources: form.resources

        .filter((resource) => resource.resourceName.trim())

        .map((resource) => ({

          resourceName: resource.resourceName.trim(),

          fte: resource.fte,

          roleForProject: resource.roleForProject.trim(),

          infrastructureAccess: resource.infrastructureAccess,
        })),

      isow: form.isow || null,

      estimatedStartDate: form.plannedStartDate || null,

      estimatedEndDate: form.plannedEndDate || null,

      actualStartDate: form.actualStartDate || null,

      actualEndDate: form.actualEndDate || null,

      currentStatus: form.status || "On Track",
      rfpProjectId: form.rfpProjectId,

      services: form.services,

      remarks: form.notes || "",

      plannedOnboardDate: form.plannedStartDate || null,

      actualOnboardDate: form.actualStartDate || null,

      plannedOffboardDate: form.plannedEndDate || null,

      actualOffboardDate: form.actualEndDate || null,

      contractStartDate: form.contractStart || null,

      contractEndDate: form.contractEnd || null,
    }

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
      )

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.message || "Unable to create project.")
      }

      if (body.pending) {
        showCloudOrbixAlert(
          editingClientId
            ? "Your project changes were submitted for admin approval."
            : "Your project creation request was sent to all administrators for approval.",

          "success",
        )

        setShowAdd(false)

        setEditingClientId(null)

        return
      }

      const serverClient = body.client

      const mappedClient: ClientRow = {
        id: serverClient?.clientId || payload.clientId,

        name: serverClient?.clientName || payload.clientName,

        accountManager: serverClient?.accountManager || payload.accountManager,

        region: serverClient?.region || payload.region,

        industry: serverClient?.industry || payload.industry,

        status: serverClient?.currentStatus || payload.currentStatus,

        projectBillingCode:
          serverClient?.projectBillingCode || payload.projectBillingCode || "",

        resources: serverClient?.resources || payload.resources || [],

        voumetric: serverClient?.voumetric ?? payload.voumetric,

        plannedStartDate:
          serverClient?.estimatedStartDate || payload.estimatedStartDate || "",

        plannedEndDate:
          serverClient?.estimatedEndDate || payload.estimatedEndDate || "",

        actualStartDate:
          serverClient?.actualStartDate || payload.actualStartDate || "",

        actualEndDate:
          serverClient?.actualEndDate || payload.actualEndDate || "",

        contractStart:
          serverClient?.contractStartDate || payload.contractStartDate || "",

        contractEnd:
          serverClient?.contractEndDate || payload.contractEndDate || "",

        notes: serverClient?.remarks || payload.remarks || "",

        revenue: Number(serverClient?.revenue || payload.revenue || 0),

        currencyCode: serverClient?.currencyCode || payload.currencyCode,

        projectOverview: serverClient?.projectOverview || payload.projectOverview || "",

        inScope: serverClient?.inScope || payload.inScope || "",

        outOfScope: serverClient?.outOfScope || payload.outOfScope || "",

        assumption: serverClient?.assumption || payload.assumption || "",

        services: serverClient?.services || payload.services || [],

        lastUpdated:
          serverClient?.updatedDate || new Date().toISOString().split("T")[0],

        year: serverClient?.year || new Date().getFullYear(),

        completion: toPercentage(
          serverClient?.completion ?? payload.completion,
        ),

        hyperscaler: serverClient?.hyperscaler || "",

        projectType: serverClient?.projectType || "",

        serviceCategory: serverClient?.serviceCategory || "",

        projectBrief: serverClient?.projectBrief || "",

        projectManager: serverClient?.projectManager || "",

        isow: serverClient?.isow || "",
      }

      setClientList((current) =>
        editingClientId
          ? current.map((client) =>
              client.id === editingClientId ? mappedClient : client,
            )
          : [mappedClient, ...current],
      )
    } catch (error) {
      console.error(error)

      showCloudOrbixAlert(
        error instanceof Error ? error.message : "Unable to save project.",

        "error",
      )

      return
    }

    setShowAdd(false)

    setEditingClientId(null)

    setForm({ ...EMPTY_FORM, year: new Date().getFullYear() })
  }

  const deleteClient = async (clientId: string) => {
    if (!user?.roles.includes("Admin")) return

    const token = localStorage.getItem("clmp-token")

    const response = await fetch(`/api/clients/${clientId}`, {
      method: "DELETE",

      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok)
      setClientList((current) =>
        current.filter((client) => client.id !== clientId),
      )

    if (response.ok)
      showCloudOrbixAlert("Project deleted successfully.", "success")
  }

  const requestClientDeletion = (clientId: string) => {
    setConfirmDialog({
      message: "This project is about to be deleted. Do you want to continue?",

      onConfirm: () => {
        setConfirmDialog(null)

        void deleteClient(clientId)
      },
    })
  }

  const deleteSelected = async () => {
    if (!user?.roles.includes("Admin") || !selected.length) return

    setConfirmDialog({
      message: `These ${selected.length} projects are about to be deleted. Do you want to continue?`,

      onConfirm: () => {
        setConfirmDialog(null)

        void Promise.all(
          selected.map((clientId) => deleteClient(clientId)).concat(),
        ).then(() => setSelected([]))
      },
    })
  }

  const Th = ({ col, label }: { col: string label: string }) => (
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
  )

  return (
    <div className="p-6" style={{ color: text }}>
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl"
            style={{ borderColor: "#BFDBFE" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
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
                id="delete-project-title"
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
                    setConfirmDialog(null)

                    showCloudOrbixAlert(
                      confirmDialog.cancelMessage || "Deletion cancelled.",
                      "info",
                    )
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
                  {confirmDialog.confirmLabel || "Delete"}
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
          {/* <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{ borderColor: border, color: muted, background: bg }}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button> */}
          {user?.roles.includes("Admin") && (
            <button
              onClick={openAddClient}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ background: "#1E40AF" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Project
            </button>
          )}
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
          {PROJECT_STATUSES.map((s) => (
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
          <table className="w-full min-w-[1900px]">
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
                <Th col="accountManager" label="Manager" />
                <Th col="projectBillingCode" label="Project Billing Code" />
                <Th col="voumetric" label="Volumetric" />
                <Th col="region" label="Region" />
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
                  ISOW
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Planned Start Date
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Planned End Date
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Actual Start Date
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: muted }}
                >
                  Actual End Date
                </th>
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
                const sc = STATUS_COLORS[normalizeProjectStatus(c.status)] || {
                  bg: dark ? "#334155" : "#F1F5F9",
                  text: dark ? "#E2E8F0" : "#475569",
                  dot: dark ? "#94A3B8" : "#64748B",
                }
                const isSelected = selected.includes(c.id)

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
                          rowHover
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent"
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
                      {c.year || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOpenProject?.(c.id)}
                        className="font-semibold text-xs text-left hover:underline"
                        style={{ color: "#1E40AF" }}
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.accountManager}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.projectBillingCode || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.voumetric ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.region}
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
                        ? formatRevenue(c.revenue, c.currencyCode)
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
                            strokeDashoffset={100.53 * (1 - c.completion / 100)}
                          />
                        </svg>

                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                          {c.completion || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.hyperscaler || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.projectType || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs max-w-[260px] whitespace-normal"
                      style={{ color: muted }}
                    >
                      {c.projectBrief || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: text }}>
                      {c.isow || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs whitespace-nowrap"
                        style={{ color: muted }}
                      >
                        {c.plannedStartDate || "-"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: muted }}
                    >
                      {c.plannedEndDate || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: muted }}
                    >
                      {c.actualStartDate || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: muted }}
                    >
                      {c.actualEndDate || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: border }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: muted }}>
              Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <label className="flex items-center gap-1.5 text-xs" style={{ color: muted }}>
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="rounded-md border px-1.5 py-1 text-xs outline-none"
                style={{ background: bg, borderColor: border, color: text }}
                aria-label="Projects per page"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
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

      {/* Add Project Wizard Model */}
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

                      required: true,
                    },

                    {
                      label: "Project ID",

                      key: "id",

                      placeholder: "Automatically generated",

                      readOnly: true,
                    },

                    {
                      label: "Year",

                      key: "year",

                      placeholder: "e.g. 2026",

                      type: "number",
                    },

                    {
                      label: "Revenue",

                      key: "revenue",

                      placeholder: "e.g. 1200000",
                    },

                    {
                      label: "Revenue Currency",

                      key: "currencyCode",

                      placeholder: "Select currency",

                      type: "select",

                      options: CURRENCIES,
                    },

                    {
                      label: "Project Manager",

                      key: "manager",

                      placeholder: "",

                      required: true,

                      type: "select",

                    },

                    {
                      label: "Industry",

                      key: "industry",

                      placeholder: "",

                      type: "select",

                      options: INDUSTRIES,
                    },

                    {
                      label: "Region",

                      key: "region",

                      placeholder: "",

                      type: "select",

                      options: REGIONS,
                    },

                    {
                      label: "Project Status",

                      key: "status",

                      placeholder: "",

                      type: "select",

                      options: PROJECT_STATUSES,
                    },

                    {
                      label: "Hyperscaler",

                      key: "hyperscaler",

                      placeholder: "",

                      type: "select",

                      options: HYPERSCALERS,
                    },

                    {
                      label: "Project Type",

                      key: "projectType",

                      placeholder: "",

                      type: "select",

                      options: ["STD", "Non-STD"],
                    },

                    {
                      label: "Service Category",

                      key: "serviceCategory",

                      placeholder: "",

                      type: "select",

                      options: [
                        "Architecture, Design & Build (Architecture, Landing Zone, Enhancements, Build Activities)",
                        "Lifecycle Management (Upgrades, Offboarding)",
                        "Operations Enablement (Run Enablement, Security Support Services, Transition)",
                      ],
                    },

                    {
                      label: "Project Billing Code",

                      key: "projectBillingCode",

                      placeholder: "e.g. BILL-1001",
                    },

                    {
                      label: "Volumetric",

                      key: "voumetric",

                      placeholder: "Enter a whole number",

                      type: "number",
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
                        {f.required && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </label>
                      {f.type === "select" ? (
                        <>
                          <select
                            value={(form as any)[f.key]}
                            required={f.required}
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
                            {f.key === "status" &&
                              form.status &&
                              !PROJECT_STATUSES.includes(normalizeProjectStatus(form.status)) && (
                                <option value={form.status}>{form.status}</option>
                              )}
                            {f.key === "manager" &&
                              form.manager &&
                              !projectUsers.some(
                                (projectUser) =>
                                  projectUser.fullName === form.manager,
                              ) && (
                                <option value={form.manager}>
                                  {form.manager} (current assignment)
                                </option>
                              )}
                            {f.key === "manager"
                              ? projectUsers.map((projectUser) => (
                                  <option
                                    key={projectUser.email}
                                    value={projectUser.fullName}
                                  >
                                    {projectUser.fullName} —{" "}
                                    {projectUser.roles.join(", ")}
                                  </option>
                                ))
                              : (f.key === "region" && form.region && !f.options?.includes(form.region)
                                  ? [...(f.options || []), form.region]
                                  : f.options || []).map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                          </select>
                          {f.key === "status" &&
                            normalizeProjectStatus(form.status) === "Completed" && (
                              <p className="mt-1.5 text-[11px]" style={{ color: muted }}>
                                All {MANDATORY_DOCUMENTS.length} mandatory project documents must be added before this project can be completed.
                              </p>
                            )}
                        </>
                      ) : (
                        <input
                          type={f.type === "number" ? "number" : "text"}
                          min={f.key === "voumetric" ? 0 : undefined}
                          readOnly={f.readOnly}
                          required={f.required}
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
                  {([
                    ["Project Overview", "projectOverview"],
                    ["In Scope", "inScope"],
                    ["Out of Scope", "outOfScope"],
                    ["Assumptions", "assumption"],
                  ] as const).map(([label, key]) => (
                    <label key={key} className="block mb-4">
                      <span className="block text-xs font-semibold mb-1.5" style={{ color: text }}>
                        {label}
                      </span>
                      <textarea
                        value={form[key]}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        rows={3}
                        className="w-full rounded-lg border px-3 py-2 text-xs"
                        style={{ background: inputBg, borderColor: border, color: text }}
                      />
                    </label>
                  ))}
                  <p className="text-xs mb-4" style={{ color: muted }}>
                    Select all services this project will use
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_SERVICES.map((s) => {
                      const active = form.services.includes(s)

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
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Changes in the names of fields and keeping redundant keys  */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Planned Start Date", key: "plannedStartDate" },

                    { label: "Planned End Date", key: "plannedEndDate" },

                    { label: "Actual Start Date", key: "actualStartDate" },

                    { label: "Actual End Date", key: "actualEndDate" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: text }}
                      >
                        {f.label}
                        {f.key === "actualEndDate" &&
                          normalizeProjectStatus(form.status) === "Completed" && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                      </label>
                      <input
                        type="date"
                        required={
                          f.key === "actualEndDate" &&
                          normalizeProjectStatus(form.status) === "Completed"
                        }
                        value={(form as any)[f.key]}
                        onChange={(e) =>
                          setForm((fm) => ({ ...fm, [f.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                        style={{
                          background: inputBg,

                          borderColor: border,

                          color: text,
                          colorScheme: dark ? "dark" : "light",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className="text-xs font-semibold"
                        style={{ color: text }}
                      >
                        Project Resources
                      </h3>
                      <p className="text-[10px] mt-1" style={{ color: muted }}>
                        Add project resources.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,

                          resources: [
                            ...current.resources,
                            {
                              resourceName: "",
                              fte: null,
                              roleForProject: "",
                              infrastructureAccess: false,
                            },
                          ],
                        }))
                      }
                      className="px-3 py-2 rounded-lg border text-xs font-semibold"
                      style={{ borderColor: border, color: text }}
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Add Resource
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[680px]">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_40px] items-center gap-3 border-b pb-2 text-xs font-semibold" style={{ borderColor: border, color: muted }}>
                        <span>Resource Name</span>
                        <span>Role for Project</span>
                        <span className="text-center">Infrastructure Access</span>
                        <span />
                      </div>
                      <div className="divide-y" style={{ borderColor: border }}>
                        {form.resources.map((resource, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_40px] items-center gap-3 py-2"
                          >
                            <input
                              type="text"
                              value={resource.resourceName}
                              onChange={(event) =>
                                setForm((current) => {
                                  const resources = current.resources.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, resourceName: event.target.value }
                                        : item,
                                  )
                                  if (index === resources.length - 1 && event.target.value.trim()) {
                                    resources.push({
                                      resourceName: "",
                                      fte: null,
                                      roleForProject: "",
                                      infrastructureAccess: false,
                                    })
                                  }
                                  return { ...current, resources }
                                })
                              }
                              placeholder="Enter resource name"
                              aria-label={`Resource ${index + 1} name`}
                              className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                              style={{ background: inputBg, borderColor: border, color: text }}
                            />
                            <input
                              type="text"
                              value={resource.roleForProject || ""}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  resources: current.resources.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, roleForProject: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              placeholder="Enter project role"
                              aria-label={`Resource ${index + 1} project role`}
                              className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                              style={{ background: inputBg, borderColor: border, color: text }}
                            />
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={Boolean(resource.infrastructureAccess)}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    resources: current.resources.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, infrastructureAccess: event.target.checked }
                                        : item,
                                    ),
                                  }))
                                }
                                aria-label={`Infrastructure access for resource ${index + 1}`}
                                className="h-4 w-4 accent-blue-700"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  resources: current.resources.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                }))
                              }
                              aria-label={`Remove resource ${index + 1}`}
                              className="p-2 rounded-lg border"
                              style={{ borderColor: border, color: muted }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
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
                    if (step === 0 && !form.name.trim()) {
                      showCloudOrbixAlert(
                        "Project Name is required.",

                        "warning",
                      )

                      return
                    }

                    setStep((s) => s + 1)

                    return
                  }

                  void submitClient()
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
                    {editingClientId ? "Update Project" : "Save Project"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

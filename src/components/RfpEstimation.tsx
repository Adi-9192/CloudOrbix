import { useEffect, useMemo, useState } from "react";
import { normalizeProjectName } from "../../shared/project-name.js";
import {
  Archive,
  ArrowDownToLine,
  Calculator,
  Copy,
  FileSpreadsheet,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";

type ResourceType = "Long Term" | "Standard" | "Moderate" | "Experts";
type ResourceRate = {
  grade: string;
  resourceType: ResourceType;
  dailyRate: number;
};
type CurrencyRate = { currency: string; rateToInr: number };
type ResourceRow = {
  id: string;
  name: string;
  grade: string;
  resourceType: ResourceType;
  allocations: Record<string, number | string>;
  dailyManDays: number | string;
};
type ResourcePlanTab = "monthly" | "daily";
type Estimate = {
  id: number;
  accountName: string;
  year: number;
  currency: string;
  projectType: string;
  projectStatus: string;
  requestFromBy: string;
  requestorEmail: string;
  requestedDate: string;
  region: string;
  cloud: string;
  projectOverview: string;
  assumption: string;
  outOfScope: string;
  inScope: string;
  durationMonths: number;
  durationDays: number;
  allowancePercent: number;
  workingDaysPerMonth: number;
  status: string;
  resources: ResourceRow[];
};
type RatePayload = {
  resourceVersions: Array<{
    year: number;
    created_at: string;
    updated_at: string;
    updated_by: string;
  }>;
  resourceRates: Array<{
    year: number;
    grade: string;
    resource_type: ResourceType;
    daily_rate: number;
  }>;
  currencyVersions: Array<{
    year: number;
    created_at: string;
    updated_at: string;
    updated_by: string;
  }>;
  exchangeRates: Array<{
    year: number;
    currency_pair: string;
    rate_to_inr: number;
  }>;
  resourceTypes: ResourceType[];
  currencies: string[];
  grades?: string[];
  years?: number[];
};
type EstimateCalculation = {
  resourceCosts: Array<{
    id: string;
    total: number;
    missingRate: boolean;
  }>;
  baseCost: number;
  allowanceCost: number;
  grandTotal: number;
  exchangeRate: number;
  selectedTotal: number;
};
export type RfpProjectPrefill = {
  accountName: string;
  revenue: number;
  projectType: string;
  projectStatus: string;
  requestFromBy: string;
  requestorEmail: string;
  requestedDate: string;
  region: string;
  cloud: string;
  projectOverview: string;
  assumption: string;
  outOfScope: string;
  inScope: string;
  initiatedAt: string;
};

const RESOURCE_TYPES: ResourceType[] = [
  "Long Term",
  "Standard",
  "Moderate",
  "Experts",
];
const CURRENCIES = [
  "INR",
  "AED",
  "AUD",
  "CAD",
  "CHF",
  "DKK",
  "EUR",
  "GBP",
  "NOK",
  "SEK",
  "SGD",
  "USD",
];
const FX_CURRENCIES = CURRENCIES.filter((currency) => currency !== "INR");
const fmt = (value: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
const makeId = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);
const blankResource = (): ResourceRow => ({
  id: makeId(),
  name: "",
  grade: "",
  resourceType: "Standard",
  allocations: {},
  dailyManDays: 0,
});
const emptyEstimate = (): Estimate => {
  return {
    id: 0,
    accountName: "",
    year: new Date().getFullYear(),
    currency: "INR",
    projectType: "Std",
    projectStatus: "Tentative",
    requestFromBy: "",
    requestorEmail: "",
    requestedDate: today(),
    region: "",
    cloud: "",
    projectOverview: "",
    assumption: "",
    outOfScope: "",
    inScope: "",
    durationMonths: 3,
    durationDays: 0,
    allowancePercent: 0,
    workingDaysPerMonth: 22,
    status: "Draft",
    resources: [blankResource()],
  };
};

const restoreEstimateDraft = (value: unknown): Estimate => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return emptyEstimate();

  const stored = value as Record<string, unknown>;
  const startMonth = typeof stored.startMonth === "string" ? stored.startMonth : "";
  const endMonth = typeof stored.endMonth === "string" ? stored.endMonth : "";
  const oldStart = new Date(`${startMonth}-01T00:00:00Z`);
  const oldEnd = new Date(`${endMonth}-01T00:00:00Z`);
  const oldMonthCount = startMonth && endMonth && !Number.isNaN(oldStart.getTime()) && !Number.isNaN(oldEnd.getTime())
    ? Math.max(0, (oldEnd.getUTCFullYear() - oldStart.getUTCFullYear()) * 12 + oldEnd.getUTCMonth() - oldStart.getUTCMonth() + 1)
    : 0;
  const hasDurationMonths = Number.isInteger(Number(stored.durationMonths));
  const hasDurationDays = Number.isInteger(Number(stored.durationDays));
  const durationMonths = hasDurationMonths
    ? Number(stored.durationMonths)
    : stored.endMonthHalf && oldMonthCount > 0
      ? oldMonthCount - 1
      : oldMonthCount || 3;
  const durationDays = hasDurationDays
    ? Number(stored.durationDays)
    : stored.endMonthHalf
      ? 15
      : 0;
  const requestedDate = typeof stored.requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(stored.requestedDate)
    ? stored.requestedDate
    : startMonth
      ? `${startMonth}-01`
      : today();
  const anchor = new Date(`${requestedDate.slice(0, 7)}-01T00:00:00Z`);
  const resources = Array.isArray(stored.resources) ? stored.resources.map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const sourceAllocations = row.allocations && typeof row.allocations === "object"
      ? row.allocations as Record<string, number | string>
      : {};
    const allocations: Record<string, number | string> = {};
    for (const [key, fte] of Object.entries(sourceAllocations)) {
      if (/^(month-\d+|days)$/.test(key)) {
        allocations[key] = fte;
        continue;
      }
      if (!/^\d{4}-\d{2}$/.test(key)) continue;
      const month = new Date(`${key}-01T00:00:00Z`);
      const offset = (month.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + month.getUTCMonth() - anchor.getUTCMonth();
      if (stored.endMonthHalf && key === endMonth && durationDays > 0) allocations.days = fte;
      else if (offset >= 0 && offset < durationMonths) allocations[`month-${offset + 1}`] = fte;
    }
    return {
      id: typeof row.id === "string" ? row.id : makeId(),
      name: typeof row.name === "string" ? row.name : "",
      grade: typeof row.grade === "string" ? row.grade : "",
      resourceType: RESOURCE_TYPES.includes(row.resourceType as ResourceType) ? row.resourceType as ResourceType : "Standard",
      allocations,
      dailyManDays: Number(row.dailyManDays ?? (durationDays > 0 && Number(allocations.days || 0) > 0 ? durationDays : 0)),
    };
  }) : emptyEstimate().resources;

  return {
    ...emptyEstimate(),
    ...stored,
    accountName: String(stored.accountName || stored.projectName || ""),
    year: Number(stored.year) || new Date().getFullYear(),
    currency: String(stored.currency || "INR"),
    projectType: String(stored.projectType || "Std"),
    projectStatus: String(stored.projectStatus || "Tentative"),
    requestFromBy: String(stored.requestFromBy || ""),
    requestorEmail: String(stored.requestorEmail || ""),
    requestedDate,
    region: String(stored.region || ""),
    cloud: String(stored.cloud || ""),
    projectOverview: String(stored.projectOverview || ""),
    assumption: String(stored.assumption || ""),
    outOfScope: String(stored.outOfScope || ""),
    inScope: String(stored.inScope || ""),
    durationMonths,
    durationDays,
    allowancePercent: Number(stored.allowancePercent || 0),
    workingDaysPerMonth: Number(stored.workingDaysPerMonth) || 22,
    status: String(stored.status || "Draft"),
    resources,
  } as Estimate;
};

export default function RfpEstimation({
  dark,
  isAdmin,
  userId,
  onMoveToProject,
}: {
  dark: boolean;
  isAdmin: boolean;
  userId: number;
  onMoveToProject: (seed: RfpProjectPrefill) => void;
}) {
  const [section, setSection] = useState<"estimate" | "resources" | "currency">(
    "estimate",
  );
  const [resourcePlanTab, setResourcePlanTab] =
    useState<ResourcePlanTab>("monthly");
  const [estimate, setEstimate] = useState<Estimate>(() => {
    try {
      return restoreEstimateDraft(JSON.parse(sessionStorage.getItem(`clmp-rfp-draft-${userId}`) || "null"));
    } catch {
      return emptyEstimate();
    }
  });
  const [estimates, setEstimates] = useState<
    Array<{
      id: number;
      project_name: string;
      client_name: string;
      year: number;
      status: string;
      project_status: string;
      initiated_at: string | null;
      requested_date: string;
      region: string | null;
      project_type: string | null;
      cloud: string | null;
      request_from_by: string | null;
      requestor_email: string | null;
      project_overview: string | null;
      assumption: string | null;
      out_of_scope: string | null;
      in_scope: string | null;
      grand_total_inr: number;
      updated_at: string;
    }>
  >([]);
  const [ratePayload, setRatePayload] = useState<RatePayload | null>(null);
  const [calculation, setCalculation] = useState<EstimateCalculation | null>(
    null,
  );
  const [resourceYear, setResourceYear] = useState(new Date().getFullYear());
  const [currencyYear, setCurrencyYear] = useState(new Date().getFullYear());
  const [resourceRows, setResourceRows] = useState<
    Array<Record<ResourceType, string> & { grade: string }>
  >([]);
  const [currencyRows, setCurrencyRows] = useState<Record<string, string>>(() =>
    Object.fromEntries(FX_CURRENCIES.map((currency) => [currency, ""])),
  );
  const [gradeSearch, setGradeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const surface = dark ? "#152333" : "#FFFFFF";
  const panel = dark ? "#1C2D3E" : "#F4F7F5";
  const line = dark ? "#34495A" : "#DCE5DF";
  const ink = dark ? "#E6EFEA" : "#141625";
  const muted = dark ? "#9DB0A8" : "#606678";
  const green = "#1E40AF";

  const api = async (path: string, init: RequestInit = {}) => {
    const token = localStorage.getItem("clmp-token");
    const response = await fetch(`/api/rfp${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
    const payload = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json()
      : null;
    if (!response.ok)
      throw new Error(
        payload?.message || "The request could not be completed.",
      );
    return payload;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cardsResult, projectsResult] = await Promise.allSettled([
        api(isAdmin ? "/rates" : `/rates/options/${estimate.year}?currency=${encodeURIComponent(estimate.currency)}`),
        api("/projects"),
      ]);
      const errors: string[] = [];
      if (cardsResult.status === "fulfilled") {
        const cards = cardsResult.value;
        setRatePayload(
          isAdmin
            ? cards
            : {
                resourceVersions: [],
                resourceRates: [],
                currencyVersions: [],
                exchangeRates: [],
                resourceTypes: cards.resourceTypes,
                currencies: cards.currencies,
                grades: cards.grades,
                years: cards.years,
              },
        );
      } else {
        errors.push(cardsResult.reason instanceof Error ? cardsResult.reason.message : "Unable to load RFP rate data.");
      }
      if (projectsResult.status === "fulfilled") {
        setEstimates(projectsResult.value.projects || []);
      } else {
        errors.push(projectsResult.reason instanceof Error ? projectsResult.reason.message : "Unable to load saved estimates.");
      }
      setError(errors.join(" "));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load RFP workspace.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    let active = true;
    void api(`/rates/options/${estimate.year}?currency=${encodeURIComponent(estimate.currency)}`)
      .then((options) => {
        if (active)
          setRatePayload({
            resourceVersions: [],
            resourceRates: [],
            currencyVersions: [],
            exchangeRates: [],
            resourceTypes: options.resourceTypes,
            currencies: options.currencies,
            grades: options.grades,
            years: options.years,
          });
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load grade options.",
          );
      });
    return () => {
      active = false;
    };
  }, [estimate.currency, estimate.year, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const validForCalculation =
      estimate.accountName.trim() &&
      estimate.resources.every(
        (resource) => resource.name.trim() && resource.grade,
      );
    if (!validForCalculation) {
      setCalculation(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void api("/calculate", {
        method: "POST",
        body: JSON.stringify(estimate),
        signal: controller.signal,
      })
        .then((result) => setCalculation(result))
        .catch((reason) => {
          if (reason?.name !== "AbortError")
            setError(
              reason instanceof Error
                ? reason.message
                : "Unable to calculate the estimate.",
            );
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [estimate, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const entries = (ratePayload?.resourceRates || []).filter(
      (row) => Number(row.year) === resourceYear,
    );
    const byGrade = new Map<
      string,
      Record<ResourceType, string> & { grade: string }
    >();
    entries.forEach((row) => {
      const item = byGrade.get(row.grade) || {
        grade: row.grade,
        "Long Term": "",
        Standard: "",
        Moderate: "",
        Experts: "",
      };
      item[row.resource_type] = String(row.daily_rate);
      byGrade.set(row.grade, item);
    });
    setResourceRows([...byGrade.values()]);
  }, [isAdmin, ratePayload, resourceYear]);

  useEffect(() => {
    if (!isAdmin) return;
    const entries = (ratePayload?.exchangeRates || []).filter(
      (row) => Number(row.year) === currencyYear,
    );
    setCurrencyRows(
      Object.fromEntries(
        FX_CURRENCIES.map((currency) => [
          currency,
          String(
            entries.find((row) => row.currency_pair === `${currency}/INR`)
              ?.rate_to_inr ?? "",
          ),
        ]),
      ),
    );
  }, [isAdmin, ratePayload, currencyYear]);

  const periods = useMemo(() => {
    return Array.from(
      { length: Math.max(0, Math.min(120, Number(estimate.durationMonths) || 0)) },
      (_, index) => ({ key: `month-${index + 1}`, label: `Month ${index + 1}`, days: null as number | null }),
    );
  }, [estimate.durationMonths]);

  useEffect(() => {
    if (resourcePlanTab === "monthly" && estimate.durationMonths === 0 && estimate.durationDays > 0) {
      setResourcePlanTab("daily");
    } else if (resourcePlanTab === "daily" && estimate.durationDays === 0 && estimate.durationMonths > 0) {
      setResourcePlanTab("monthly");
    }
  }, [estimate.durationDays, estimate.durationMonths, resourcePlanTab]);

  const rateLookup = useMemo(
    () =>
      new Map(
        (ratePayload?.resourceRates || [])
          .filter((row) => Number(row.year) === Number(estimate.year))
          .map((row) => [
            `${row.grade}|${row.resource_type}`,
            Number(row.daily_rate),
          ]),
      ),
    [estimate.year, ratePayload],
  );
  const yearlyExchange = useMemo(
    () =>
      new Map(
        (ratePayload?.exchangeRates || [])
          .filter((row) => Number(row.year) === Number(estimate.year))
          .map((row) => [row.currency_pair, Number(row.rate_to_inr)]),
      ),
    [estimate.year, ratePayload],
  );
  const resourceCosts = estimate.resources.map((resource) => {
    const dailyRate =
      rateLookup.get(`${resource.grade}|${resource.resourceType}`) || 0;
    const monthlyCost = periods.reduce(
      (sum, period) =>
        sum +
        dailyRate *
          Number(estimate.workingDaysPerMonth || 0) *
          Number(resource.allocations[period.key] || 0),
      0,
    );
    const dailyCost =
      estimate.durationDays > 0
        ? dailyRate *
          Number(resource.dailyManDays || 0) *
          Number(resource.allocations.days || 0)
        : 0;
    const byPeriod = Object.fromEntries(
      periods.map((period) => [
        period.key,
        dailyRate * Number(estimate.workingDaysPerMonth || 0) * Number(resource.allocations[period.key] || 0),
      ]),
    );
    const total = monthlyCost + dailyCost;
    return {
      id: resource.id,
      byPeriod,
      total,
      missingRate: Boolean(
        resource.grade &&
        !rateLookup.has(`${resource.grade}|${resource.resourceType}`),
      ),
    };
  });
  const localBaseCost = resourceCosts.reduce((sum, row) => sum + row.total, 0);
  const localAllowanceCost = (localBaseCost * Number(estimate.allowancePercent || 0)) / 100;
  const baseCost = isAdmin ? localBaseCost : calculation?.baseCost || 0;
  const allowanceCost = isAdmin
    ? localAllowanceCost
    : calculation?.allowanceCost || 0;
  const grandTotal = baseCost + allowanceCost;
  const exchangeRate = isAdmin
    ? estimate.currency === "INR"
      ? 1
      : yearlyExchange.get(`${estimate.currency}/INR`) || 0
    : calculation?.exchangeRate || 0;
  const selectedTotal = isAdmin
    ? exchangeRate
      ? grandTotal / exchangeRate
      : 0
    : calculation?.selectedTotal || 0;
  const gradeOptions = isAdmin
    ? [
        ...new Set(
          (ratePayload?.resourceRates || [])
            .filter((row) => Number(row.year) === Number(estimate.year))
            .map((row) => row.grade),
        ),
      ].sort()
    : ratePayload?.grades || [];

  const patchEstimate = (patch: Partial<Estimate>) =>
    setEstimate((current) => ({ ...current, ...patch }));
  const patchResource = (id: string, patch: Partial<ResourceRow>) =>
    setEstimate((current) => ({
      ...current,
      resources: current.resources.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));
  const setAllocation = (resource: ResourceRow, month: string, fte: string) =>
    patchResource(resource.id, {
      allocations: { ...resource.allocations, [month]: fte },
    });
  const updateRateCell = (index: number, key: string, value: string) =>
    setResourceRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );

  const saveResourceRates = async (cloneFrom?: number) => {
    if (
      !cloneFrom &&
      resourceRows.some(
        (row) =>
          !row.grade.trim() ||
          RESOURCE_TYPES.some((type) => row[type].trim() === ""),
      )
    ) {
      setError(
        "Complete every grade and daily rate before saving the version.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (cloneFrom)
        await api(`/rates/resource/${resourceYear}/clone`, {
          method: "POST",
          body: JSON.stringify({ sourceYear: cloneFrom }),
        });
      else
        await api(`/rates/resource/${resourceYear}`, {
          method: "POST",
          body: JSON.stringify({
            rates: resourceRows.flatMap((row) =>
              RESOURCE_TYPES.map((resourceType) => ({
                grade: row.grade,
                resourceType,
                dailyRate: Number(row[resourceType]),
              })),
            ),
          }),
        });
      await loadAll();
      setMessage(`Resource rates for ${resourceYear} saved.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save resource rates.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveCurrencyRates = async (cloneFrom?: number) => {
    if (
      !cloneFrom &&
      FX_CURRENCIES.some((currency) => !currencyRows[currency]?.trim())
    ) {
      setError("Enter every exchange rate before saving the version.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (cloneFrom)
        await api(`/rates/currency/${currencyYear}/clone`, {
          method: "POST",
          body: JSON.stringify({ sourceYear: cloneFrom }),
        });
      else
        await api(`/rates/currency/${currencyYear}`, {
          method: "POST",
          body: JSON.stringify({
            rates: FX_CURRENCIES.map((currency) => ({
              currency,
              rateToInr: Number(currencyRows[currency]),
            })),
          }),
        });
      await loadAll();
      setMessage(`Exchange rates for ${currencyYear} saved.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save exchange rates.",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteVersion = async (kind: "resource" | "currency", year: number) => {
    if (
      !window.confirm(
        `Delete the ${year} ${kind === "resource" ? "resource rate" : "exchange rate"} version?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/rates/${kind}/${year}`, { method: "DELETE" });
      await loadAll();
      setMessage(`${year} version deleted.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to delete the selected version.",
      );
    } finally {
      setBusy(false);
    }
  };

  const loadEstimate = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      const result = await api(`/projects/${id}`);
      const project = result.project;
      sessionStorage.removeItem(`clmp-rfp-draft-${userId}`);
      setEstimate({
        id: project.id,
        accountName: project.project_name,
        year: Number(project.year),
        currency: project.currency_code,
        projectType: project.project_type || "Std",
        projectStatus: project.project_status || "Tentative",
        requestFromBy: project.request_from_by || "",
        requestorEmail: project.requestor_email || "",
        requestedDate: new Date(project.requested_date).toISOString().slice(0, 10),
        region: project.region || "",
        cloud: project.cloud || "",
        projectOverview: project.project_overview || "",
        assumption: project.assumption || "",
        outOfScope: project.out_of_scope || "",
        inScope: project.in_scope || "",
        durationMonths: Number(project.duration_months || 0),
        durationDays: Number(project.duration_days || 0),
        allowancePercent: Number(project.allowance_percent || 0),
        workingDaysPerMonth: Number(project.working_days_per_month),
        status: project.status,
        resources: result.resources.map((row: ResourceRow) => ({
          ...row,
          id: String(row.id),
          dailyManDays: Number(row.dailyManDays || 0),
        })),
      });
      setResourcePlanTab(Number(project.durationMonths || 0) > 0 ? "monthly" : "daily");
      setSection("estimate");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to open estimate.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveEstimate = async (status: "Draft" | "Submitted" = "Draft") => {
    if (status === "Draft") {
      sessionStorage.setItem(
        `clmp-rfp-draft-${userId}`,
        JSON.stringify(estimate),
      );
      setMessage(
        "Draft saved for this session. It is not submitted for approval.",
      );
      setError("");
      return;
    }
    const durationMonths = Number(estimate.durationMonths);
    const durationDays = Number(estimate.durationDays);
    if (
      !Number.isInteger(durationMonths) ||
      durationMonths < 0 ||
      durationMonths > 120 ||
      !Number.isInteger(durationDays) ||
      durationDays < 0 ||
      durationDays > 30 ||
      (durationMonths === 0 && durationDays === 0)
    ) {
      setError("Enter at least one month, or a duration of 1 to 30 days.");
      return;
    }
    if (
      durationDays > 0 &&
      estimate.resources.some(
        (resource) => Number(resource.dailyManDays || 0) > durationDays,
      )
    ) {
      setError("A resource's man-days cannot exceed the project duration in days.");
      return;
    }
    if (
      (durationMonths > 0 &&
        periods.some(
          (period) =>
            !estimate.resources.some(
              (resource) => Number(resource.allocations[period.key] || 0) > 0,
            ),
        )) ||
      (durationDays > 0 &&
        !estimate.resources.some(
          (resource) =>
            Number(resource.dailyManDays || 0) > 0 &&
            Number(resource.allocations.days || 0) > 0,
        ))
    ) {
      setError(
        "Enter resource allocations for every project month and complete the daily plan when the duration includes days.",
      );
      return;
    }
    const normalizedName = normalizeProjectName(estimate.accountName);
    if (
      normalizedName &&
      estimates.some(
        (project) =>
          project.id !== estimate.id &&
          normalizeProjectName(project.project_name) === normalizedName,
      )
    ) {
      setError("An RFP estimate with this name already exists. Enter a unique project name.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = {
        ...estimate,
        accountName: estimate.accountName,
        durationMonths,
        durationDays,
        status,
        resources: estimate.resources.map(({ name, grade, resourceType, allocations, dailyManDays }) => ({
          name,
          grade,
          resourceType,
          allocations,
          dailyManDays: durationDays > 0 ? dailyManDays : 0,
        })),
      };
      const result = await api(
        estimate.id ? `/projects/${estimate.id}` : "/projects",
        { method: estimate.id ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      if (result.pending) {
        setEstimate((current) => ({ ...current, status: "Pending approval" }));
        sessionStorage.removeItem(`clmp-rfp-draft-${userId}`);
        setMessage("Estimate submitted for administrator approval.");
      } else {
        setEstimate((current) => ({ ...current, id: result.id, status }));
        setMessage("Estimate saved.");
      }
      const projects = await api("/projects");
      setEstimates(projects.projects || []);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save estimate.",
      );
    } finally {
      setBusy(false);
    }
  };

  const duplicateEstimate = async () => {
    if (!estimate.id) {
      setError("Save this estimate before duplicating it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api(`/projects/${estimate.id}/duplicate`, {
        method: "POST",
      });
      if (result.pending) {
        setMessage("Duplicate estimate submitted for administrator approval.");
      } else {
        await loadAll();
        await loadEstimate(result.id);
        setMessage("Estimate duplicated.");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to duplicate estimate.",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteEstimate = async (id: number) => {
    const action = isAdmin
      ? "delete this estimate"
      : "request deletion of this estimate";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(`/projects/${id}`, { method: "DELETE" });
      if (result.pending)
        setMessage("Delete request submitted for administrator approval.");
      else setMessage("Estimate deleted.");
      const projects = await api("/projects");
      setEstimates(projects.projects || []);
      if (!result.pending && estimate.id === id) setEstimate(emptyEstimate());
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete estimate.",
      );
    } finally {
      setBusy(false);
    }
  };

  const exportExcel = async () => {
    if (!estimate.id) {
      setError("Save the estimate before exporting it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = localStorage.getItem("clmp-token");
      const response = await fetch(
        `/api/rfp/projects/${estimate.id}/export.xlsx`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error("Excel export could not be generated.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rfp-estimate-${estimate.id}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to export estimate.",
      );
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded border px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-700/20";
  const inputStyle = {
    background: dark ? "#10202E" : "#FFFFFF",
    borderColor: line,
    color: ink,
  };
  const labelStyle = { color: muted };
  const yearChoices = [
    ...new Set([
      ...(ratePayload?.resourceVersions || []).map((row) => Number(row.year)),
      ...(ratePayload?.currencyVersions || []).map((row) => Number(row.year)),
      new Date().getFullYear(),
      resourceYear,
      currencyYear,
    ]),
  ].sort((a, b) => b - a);
  const estimateYearOptions = useMemo(() => {
    if (!isAdmin) return ratePayload?.years || [];
    const resourceYears = new Set(
      (ratePayload?.resourceRates || []).map((row) => Number(row.year)),
    );
    const exchangeYears = new Set(
      (ratePayload?.exchangeRates || [])
        .filter((row) => row.currency_pair === `${estimate.currency}/INR`)
        .map((row) => Number(row.year)),
    );
    return [...resourceYears]
      .filter((year) => estimate.currency === "INR" || exchangeYears.has(year))
      .sort((a, b) => b - a);
  }, [estimate.currency, isAdmin, ratePayload]);

  useEffect(() => {
    if (
      estimateYearOptions.length &&
      !estimateYearOptions.includes(Number(estimate.year))
    ) {
      patchEstimate({ year: estimateYearOptions[0] });
    }
  }, [estimate.year, estimateYearOptions]);

  return (
    <div className="rfp-page min-h-full" style={{ color: ink }}>
      <div
        className="rfp-toolbar sticky top-0 z-20 border-b px-5 py-3 md:px-8"
        style={{ background: surface, borderColor: line }}
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md text-white"
              style={{ background: green }}
            >
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: muted }}
              >
                PMO / Commercial
              </div>
              <h1 className="text-lg font-bold">RFP Estimation</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {section === "estimate" && (
              <>
                <button
                  onClick={() => void exportExcel()}
                  disabled={busy}
                  className="rfp-action"
                >
                  <FileSpreadsheet size={15} /> Excel
                </button>
                <button onClick={() => void saveEstimate("Draft")} disabled={busy} className="rfp-action"><Save size={15} /> Save Draft</button>
                <button onClick={() => void saveEstimate("Submitted")} disabled={busy} className="rfp-primary"><Send size={15} /> {isAdmin ? "Submit" : "Submit for approval"}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-8 md:py-7">
        <div className="mb-5 flex gap-1 border-b" style={{ borderColor: line }} role="tablist" aria-label="RFP sections">
          {([{ id: "estimate", label: "Project Estimation", icon: FileSpreadsheet }, { id: "resources", label: "Resource Rate Card", icon: Users }, { id: "currency", label: "Currency Exchange", icon: Archive }] as const).filter(({ id }) => isAdmin || id === "estimate").map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={section === id} onClick={() => { setSection(id); setError(""); setMessage(""); }} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${section === id ? "border-emerald-700" : "border-transparent"}`} style={{ color: section === id ? green : muted }}><Icon size={16} />{label}</button>)}
        </div>
        {error && <div role="alert" className="mb-4 flex items-center justify-between rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
        {message && <div role="status" className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>}
        {loading ? <div className="py-20 text-center text-sm" style={{ color: muted }}>Loading estimation workspace…</div> : <>
        {section === "resources" && isAdmin && <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Commercial configuration</div><h2 className="mt-1 text-xl font-bold">Resource Rate Card</h2><p className="mt-1 text-sm" style={{ color: muted }}>INR daily billing rates by grade and delivery model.</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-semibold" style={labelStyle}>Rate year<select className={`${inputClass} mt-1 min-w-28`} style={inputStyle} value={resourceYear} onChange={(event) => setResourceYear(Number(event.target.value))}>{yearChoices.map((year) => <option key={year}>{year}</option>)}</select></label><button className="rfp-action" onClick={() => {
                        const newYear =
                          Math.max(new Date().getFullYear(), ...yearChoices) +
                          1;
                        setResourceYear(newYear);
                        setResourceRows([]);
                      }}
                    >
                      <Plus size={15} /> Add Year
                    </button>
                    <button
                      className="rfp-action"
                      disabled={busy || !ratePayload?.resourceVersions.length}
                      onClick={() => {
                        const previous = ratePayload?.resourceVersions
                          .filter((item) => item.year < resourceYear)
                          .sort((a, b) => b.year - a.year)[0];
                        if (previous) void saveResourceRates(previous.year);
                      }}
                    >
                      <Copy size={15} /> Clone Previous
                    </button>
                    <button
                      className="rfp-primary"
                      disabled={busy}
                      onClick={() => void saveResourceRates()}
                    >
                      <Save size={15} /> Save Version
                    </button>
                  </div>
                </div>
                <div
                  className="overflow-x-auto rounded-md border"
                  style={{ borderColor: line, background: surface }}
                >
                  <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                    <thead>
                      <tr style={{ background: panel }}>
                        <th
                          className="p-3 text-xs uppercase"
                          style={{ color: muted }}
                        >
                          Grade
                        </th>
                        {RESOURCE_TYPES.map((type) => (
                          <th
                            key={type}
                            className="p-3 text-xs uppercase"
                            style={{ color: muted }}
                          >
                            {type} · INR/day
                          </th>
                        ))}
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {resourceRows
                        .filter((row) =>
                          row.grade
                            .toLowerCase()
                            .includes(gradeSearch.toLowerCase()),
                        )
                        .map((row) => {
                          const index = resourceRows.indexOf(row);
                          return (
                            <tr
                              key={`${row.grade}-${index}`}
                              className="border-t"
                              style={{ borderColor: line }}
                            >
                              <td className="p-2">
                                <input
                                  aria-label="Grade"
                                  className={inputClass}
                                  style={inputStyle}
                                  value={row.grade}
                                  onChange={(event) =>
                                    updateRateCell(
                                      index,
                                      "grade",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="C1"
                                />
                              </td>
                              {RESOURCE_TYPES.map((type) => (
                                <td key={type} className="p-2">
                                  <input
                                    aria-label={`${row.grade || "New grade"} ${type} daily rate`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={inputClass}
                                    style={inputStyle}
                                    value={row[type]}
                                    onChange={(event) =>
                                      updateRateCell(
                                        index,
                                        type,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="0.00"
                                  />
                                </td>
                              ))}
                              <td className="p-2">
                                <button
                                  className="rfp-icon-action text-red-600"
                                  aria-label="Delete grade row"
                                  onClick={() =>
                                    setResourceRows((current) =>
                                      current.filter(
                                        (_, rowIndex) => rowIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    className="rfp-action"
                    onClick={() =>
                      setResourceRows((rows) => [
                        ...rows,
                        {
                          grade: "",
                          "Long Term": "",
                          Standard: "",
                          Moderate: "",
                          Experts: "",
                        },
                      ])
                    }
                  >
                    <Plus size={15} /> Add Grade
                  </button>
                  <div className="flex items-center gap-2">
                    <Search size={15} style={{ color: muted }} />
                    <input
                      className={`${inputClass} max-w-56`}
                      style={inputStyle}
                      value={gradeSearch}
                      onChange={(event) => setGradeSearch(event.target.value)}
                      placeholder="Search grade"
                    />
                  </div>
                </div>
                <div
                  className="flex flex-wrap items-center justify-between border-t pt-4 text-xs"
                  style={{ borderColor: line, color: muted }}
                >
                  <span>Version audit</span>
                  {ratePayload?.resourceVersions.find(
                    (version) => version.year === resourceYear,
                  ) ? (
                    <span>
                      Updated{" "}
                      {new Date(
                        ratePayload.resourceVersions.find(
                          (version) => version.year === resourceYear,
                        )!.updated_at,
                      ).toLocaleString()}{" "}
                      by{" "}
                      {ratePayload.resourceVersions.find(
                        (version) => version.year === resourceYear,
                      )!.updated_by || "Admin"}
                    </span>
                  ) : (
                    <span>Unsaved year version</span>
                  )}
                  <button
                    className="text-red-700 disabled:opacity-40"
                    disabled={
                      !ratePayload?.resourceVersions.some(
                        (version) => version.year === resourceYear,
                      )
                    }
                    onClick={() => void deleteVersion("resource", resourceYear)}
                  >
                    Delete version
                  </button>
                </div>
              </section>
            }

            {section === "currency" && isAdmin && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: muted }}
                    >
                      Commercial configuration
                    </div>
                    <h2 className="mt-1 text-xl font-bold">
                      Currency Exchange Rate Card
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: muted }}>
                      INR equivalent for one unit of the selected currency.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-semibold" style={labelStyle}>
                      Rate year
                      <select
                        className={`${inputClass} mt-1 min-w-28`}
                        style={inputStyle}
                        value={currencyYear}
                        onChange={(event) =>
                          setCurrencyYear(Number(event.target.value))
                        }
                      >
                        {yearChoices.map((year) => (
                          <option key={year}>{year}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="rfp-action"
                      onClick={() => {
                        const newYear =
                          Math.max(new Date().getFullYear(), ...yearChoices) +
                          1;
                        setCurrencyYear(newYear);
                        setCurrencyRows(
                          Object.fromEntries(
                            FX_CURRENCIES.map((currency) => [currency, ""]),
                          ),
                        );
                      }}
                    >
                      <Plus size={15} /> Add Year
                    </button>
                    <button
                      className="rfp-action"
                      disabled={busy || !ratePayload?.currencyVersions.length}
                      onClick={() => {
                        const previous = ratePayload?.currencyVersions
                          .filter((item) => item.year < currencyYear)
                          .sort((a, b) => b.year - a.year)[0];
                        if (previous) void saveCurrencyRates(previous.year);
                      }}
                    >
                      <Copy size={15} /> Copy Previous
                    </button>
                    <button
                      className="rfp-primary"
                      disabled={busy}
                      onClick={() => void saveCurrencyRates()}
                    >
                      <Save size={15} /> Save Version
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {FX_CURRENCIES.map((currency) => (
                    <label
                      key={currency}
                      className="rounded-md border p-4"
                      style={{ background: surface, borderColor: line }}
                    >
                      <span
                        className="text-xs font-semibold uppercase"
                        style={{ color: muted }}
                      >
                        {currency}/INR
                      </span>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm" style={{ color: muted }}>
                          ₹
                        </span>
                        <input
                          aria-label={`${currency} to INR`}
                          type="number"
                          min="0.000001"
                          step="0.000001"
                          className={inputClass}
                          style={inputStyle}
                          value={currencyRows[currency] || ""}
                          onChange={(event) =>
                            setCurrencyRows((current) => ({
                              ...current,
                              [currency]: event.target.value,
                            }))
                          }
                          placeholder="0.000000"
                        />
                      </div>
                    </label>
                  ))}
                </div>
                <div
                  className="flex flex-wrap items-center justify-between border-t pt-4 text-xs"
                  style={{ borderColor: line, color: muted }}
                >
                  <span>Version audit</span>
                  {ratePayload?.currencyVersions.find(
                    (version) => version.year === currencyYear,
                  ) ? (
                    <span>
                      Updated{" "}
                      {new Date(
                        ratePayload.currencyVersions.find(
                          (version) => version.year === currencyYear,
                        )!.updated_at,
                      ).toLocaleString()}{" "}
                      by{" "}
                      {ratePayload.currencyVersions.find(
                        (version) => version.year === currencyYear,
                      )!.updated_by || "Admin"}
                    </span>
                  ) : (
                    <span>Unsaved year version</span>
                  )}
                  <button
                    className="text-red-700 disabled:opacity-40"
                    disabled={
                      !ratePayload?.currencyVersions.some(
                        (version) => version.year === currencyYear,
                      )
                    }
                    onClick={() => void deleteVersion("currency", currencyYear)}
                  >
                    Delete version
                  </button>
                </div>
              </section>
            )}

            {section === "estimate" && (
              <div className="space-y-5">
                <section className="rounded-md border p-4 md:p-5" style={{ background: surface, borderColor: line }}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div><h2 className="text-base font-bold">Project information</h2><p className="mt-1 text-xs" style={{ color: muted }}>Estimate {estimate.id ? `#${estimate.id}` : "not saved"} · {estimate.status}</p></div>
                    <div className="flex gap-2">
                      <button className="rfp-action" onClick={() => { sessionStorage.removeItem(`clmp-rfp-draft-${userId}`); setEstimate(emptyEstimate()); setError(""); setMessage(""); }}><Plus size={15} /> New estimate</button>
                      {estimate.id > 0 && <button className="rfp-action" onClick={() => void duplicateEstimate()}><Copy size={15} /> Duplicate</button>}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="text-xs font-semibold" style={labelStyle}>Account Name<input className={`${inputClass} mt-1`} style={inputStyle} value={estimate.accountName} onChange={(event) => patchEstimate({ accountName: event.target.value })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Project Type<select className={`${inputClass} mt-1`} style={inputStyle} value={estimate.projectType} onChange={(event) => patchEstimate({ projectType: event.target.value })}><option>Std</option><option>Non Std</option></select></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Status<select className={`${inputClass} mt-1`} style={inputStyle} value={estimate.projectStatus} onChange={(event) => patchEstimate({ projectStatus: event.target.value })}>{["Tentative", "Completed", "Project Initiated", "Cancelled", "In Discussion", "Firm"].map((status) => <option key={status}>{status}</option>)}</select></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Request From/By<input className={`${inputClass} mt-1`} style={inputStyle} value={estimate.requestFromBy} onChange={(event) => patchEstimate({ requestFromBy: event.target.value })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Requestor Email ID (optional)<input type="email" className={`${inputClass} mt-1`} style={inputStyle} value={estimate.requestorEmail} onChange={(event) => patchEstimate({ requestorEmail: event.target.value })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Requested Date<input type="date" className={`${inputClass} mt-1`} style={inputStyle} value={estimate.requestedDate} onChange={(event) => patchEstimate({ requestedDate: event.target.value })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Region<input className={`${inputClass} mt-1`} style={inputStyle} value={estimate.region} onChange={(event) => patchEstimate({ region: event.target.value })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Cloud<select className={`${inputClass} mt-1`} style={inputStyle} value={estimate.cloud} onChange={(event) => patchEstimate({ cloud: event.target.value })}><option value="">Select</option><option value="aws">AWS</option><option value="azure">Azure</option><option value="gcp">GCP</option><option value="multi cloud">Multi Cloud</option></select></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Year<select className={`${inputClass} mt-1`} style={inputStyle} value={estimateYearOptions.includes(Number(estimate.year)) ? estimate.year : ""} onChange={(event) => { if (event.target.value) patchEstimate({ year: Number(event.target.value) }); }}><option value="" disabled>{estimateYearOptions.length ? "Select year" : "No configured rate years"}</option>{estimateYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Currency<select className={`${inputClass} mt-1`} style={inputStyle} value={estimate.currency} onChange={(event) => patchEstimate({ currency: event.target.value })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Number of Months<input type="number" min="0" max="120" className={`${inputClass} mt-1`} style={inputStyle} value={estimate.durationMonths} onChange={(event) => patchEstimate({ durationMonths: Number(event.target.value) })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Number of Days<input type="number" min="0" max="30" className={`${inputClass} mt-1`} style={inputStyle} value={estimate.durationDays} onChange={(event) => patchEstimate({ durationDays: Number(event.target.value) })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Allowance %<input type="number" min="0" max="100" step="0.1" className={`${inputClass} mt-1`} style={inputStyle} value={estimate.allowancePercent} onChange={(event) => patchEstimate({ allowancePercent: Number(event.target.value) })} /></label>
                    <label className="text-xs font-semibold" style={labelStyle}>Working Days / Month<input type="number" min="1" max="31" step="0.5" className={`${inputClass} mt-1`} style={inputStyle} value={estimate.workingDaysPerMonth} onChange={(event) => patchEstimate({ workingDaysPerMonth: Number(event.target.value) })} /></label>
                    {([
                      ["Project Overview", "projectOverview"],
                      ["Assumption", "assumption"],
                      ["Out of Scope", "outOfScope"],
                      ["In Scope", "inScope"],
                    ] as const).map(([label, key]) => <label key={key} className="text-xs font-semibold sm:col-span-2" style={labelStyle}>{label}<textarea className={`${inputClass} mt-1 min-h-20 resize-y`} style={inputStyle} value={estimate[key]} onChange={(event) => patchEstimate({ [key]: event.target.value })} /></label>)}
                  </div>
                </section>

                <section
                  className="rounded-md border"
                  style={{ background: surface, borderColor: line }}
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4"
                    style={{ borderColor: line }}
                  >
                    <div>
                      <h2 className="text-base font-bold">
                        {resourcePlanTab === "monthly"
                          ? "Monthly resource plan"
                          : "Daily resource plan"}
                      </h2>
                      <p className="mt-1 text-xs" style={{ color: muted }}>
                        {resourcePlanTab === "monthly"
                          ? `${periods.length} monthly allocation periods`
                          : `${estimate.durationDays} project days · daily effort is Man Days × FTE`} · rates automatically use{" "}
                        {estimate.year} version
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {estimate.durationMonths > 0 && (
                        <button
                          type="button"
                          className={resourcePlanTab === "monthly" ? "rfp-primary" : "rfp-action"}
                          aria-pressed={resourcePlanTab === "monthly"}
                          onClick={() => setResourcePlanTab("monthly")}
                        >
                          Monthly
                        </button>
                      )}
                      {estimate.durationDays > 0 && (
                        <button
                          type="button"
                          className={resourcePlanTab === "daily" ? "rfp-primary" : "rfp-action"}
                          aria-pressed={resourcePlanTab === "daily"}
                          onClick={() => setResourcePlanTab("daily")}
                        >
                          Daily
                        </button>
                      )}
                      <button
                        className="rfp-action"
                        onClick={() =>
                          setEstimate((current) => ({
                            ...current,
                            resources: [...current.resources, blankResource()],
                          }))
                        }
                      >
                        <Plus size={15} /> Add Resource
                      </button>
                    </div>
                  </div>
                  {resourcePlanTab === "monthly" && estimate.durationMonths > 0 && (
                  <div className="rfp-grid-scroll overflow-auto">
                    <table className="rfp-grid w-full border-collapse text-left text-xs">
                      <thead>
                        <tr style={{ background: panel }}>
                          <th className="rfp-sticky-1 min-w-52 p-3">
                            Resource Name
                          </th>
                          <th className="rfp-sticky-2 min-w-28 p-3">Grade</th>
                          <th className="rfp-sticky-3 min-w-36 p-3">
                            Resource Type
                          </th>
                          {periods.map((period) => (
                            <th
                              key={period.key}
                              className="min-w-24 border-l p-2 text-center"
                              style={{ borderColor: line }}
                            >
                              {period.label}
                            </th>
                          ))}
                          <th
                            className="min-w-36 border-l p-3 text-right"
                            style={{ borderColor: line }}
                          >
                            Total Cost (INR)
                          </th>
                          <th className="min-w-20 p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estimate.resources.map((resource, rowIndex) => {
                          const cost = isAdmin
                            ? resourceCosts[rowIndex]
                            : calculation?.resourceCosts.find(
                                (item) => item.id === resource.id,
                              ) || {
                                total: 0,
                                missingRate: false,
                              };
                          return (
                            <tr
                              key={resource.id}
                              className="border-t"
                              style={{ borderColor: line }}
                            >
                              <td className="rfp-sticky-1 p-2">
                                <input
                                  className={inputClass}
                                  style={inputStyle}
                                  value={resource.name}
                                  onChange={(event) =>
                                    patchResource(resource.id, {
                                      name: event.target.value,
                                    })
                                  }
                                  aria-label="Resource name"
                                  placeholder="e.g. Infra Architect"
                                />
                              </td>
                              <td className="rfp-sticky-2 p-2">
                                <select
                                  className={inputClass}
                                  style={inputStyle}
                                  value={resource.grade}
                                  onChange={(event) =>
                                    patchResource(resource.id, {
                                      grade: event.target.value,
                                    })
                                  }
                                  aria-label="Grade"
                                >
                                  <option value="">Select</option>
                                  {gradeOptions.map((grade) => (
                                    <option key={grade}>{grade}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="rfp-sticky-3 p-2">
                                <select
                                  className={inputClass}
                                  style={inputStyle}
                                  value={resource.resourceType}
                                  onChange={(event) =>
                                    patchResource(resource.id, {
                                      resourceType: event.target
                                        .value as ResourceType,
                                    })
                                  }
                                  aria-label="Resource type"
                                >
                                  {RESOURCE_TYPES.map((type) => (
                                    <option key={type}>{type}</option>
                                  ))}
                                </select>
                              </td>
                              {periods.map((period) => (
                                <td
                                  key={period.key}
                                  className="border-l p-2"
                                  style={{ borderColor: line }}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    max="999.99"
                                    step="0.01"
                                    className={`${inputClass} px-1 text-center`}
                                    style={inputStyle}
                                    value={resource.allocations[period.key] ?? 0}
                                    onChange={(event) =>
                                      setAllocation(
                                        resource,
                                        period.key,
                                        event.target.value,
                                      )
                                    }
                                    aria-label={`${period.label} allocation in FTE`}
                                  />
                                </td>
                              ))}
                              <td
                                className="border-l p-3 text-right font-semibold tabular-nums"
                                style={{
                                  color: cost.missingRate ? "#B45309" : ink,
                                  borderColor: line,
                                }}
                                title={
                                  cost.missingRate
                                    ? "No rate exists for this year, grade, and type"
                                    : undefined
                                }
                              >
                                {cost.missingRate
                                  ? "Rate missing"
                                  : fmt(Number(cost.total))}
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    className="rfp-icon-action"
                                    title="Duplicate row"
                                    aria-label="Duplicate resource row"
                                    onClick={() =>
                                      setEstimate((current) => {
                                        const original = current.resources.find(
                                          (item) => item.id === resource.id,
                                        )!;
                                        return {
                                          ...current,
                                          resources: [
                                            ...current.resources.slice(
                                              0,
                                              rowIndex + 1,
                                            ),
                                            {
                                              ...original,
                                              id: makeId(),
                                              allocations: {
                                                ...original.allocations,
                                              },
                                            },
                                            ...current.resources.slice(
                                              rowIndex + 1,
                                            ),
                                          ],
                                        };
                                      })
                                    }
                                  >
                                    <Copy size={14} />
                                  </button>
                                  <button
                                    className="rfp-icon-action text-red-600"
                                    title="Delete row"
                                    aria-label="Delete resource row"
                                    onClick={() =>
                                      setEstimate((current) => ({
                                        ...current,
                                        resources: current.resources.filter(
                                          (item) => item.id !== resource.id,
                                        ),
                                      }))
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr
                          className="border-t font-semibold"
                          style={{ background: panel, borderColor: line }}
                        >
                          <td className="rfp-sticky-1 p-3" colSpan={3}>
                            Total Monthly FTE
                          </td>
                          {periods.map((period) => (
                            <td
                              key={period.key}
                              className="border-l p-3 text-center tabular-nums"
                              style={{ borderColor: line }}
                            >
                              {estimate.resources
                                .reduce(
                                  (sum, row) =>
                                    sum + Number(row.allocations[period.key] || 0),
                                  0,
                                )
                                .toLocaleString("en", {
                                  maximumFractionDigits: 2,
                                })}
                            </td>
                          ))}
                          <td
                            className="border-l p-3 text-right"
                            style={{ borderColor: line }}
                          >
                            {fmt(grandTotal)}
                          </td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  )}
                  {resourcePlanTab === "daily" && estimate.durationDays > 0 && (
                    <div className="rfp-grid-scroll overflow-auto">
                      <table className="rfp-grid w-full border-collapse text-left text-xs">
                        <thead>
                          <tr style={{ background: panel }}>
                            <th className="rfp-sticky-1 min-w-52 p-3">Resource Name</th>
                            <th className="rfp-sticky-2 min-w-28 p-3">Grade</th>
                            <th className="rfp-sticky-3 min-w-36 p-3">Resource Type</th>
                            <th className="min-w-28 border-l p-3 text-center" style={{ borderColor: line }}>Man Days</th>
                            <th className="min-w-28 border-l p-3 text-center" style={{ borderColor: line }}>FTE Effort</th>
                            <th className="min-w-36 border-l p-3 text-center" style={{ borderColor: line }}>Total Effort (Man Days)</th>
                            <th className="min-w-36 border-l p-3 text-right" style={{ borderColor: line }}>Total Cost (INR)</th>
                            <th className="min-w-20 p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimate.resources.map((resource, rowIndex) => {
                            const cost = isAdmin
                              ? resourceCosts[rowIndex]
                              : calculation?.resourceCosts.find((item) => item.id === resource.id) || { total: 0, missingRate: false };
                            return (
                              <tr key={resource.id} className="border-t" style={{ borderColor: line }}>
                                <td className="rfp-sticky-1 p-2">
                                  <input className={inputClass} style={inputStyle} value={resource.name} onChange={(event) => patchResource(resource.id, { name: event.target.value })} aria-label="Resource name" placeholder="e.g. Infra Architect" />
                                </td>
                                <td className="rfp-sticky-2 p-2">
                                  <select className={inputClass} style={inputStyle} value={resource.grade} onChange={(event) => patchResource(resource.id, { grade: event.target.value })} aria-label="Grade">
                                    <option value="">Select</option>
                                    {gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}
                                  </select>
                                </td>
                                <td className="rfp-sticky-3 p-2">
                                  <select className={inputClass} style={inputStyle} value={resource.resourceType} onChange={(event) => patchResource(resource.id, { resourceType: event.target.value as ResourceType })} aria-label="Resource type">
                                    {RESOURCE_TYPES.map((type) => <option key={type}>{type}</option>)}
                                  </select>
                                </td>
                                <td className="border-l p-2" style={{ borderColor: line }}>
                                  <input type="number" min="0" max={estimate.durationDays} step="0.01" className={`${inputClass} px-1 text-center`} style={inputStyle} value={resource.dailyManDays} onChange={(event) => patchResource(resource.id, { dailyManDays: event.target.value })} aria-label="Resource man days" />
                                </td>
                                <td className="border-l p-2" style={{ borderColor: line }}>
                                  <input type="number" min="0" max="999.99" step="0.01" className={`${inputClass} px-1 text-center`} style={inputStyle} value={resource.allocations.days ?? 0} onChange={(event) => setAllocation(resource, "days", event.target.value)} aria-label="Daily FTE effort" />
                                </td>
                                <td className="border-l p-3 text-center tabular-nums" style={{ borderColor: line }}>
                                  {(Number(resource.dailyManDays || 0) * Number(resource.allocations.days || 0)).toLocaleString("en", { maximumFractionDigits: 2 })}
                                </td>
                                <td className="border-l p-3 text-right font-semibold tabular-nums" style={{ color: cost.missingRate ? "#B45309" : ink, borderColor: line }}>
                                  {cost.missingRate ? "Rate missing" : fmt(Number(cost.total))}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    <button className="rfp-icon-action" title="Duplicate row" aria-label="Duplicate resource row" onClick={() => setEstimate((current) => {
                                      const original = current.resources.find((item) => item.id === resource.id)!;
                                      return { ...current, resources: [...current.resources.slice(0, rowIndex + 1), { ...original, id: makeId(), allocations: { ...original.allocations } }, ...current.resources.slice(rowIndex + 1)] };
                                    })}><Copy size={14} /></button>
                                    <button className="rfp-icon-action text-red-600" title="Delete row" aria-label="Delete resource row" onClick={() => setEstimate((current) => ({ ...current, resources: current.resources.filter((item) => item.id !== resource.id) }))}><Trash2 size={14} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t font-semibold" style={{ background: panel, borderColor: line }}>
                            <td className="rfp-sticky-1 p-3" colSpan={5}>Total Daily Effort (Man Days)</td>
                            <td className="border-l p-3 text-center tabular-nums" style={{ borderColor: line }}>
                              {estimate.resources.reduce((sum, resource) => sum + Number(resource.dailyManDays || 0) * Number(resource.allocations.days || 0), 0).toLocaleString("en", { maximumFractionDigits: 2 })}
                            </td>
                            <td className="border-l p-3 text-right" style={{ borderColor: line }}>{fmt(grandTotal)}</td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {periods.length === 0 && estimate.durationDays === 0 && (
                    <div className="p-4 text-sm text-amber-700">
                      Enter a duration of at least one month or one day to generate the planning grid.
                    </div>
                  )}
                  {gradeOptions.length === 0 && (
                    <div
                      className="border-t px-4 py-3 text-xs text-amber-700"
                      style={{ borderColor: line }}
                    >
                      No resource rates are configured for {estimate.year}. Add
                      a version in Resource Rate Card to calculate and save this
                      estimate.
                    </div>
                  )}
                </section>

                <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
                  <div
                    className="rfp-register rounded-md border p-4"
                    style={{ background: surface, borderColor: line }}
                  >
                    <h2 className="text-sm font-bold">Estimate register</h2>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-xs">
                        <thead>
                          <tr style={{ color: muted }}>
                            <th className="py-2">Account Name</th>
                            <th className="py-2">Year</th>
                            <th className="py-2">Status</th>
                            <th className="py-2 text-right">Grand total INR</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {estimates.map((item) => (
                            <tr
                              key={item.id}
                              className="border-t"
                              style={{ borderColor: line }}
                            >
                              <td className="py-2">
                                <button
                                  className="font-semibold hover:underline"
                                  onClick={() => void loadEstimate(item.id)}
                                >
                                  {item.project_name}
                                </button>
                                <div
                                  className="mt-0.5"
                                  style={{ color: muted }}
                                >
                                  {item.client_name}
                                </div>
                              </td>
                              <td>{item.year}</td>
                              <td>{item.project_status}</td>
                              <td className="text-right tabular-nums">
                                {fmt(Number(item.grand_total_inr || 0))}
                              </td>
                              <td className="text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    className="rfp-icon-action"
                                    title="Open estimate"
                                    aria-label="Open estimate"
                                    onClick={() => void loadEstimate(item.id)}
                                  >
                                    <ArrowDownToLine size={14} />
                                  </button>
                                  {item.project_status === "Project Initiated" && (
                                    <button
                                      className="rfp-action"
                                      disabled={!item.initiated_at || busy}
                                      onClick={() => onMoveToProject({
                                        accountName: item.project_name,
                                        revenue: Number(item.grand_total_inr || 0),
                                        projectType: item.project_type || "Std",
                                        projectStatus: item.project_status,
                                        requestFromBy: item.request_from_by || "",
                                        requestorEmail: item.requestor_email || "",
                                        requestedDate: new Date(item.requested_date).toISOString().slice(0, 10),
                                        region: item.region || "",
                                        cloud: item.cloud || "",
                                        projectOverview: item.project_overview || "",
                                        assumption: item.assumption || "",
                                        outOfScope: item.out_of_scope || "",
                                        inScope: item.in_scope || "",
                                        initiatedAt: new Date(item.initiated_at as string).toISOString().slice(0, 10),
                                      })}
                                    >
                                      Move to Project
                                    </button>
                                  )}
                                  <button
                                    className="rfp-icon-action text-red-600"
                                    title={
                                      isAdmin
                                        ? "Delete estimate"
                                        : "Request estimate deletion"
                                    }
                                    aria-label={
                                      isAdmin
                                        ? "Delete estimate"
                                        : "Request estimate deletion"
                                    }
                                    disabled={busy}
                                    onClick={() => void deleteEstimate(item.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!estimates.length && (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-5 text-center"
                                style={{ color: muted }}
                              >
                                No saved estimates yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div
                    className="rounded-md border p-4"
                    style={{ background: surface, borderColor: line }}
                  >
                    <div
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: muted }}
                    >
                      Live cost summary
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span style={{ color: muted }}>Base resource cost</span>
                        <strong>{fmt(baseCost)}</strong>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span style={{ color: muted }}>Allowance</span>
                        <strong>{fmt(allowanceCost)}</strong>
                      </div>
                      <div
                        className="flex justify-between gap-3 border-t pt-3"
                        style={{ borderColor: line }}
                      >
                        <span className="font-semibold">Grand total INR</span>
                        <strong className="text-base">{fmt(grandTotal)}</strong>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span style={{ color: muted }}>
                          {estimate.currency} total
                        </span>
                        <strong>
                          {exchangeRate
                            ? fmt(selectedTotal, estimate.currency)
                            : "Rate not configured"}
                        </strong>
                      </div>
                      <div
                        className="pt-1 text-[11px]"
                        style={{ color: muted }}
                      >
                        {estimate.currency === "INR"
                          ? "INR is the base currency."
                          : exchangeRate
                            ? `1 ${estimate.currency} = ₹${exchangeRate.toLocaleString("en-IN")}`
                            : `Missing ${estimate.year} ${estimate.currency}/INR rate.`}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </>
        }
      </div>
      <style>{`
      .rfp-action,.rfp-primary,.rfp-icon-action{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid ${line};border-radius:4px;background:${surface};color:${ink};padding:8px 11px;font-size:12px;font-weight:600;white-space:nowrap;transition:background .15s ease,border-color .15s ease}
      .rfp-action:hover,.rfp-icon-action:hover{background:${panel};border-color:${dark ? "#6E8B7F" : "#AABDB2"}}
      .rfp-primary{background:${green};border-color:${green};color:#fff}.rfp-primary:hover{background:#10563F}.rfp-action:disabled,.rfp-primary:disabled{opacity:.55;cursor:not-allowed}
      .rfp-icon-action{padding:7px;width:32px;height:32px}
      .rfp-grid-scroll{max-height:min(58vh,680px)}
      .rfp-grid thead{position:sticky;top:0;z-index:5}
      .rfp-grid th,.rfp-grid td{background:${surface}}
      .rfp-grid thead th{background:${panel}}
      .rfp-grid .rfp-sticky-1,.rfp-grid .rfp-sticky-2,.rfp-grid .rfp-sticky-3{position:sticky;z-index:3;background:${surface}}
      .rfp-grid thead .rfp-sticky-1,.rfp-grid thead .rfp-sticky-2,.rfp-grid thead .rfp-sticky-3{z-index:8;background:${panel}}
      .rfp-grid .rfp-sticky-1{left:0}.rfp-grid .rfp-sticky-2{left:208px}.rfp-grid .rfp-sticky-3{left:320px}
      @media(max-width:767px){.rfp-grid-scroll{max-height:62vh}.rfp-grid .rfp-sticky-1{left:0;min-width:176px}.rfp-grid .rfp-sticky-2{left:176px;min-width:100px}.rfp-grid .rfp-sticky-3{left:276px;min-width:132px}}
      @media print{.rfp-toolbar,.rfp-page [role=tablist],.rfp-action,.rfp-primary,.rfp-icon-action,.rfp-register,body:has(.rfp-page) header,body:has(.rfp-page) aside{display:none!important}.rfp-page{color:#14251F!important}.rfp-grid-scroll{max-height:none;overflow:visible}.rfp-grid thead{position:static}.rfp-grid .rfp-sticky-1,.rfp-grid .rfp-sticky-2,.rfp-grid .rfp-sticky-3{position:static}body:has(.rfp-page) main{overflow:visible!important}}
    `}</style>
    </div>
  );
}

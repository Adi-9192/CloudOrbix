import { useEffect, useMemo, useState } from "react";
import {
  Users, Clock, AlertCircle, FolderKanban, AlertTriangle, ShieldAlert, CheckCircle2
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts";
import type { DashboardView } from "./Shell";

interface DashboardProps {
  dark: boolean;
  onNavigate: (p: string, projectStatusFilter?: string) => void;
  user?: { roles: string[] };
  view?: DashboardView;
}

const projectBreakdownOptions = [
  { value: "status", label: "Status" },
  { value: "region", label: "Region" },
  { value: "hyperscaler", label: "Hyperscaler" },
] as const;
const pieColorsByGroup = {
  status: ["#15803D", "#D97706", "#DC2626", "#7C3AED", "#2563EB", "#64748B", "#DB2777", "#0F766E"],
  region: ["#1D4ED8", "#0891B2", "#0F766E", "#65A30D", "#CA8A04", "#EA580C", "#C026D3", "#475569"],
  hyperscaler: ["#2563EB", "#F97316", "#7C3AED", "#059669", "#DB2777", "#64748B", "#CA8A04", "#0F766E"],
};

const CustomTooltip = ({ active, payload, label, dark }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl shadow-xl px-4 py-3 text-xs border" style={{ background: dark ? "#1E293B" : "#fff", borderColor: dark ? "#334155" : "#E2E8F0", color: dark ? "#E2E8F0" : "#0F172A" }}>
      <div className="font-semibold mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({
  dark,
  onNavigate,
  view = "project",
}: DashboardProps) {
  const chartPeriod = "Monthly";
  const [selectedYear, setSelectedYear] = useState("all");
  const [projectGroupBy, setProjectGroupBy] = useState<(typeof projectBreakdownOptions)[number]["value"]>("status");
  const pieColors = pieColorsByGroup[projectGroupBy];
  const [summary, setSummary] = useState({ totalClients: 0, activeProjects: 0, completedProjects: 0, delayedProjectsExternal: 0, delayedProjectsInternal: 0, totalRisks: 0, openRisks: 0 });
  const [projectBreakdown, setProjectBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [rfpBreakdown, setRfpBreakdown] = useState<{ name: string; value: number; revenueInr: number }[]>([]);
  const [dashboardError, setDashboardError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const loadDashboard = () => {
    const token = localStorage.getItem("clmp-token");
    if (!token) return;

    fetch(`/api/dashboard?period=${encodeURIComponent(chartPeriod)}&year=${encodeURIComponent(selectedYear)}&groupBy=${encodeURIComponent(projectGroupBy)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load dashboard data.");
        return payload;
      })
      .then((payload) => {
        setDashboardError("");
        setLastUpdated(new Date());
        setSummary(payload.summary);
        setProjectBreakdown(payload.projectBreakdown || []);
        setRfpBreakdown(payload.rfpBreakdown || []);
      })
      .catch((error) => {
        setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard data.");
      });
  };

  useEffect(() => {
    loadDashboard();
    const refresh = () => loadDashboard();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("cloudorbix-projects-updated", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const refreshInterval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("cloudorbix-projects-updated", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(refreshInterval);
    };
  }, [chartPeriod, selectedYear, projectGroupBy]);

  /* Legacy KPI definitions retained temporarily for reference while the dashboard uses live KPIs.
  const legacyKpiCards = useMemo(() => [
    {
      title: "Total Projects",
      value: String(summary.totalClients),
      change: "+8.3%",
      trend: "up" as const,
      lastUpdated: "8h ago",
      accent: "#1E40AF",
      icon: Users,
      subtitle: "+8 this quarter",
      type: "sparkline",
      data: Array.from({ length: 8 }, (_, index) => ({ label: `W${index + 1}`, value: summary.totalClients - 3 + index * 2 })),
    },
    {
      title: " Projects On-Track",
      value: String(summary.activeClients),
      change: "+5.1%",
      trend: "up" as const,
      lastUpdated: "4h ago",
      accent: "#16A34A",
      icon: UserCheck,
      subtitle: "83.7% of total",
      type: "radial",
      percent: 84,
    },
    {
      title: "Pending Onboarding",
      value: String(summary.pendingOnboarding),
      change: "+2",
      trend: "up" as const,
      lastUpdated: "1h ago",
      accent: "#D97706",
      icon: Clock,
      subtitle: "Next: Sep 1",
      type: "sparkline",
      data: [
        { label: "J", value: 1 }, { label: "F", value: 2 }, { label: "M", value: 3 }, { label: "A", value: 4 }, { label: "M", value: 6 }, { label: "J", value: 7 }, { label: "J", value: 8 }, { label: "A", value: 9 },
      ],
    },
    {
      title: "Upcoming Offboarding",
      value: String(summary.offboardingScheduled),
      change: "-1",
      trend: "down" as const,
      lastUpdated: "2h ago",
      accent: "#DC2626",
      icon: UserMinus,
      subtitle: "Next: Sep 30",
      type: "sparkline",
      data: [
        { label: "J", value: 8 }, { label: "F", value: 7 }, { label: "M", value: 7 }, { label: "A", value: 6 }, { label: "M", value: 5 }, { label: "J", value: 4 }, { label: "J", value: 4 }, { label: "A", value: 4 },
      ],
    },
    {
      title: "Azure Projects",
      value: String(summary.azureClients),
      change: "+12%",
      trend: "up" as const,
      lastUpdated: "6h ago",
      accent: "#0078D4",
      icon: Cloud,
      subtitle: "40.4% of base",
      type: "radial",
      percent: 40,
    },
    {
      title: "AWS Projects",
      value: String(summary.awsClients),
      change: "+7%",
      trend: "up" as const,
      accent: "#FF9900",
      icon: Cloud,
      subtitle: "29.8% of base",
      lastUpdated: "3h ago",
      type: "sparkline",
      data: [
        { label: "J", value: 18 }, { label: "F", value: 19 }, { label: "M", value: 23 }, { label: "A", value: 24 }, { label: "M", value: 25 }, { label: "J", value: 28 }, { label: "J", value: 30 }, { label: "A", value: 31 },
      ],
    },
    {
      title: "Monthly Revenue",
      value: `$${summary.monthlyRevenue.toFixed(1)}M`,
      change: "+8.3%",
      trend: "up" as const,
      lastUpdated: "12h ago",
      accent: "#7C3AED",
      icon: DollarSign,
      subtitle: "vs $2.4M last mo.",
      type: "sparkline",
      data: [
        { label: "J", value: 1.4 }, { label: "F", value: 1.8 }, { label: "M", value: 2.1 }, { label: "A", value: 2.3 }, { label: "M", value: 2.5 }, { label: "J", value: 2.2 }, { label: "J", value: 2.6 }, { label: "A", value: 2.6 },
      ],
    },
    {
      title: "Annual Revenue",
      value: `$${summary.annualRevenue.toFixed(1)}M`,
      change: "+17.3%",
      trend: "up" as const,
      lastUpdated: "1d ago",
      accent: "#1E40AF",
      icon: BarChart2,
      subtitle: "vs $24.8M last yr.",
      type: "sparkline",
      data: [
        { label: "Q1", value: 20 }, { label: "Q2", value: 22 }, { label: "Q3", value: 24 }, { label: "Q4", value: 29 },
      ],
    },
  ], [summary]); */

  const kpiCards = useMemo(() => [
    { title: "Total Projects", value: String(summary.totalClients), subtitle: "Approved project records", accent: "#1E40AF", icon: Users, action: () => onNavigate("projects", "All") },
    { title: "Active Projects", value: String(summary.activeProjects), subtitle: "Approved projects", accent: "#1E40AF", icon: FolderKanban, action: () => onNavigate("projects", "Active") },
    { title: "Completed Projects", value: String(summary.completedProjects), subtitle: "Completed approved projects", accent: "#15803D", icon: CheckCircle2, action: () => onNavigate("projects", "Completed") },
    { title: "Off Track (External)", value: String(summary.delayedProjectsExternal), subtitle: "Externally off-track projects", accent: "#C2410C", icon: AlertTriangle, action: () => onNavigate("projects", "Off Track (External)") },
    { title: "Off Track (Internal)", value: String(summary.delayedProjectsInternal), subtitle: "Internally off-track projects", accent: "#BE185D", icon: Clock, action: () => onNavigate("projects", "Off Track (Internal)") },
    { title: "Total Risks", value: String(summary.totalRisks), subtitle: "All project risks", accent: "#7C3AED", icon: ShieldAlert, action: () => onNavigate("risks") },
    { title: "Open Risks", value: String(summary.openRisks), subtitle: "Risks not completed or cancelled", accent: "#D97706", icon: AlertCircle, action: () => onNavigate("risks") },
  ], [summary, onNavigate]);
  const projectOverviewCards = kpiCards.slice(0, 5);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const pageBg = dark ? "#0F172A" : "#F1F5F9";

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ color: text, background: pageBg }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[25px] font-bold">
            {view === "risk" ? "Risk Dashboard" : view === "rfp" ? "RFP Dashboard" : "Project Dashboard"}
          </h1>
          <p className="mt-0.5 text-[15px]" style={{ color: muted }}>
            {view === "project"
              ? "Live portfolio overview"
              : lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleString()}`
                : "Loading dashboard…"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[17.5px] font-medium">
          <span>Project year</span>
          <select
            aria-label="Filter dashboard by project year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="rounded-lg border px-3 py-2 text-[17.5px]"
            style={{
              background: bg,
              borderColor: border,
              color: text,
            }}
          >
            <option value="all">All years</option>
            {[2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>
      {dashboardError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {dashboardError} Dashboard values may be outdated.
        </div>
      )}

      {view === "project" && <div className="grid items-stretch gap-4 md:grid-cols-2">
      <section
        aria-labelledby="dashboard-project-breakdown-heading"
        className="flex min-h-[560px] flex-col rounded-xl border p-4"
        style={{ background: bg, borderColor: border, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="dashboard-project-breakdown-heading" className="text-[17.5px] font-semibold">
              Projects by {projectBreakdownOptions.find((option) => option.value === projectGroupBy)?.label}
            </h2>
            <p className="mt-0.5 text-[15px]" style={{ color: muted }}>
              {selectedYear === "all" ? "All project years" : `Project year ${selectedYear}`}
            </p>
          </div>
          <label className="flex items-center gap-2 text-[15px] font-medium">
            <span>Group by</span>
            <select
              aria-label="Group project pie chart by"
              value={projectGroupBy}
              onChange={(event) => setProjectGroupBy(event.target.value as typeof projectGroupBy)}
              className="rounded-lg border px-3 py-2 text-[15px]"
              style={{ background: bg, borderColor: border, color: text }}
            >
              {projectBreakdownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        {projectBreakdown.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="relative w-full">
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={projectBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={112}
                  paddingAngle={3}
                >
                  {projectBreakdown.map((item, index) => (
                    <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip dark={dark} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
              <span className="text-[30px] font-bold" style={{ color: text }}>
                {projectBreakdown.reduce((total, item) => total + item.value, 0)}
              </span>
              <span className="text-[12.5px]" style={{ color: muted }}>Total projects</span>
            </div>
            </div>
            <ul className="grid w-full grid-cols-2 gap-2">
              {projectBreakdown.map((item, index) => (
                <li key={item.name} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-2 text-[13.75px]" style={{ borderColor: border, background: dark ? "#0F172A" : "#F8FAFC" }}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: pieColors[index % pieColors.length] }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="py-8 text-center text-sm" style={{ color: muted }}>No projects for this year.</p>
        )}
      </section>

      <section aria-labelledby="dashboard-projects-heading" className="flex min-h-[560px] flex-col gap-3">
        <h2 id="dashboard-projects-heading" className="text-[17.5px] font-semibold">Project overview</h2>
        <div className="grid flex-1 grid-rows-5 gap-2">
        {projectOverviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.title} type="button" onClick={card.action} className="h-full w-full text-left" aria-label={`Open ${card.title}`}>
              <div className="flex h-full items-center justify-between gap-4 rounded-xl border p-3" style={{ background: bg, borderColor: border, borderLeft: `4px solid ${card.accent}`, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${card.accent}18`, color: card.accent }}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold" style={{ color: text }}>{card.title}</span>
                    <span className="mt-0.5 block truncate text-[12.5px]" style={{ color: muted }}>{card.subtitle}</span>
                  </span>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-[30px] font-bold leading-none" style={{ color: text }}>{card.value}</span>
                  <span className="mt-1 block text-[11.25px]" style={{ color: muted }}>Live</span>
                </span>
              </div>
            </button>
          );
        })}
        </div>
      </section>
      </div>}

      {view === "rfp" && <div className="grid items-stretch gap-4 md:grid-cols-2">
        <section
          aria-labelledby="dashboard-rfp-heading"
          className="flex min-h-[560px] flex-col rounded-xl border p-4"
          style={{ background: bg, borderColor: border, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
        >
          <div className="mb-3">
            <h2 id="dashboard-rfp-heading" className="text-[17.5px] font-semibold">RFPs by status</h2>
            <p className="mt-0.5 text-[15px]" style={{ color: muted }}>
              {selectedYear === "all" ? "All estimation years" : `Estimation year ${selectedYear}`}
            </p>
          </div>
          {rfpBreakdown.length ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={rfpBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={112}
                    paddingAngle={2}
                  >
                    {rfpBreakdown.map((item, index) => (
                      <Cell key={item.name} fill={pieColorsByGroup.status[index % pieColorsByGroup.status.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip dark={dark} />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="grid w-full grid-cols-2 gap-2">
                {rfpBreakdown.map((item, index) => (
                  <li key={item.name} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-2 text-[13.75px]" style={{ borderColor: border, background: dark ? "#0F172A" : "#F8FAFC" }}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: pieColorsByGroup.status[index % pieColorsByGroup.status.length] }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-8 text-center text-[17.5px]" style={{ color: muted }}>No RFPs for this year.</p>
          )}
        </section>

        <section aria-labelledby="dashboard-rfp-overview-heading" className="flex min-h-[560px] flex-col gap-3">
          <h2 id="dashboard-rfp-overview-heading" className="text-[17.5px] font-semibold">RFP overview</h2>
          {rfpBreakdown.length > 0 ? (
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              {rfpBreakdown.map((item, index) => (
                <div
                  key={item.name}
                  className="flex min-h-0 items-center justify-between gap-4 rounded-xl border p-3"
                  style={{ background: bg, borderColor: border, borderLeft: `4px solid ${pieColorsByGroup.status[index % pieColorsByGroup.status.length]}`, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: pieColorsByGroup.status[index % pieColorsByGroup.status.length] }} />
                    <span className="text-[15px] font-semibold" style={{ color: text }}>{item.name} RFP revenue</span>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-[25px] font-bold leading-tight" style={{ color: text }}>
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(item.revenueInr)}
                    </span>
                    <span className="mt-0.5 block text-[12.5px]" style={{ color: muted }}>{item.value} RFPs</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border p-4 text-[15px]" style={{ background: bg, borderColor: border, color: muted }}>
              No RFPs for this year.
            </p>
          )}
        </section>
      </div>}

      {view === "risk" && <section aria-labelledby="dashboard-risks-heading" className="space-y-3">
        <h2 id="dashboard-risks-heading" className="text-[17.5px] font-semibold">Risks</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {kpiCards.slice(5).map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.title} type="button" onClick={card.action} className="w-full text-left" aria-label={`Open ${card.title}`}>
                <div className="flex min-h-[150px] items-center justify-between gap-4 rounded-xl border p-4" style={{ background: bg, borderColor: border, borderLeft: `4px solid ${card.accent}`, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${card.accent}18`, color: card.accent }}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold" style={{ color: text }}>{card.title}</span>
                      <span className="mt-0.5 block text-[12.5px]" style={{ color: muted }}>{card.subtitle}</span>
                    </span>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-[30px] font-bold leading-none" style={{ color: text }}>{card.value}</span>
                    <span className="mt-1 block text-[11.25px]" style={{ color: muted }}>Live</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>}

      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">
               vs Offboarding Trend</h3>
              <p className="text-xs mt-0.5" style={{ color: muted }}>{chartPeriod} project counts</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <BarChart data={chartData} barGap={4} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#F1F5F9"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip dark={dark} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="onboarded" fill="#1E40AF" radius={[3, 3, 0, 0]} name="Onboarded" />
              <Bar dataKey="offboarded" fill="#93C5FD" radius={[3, 3, 0, 0]} name="Offboarded" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">Revenue Trend</h3>
              <p className="text-xs mt-0.5" style={{ color: muted }}>{chartPeriod} revenue in $M</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <AreaChart data={revenueSeries} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#F1F5F9"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip dark={dark} />} />
              <Area type="monotone" dataKey="revenue" stroke="#1E40AF" strokeWidth={2.5} fill="url(#revGrad)" name="Revenue ($M)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div> */}

    </div>
  );
}

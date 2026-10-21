import { useEffect, useMemo, useState } from "react";
import {
  Users, UserCheck, Clock, UserMinus,
  CalendarDays, AlertCircle, FolderKanban, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { KPICard } from "./KPI";

interface DashboardProps { dark: boolean; onNavigate: (p: string) => void; user?: { roles: string[] }; }

const projectBreakdownOptions = [
  { value: "status", label: "Status" },
  { value: "region", label: "Region" },
  { value: "hyperscaler", label: "Hyperscaler" },
  { value: "projectType", label: "Project Type" },
] as const;
const pieColorsByGroup = {
  status: ["#15803D", "#D97706", "#DC2626", "#7C3AED", "#2563EB", "#64748B", "#DB2777", "#0F766E"],
  region: ["#1D4ED8", "#0891B2", "#0F766E", "#65A30D", "#CA8A04", "#EA580C", "#C026D3", "#475569"],
  hyperscaler: ["#2563EB", "#F97316", "#7C3AED", "#059669", "#DB2777", "#64748B", "#CA8A04", "#0F766E"],
  projectType: ["#9333EA", "#0891B2", "#4D7C0F", "#C2410C", "#2563EB", "#BE185D", "#475569", "#0D9488"],
};

const typeColor: Record<string, string> = {
  update: "#D97706", import: "#1E40AF", create: "#16A34A", export: "#7C3AED",
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

export default function Dashboard({ dark, onNavigate, user }: DashboardProps) {
  const chartPeriod = "Monthly";
  const [selectedYear, setSelectedYear] = useState("all");
  const [projectGroupBy, setProjectGroupBy] = useState<(typeof projectBreakdownOptions)[number]["value"]>("status");
  const pieColors = pieColorsByGroup[projectGroupBy];
  const [summary, setSummary] = useState({ totalClients: 0, activeProjects: 0, delayedProjectsExternal: 0, delayedProjectsInternal: 0, totalRisks: 0, openRisks: 0 });
  const [projectBreakdown, setProjectBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [rfpBreakdown, setRfpBreakdown] = useState<{ name: string; value: number; revenueInr: number }[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<any[]>([]);
  const [serviceSeries, setServiceSeries] = useState<any[]>([]);
  const [regionSeries, setRegionSeries] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
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
        setChartData((payload.onboardingTrend?.length ? payload.onboardingTrend : [{ month: "No data", onboarded: 0, offboarded: 0 }]).map((item: any) => ({ ...item, offboarded: item.offboarded || 0 })));
        setRevenueSeries(payload.revenueTrend?.length ? payload.revenueTrend : [{ month: "No data", revenue: 0 }]);
        setServiceSeries(payload.serviceAdoption || []);
        setRegionSeries(payload.regionData?.length ? payload.regionData : [{ region: "No data", clients: 0, revenue: 0, color: "#CBD5E1" }]);
        setUpcoming(payload.upcomingActivities || []);
      })
      .catch((error) => {
        setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard data.");
      });
    if (user?.roles.includes("Admin")) fetch('/api/audit', { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((payload) => setActivityFeed((payload?.logs || []).slice(0, 5).map((entry: any) => ({ action: entry.action, user: entry.user, time: entry.timestamp, type: entry.type?.toLowerCase() || 'update' })))).catch(() => undefined);
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
  }, [chartPeriod, selectedYear, projectGroupBy, user]);

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
    { title: "Total Projects", value: String(summary.totalClients), subtitle: "Approved project records", accent: "#1E40AF", icon: Users, action: () => onNavigate("clients") },
    { title: "Active Projects", value: String(summary.activeProjects), subtitle: "Approved projects", accent: "#1E40AF", icon: FolderKanban },
    { title: "Delayed (External)", value: String(summary.delayedProjectsExternal), subtitle: "Externally delayed projects", accent: "#C2410C", icon: AlertTriangle },
    { title: "Delayed (Internal)", value: String(summary.delayedProjectsInternal), subtitle: "Internally delayed projects", accent: "#BE185D", icon: Clock },
    { title: "Total Risks", value: String(summary.totalRisks), subtitle: "All project risks", accent: "#7C3AED", icon: ShieldAlert, action: () => onNavigate("risks") },
    { title: "Open Risks", value: String(summary.openRisks), subtitle: "Risks not completed or cancelled", accent: "#D97706", icon: AlertCircle, action: () => onNavigate("risks") },
  ], [summary, onNavigate]);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const pageBg = dark ? "#0F172A" : "#F1F5F9";

  return (
    <div className="p-6 space-y-6" style={{ color: text, background: pageBg }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Executive Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : "Loading dashboard…"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <span>Project year</span>
          <select
            aria-label="Filter dashboard by project year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
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

      <section
        aria-labelledby="dashboard-project-breakdown-heading"
        className="w-full max-w-2xl rounded-xl border p-5"
        style={{ background: bg, borderColor: border }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="dashboard-project-breakdown-heading" className="font-semibold text-sm">
              Projects by {projectBreakdownOptions.find((option) => option.value === projectGroupBy)?.label}
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: muted }}>
              {selectedYear === "all" ? "All project years" : `Project year ${selectedYear}`}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium">
            <span>Group by</span>
            <select
              aria-label="Group project pie chart by"
              value={projectGroupBy}
              onChange={(event) => setProjectGroupBy(event.target.value as typeof projectGroupBy)}
              className="rounded-lg border px-3 py-2 text-xs"
              style={{ background: bg, borderColor: border, color: text }}
            >
              {projectBreakdownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        {projectBreakdown.length ? (
          <div className="flex flex-wrap items-center gap-4">
            <ResponsiveContainer width={240} height={210}>
              <PieChart>
                <Pie
                  data={projectBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {projectBreakdown.map((item, index) => (
                    <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip dark={dark} />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="min-w-[160px] flex-1 space-y-2">
              {projectBreakdown.map((item, index) => (
                <li key={item.name} className="flex items-center justify-between gap-4 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: pieColors[index % pieColors.length] }} />
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

      <section aria-labelledby="dashboard-rfp-heading" className="space-y-3">
        <h2 id="dashboard-rfp-heading" className="text-base font-semibold">
          RFP Dashboard
        </h2>
        <div
          className="w-full max-w-2xl rounded-xl border p-5"
          style={{ background: bg, borderColor: border }}
        >
          <div className="mb-3">
            <h3 className="font-semibold text-sm">RFPs by status</h3>
            <p className="mt-0.5 text-xs" style={{ color: muted }}>
              {selectedYear === "all" ? "All estimation years" : `Estimation year ${selectedYear}`}
            </p>
          </div>
          {rfpBreakdown.length ? (
            <div className="flex flex-wrap items-center gap-4">
              <ResponsiveContainer width={240} height={210}>
                <PieChart>
                  <Pie
                    data={rfpBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {rfpBreakdown.map((item, index) => (
                      <Cell key={item.name} fill={pieColorsByGroup.status[index % pieColorsByGroup.status.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip dark={dark} />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="min-w-[160px] flex-1 space-y-2">
                {rfpBreakdown.map((item, index) => (
                  <li key={item.name} className="flex items-center justify-between gap-4 text-xs">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: pieColorsByGroup.status[index % pieColorsByGroup.status.length] }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-8 text-center text-sm" style={{ color: muted }}>No RFPs for this year.</p>
          )}
        </div>
        {rfpBreakdown.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rfpBreakdown.map((item, index) => (
              <div
                key={item.name}
                className="rounded-xl border p-5"
                style={{ background: bg, borderColor: border }}
              >
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: muted }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColorsByGroup.status[index % pieColorsByGroup.status.length] }} />
                  {item.name} RFP revenue
                </div>
                <p className="mt-3 text-xl font-bold" style={{ color: text }}>
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(item.revenueInr)}
                </p>
                <p className="mt-1 text-xs" style={{ color: muted }}>{item.value} RFPs</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="dashboard-projects-heading" className="space-y-3">
        <h2 id="dashboard-projects-heading" className="text-base font-semibold">
          Project
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.slice(0, 4).map((card) => {
            const commonProps = {
              title: card.title,
              value: card.value,
              change: "Live",
              trend: "neutral" as const,
              lastUpdated: "now",
              accent: card.accent,
              icon: card.icon,
              subtitle: card.subtitle,
            };
            return (
              <button key={card.title} type="button" onClick={card.action} className="text-left w-full" aria-label={`Open ${card.title}`}>
                <KPICard {...commonProps} />
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="dashboard-risks-heading" className="space-y-3">
        <h2 id="dashboard-risks-heading" className="text-base font-semibold">
          Risks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kpiCards.slice(4).map((card) => {
            const commonProps = {
              title: card.title,
              value: card.value,
              change: "Live",
              trend: "neutral" as const,
              lastUpdated: "now",
              accent: card.accent,
              icon: card.icon,
              subtitle: card.subtitle,
            };
            return (
              <button key={card.title} type="button" onClick={card.action} className="text-left w-full" aria-label={`Open ${card.title}`}>
                <KPICard {...commonProps} />
              </button>
            );
          })}
        </div>
      </section>

      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">Onboarding vs Offboarding Trend</h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {user?.roles.includes("Admin") && <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
          <h3 className="font-semibold text-sm mb-4">Service Adoption</h3>
          <div className="space-y-3">
            {serviceSeries.map((service) => (
              <div key={service.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: text }}>{service.name}</span>
                  <span style={{ color: muted }}>{service.clients} clients</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: dark ? "#334155" : "#F1F5F9" }}>
                  <div className="h-2 rounded-full transition-all" style={{ background: "#1E40AF", width: `${summary.totalClients > 0 ? (service.clients / summary.totalClients) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>}

        <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
          <h3 className="font-semibold text-sm mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activityFeed.map((entry, index) => (
              <div key={`${entry.action}-${index}`} className="flex gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: typeColor[entry.type] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug" style={{ color: text }}>{entry.action}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: muted }}>{entry.user} · {entry.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Upcoming Activities</h3>
            <CalendarDays className="w-4 h-4" style={{ color: muted }} />
          </div>
          <div className="space-y-2.5">
            {upcoming.map((activity, index) => {
              const isHigh = activity.priority === "high";
              const isOnboard = activity.type === "onboarding";
              return (
                <div key={`${activity.client}-${index}`} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: dark ? "#0F172A" : "#F8FAFC" }}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isOnboard ? "bg-blue-100" : activity.type === "offboarding" ? "bg-red-100" : "bg-amber-100"}`}>
                    {isOnboard ? <UserCheck className="w-3.5 h-3.5 text-blue-600" /> :
                      activity.type === "offboarding" ? <UserMinus className="w-3.5 h-3.5 text-red-600" /> :
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: text }}>{activity.client}</p>
                    <p className="text-[10px]" style={{ color: muted }}>{activity.date} · {activity.manager}</p>
                  </div>
                  {isHigh && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
        <h3 className="font-semibold text-sm mb-4">Regional Client Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {regionSeries.map((region) => (
            <div key={region.region} className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg relative" style={{ background: region.color }}>
                {region.clients}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="4"
                    strokeDasharray={`${(region.clients / 34) * 175.9} 175.9`} strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-xs font-semibold" style={{ color: text }}>{region.region}</div>
              <div className="text-[10px]" style={{ color: muted }}>${region.revenue}M</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
        <h3 className="font-semibold text-sm mb-4">Client Status Distribution</h3>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="45%" height={180} minWidth={120}>
            <PieChart><Pie data={regionSeries} dataKey="clients" nameKey="region" cx="50%" cy="50%" outerRadius={70} innerRadius={38} labelLine={false}>{regionSeries.map((entry, index) => <Cell key={entry.region} fill={entry.color || ["#1E40AF", "#16A34A", "#D97706", "#DC2626"][index % 4]} />)}</Pie><Tooltip content={<CustomTooltip dark={dark} />} /></PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 text-xs">{regionSeries.slice(0, 6).map((region) => <div key={region.region} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: region.color }} /><span>{region.region}</span><strong>{region.clients}</strong></div>)}</div>
        </div>
      </div>
    </div>
  );
}

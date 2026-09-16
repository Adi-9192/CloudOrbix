import { useState } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList
} from "recharts";
import { Filter, Download } from "lucide-react";

const onboardingTrend: any[] = [];
const revenueTrend: any[] = [];
const serviceAdoption: any[] = [];
const regionData: any[] = [];
const industryData: any[] = [];

interface AnalyticsProps { dark: boolean; }

const netGrowth = onboardingTrend.map(d => ({ ...d, net: d.onboarded - d.offboarded, cumulative: 0 }));
let cum = 72;
netGrowth.forEach(d => { cum += d.net; d.cumulative = cum; });

const retentionData: any[] = [];

const funnelData: any[] = [];

const accountMgrPerf: any[] = [];

const PIE_COLORS = ["#1E40AF", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE", "#EFF6FF", "#F0F9FF"];

const CustomTooltip = ({ active, payload, label, dark }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl shadow-xl px-4 py-3 text-xs border" style={{ background: dark ? "#1E293B" : "#fff", borderColor: dark ? "#334155" : "#E2E8F0", color: dark ? "#E2E8F0" : "#0F172A" }}>
      <div className="font-semibold mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics({ dark }: AnalyticsProps) {
  const [dateRange, setDateRange] = useState("FY 2025");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";

  const ChartCard = ({ title, subtitle, children, className = "" }: any) => (
    <div className={`rounded-xl border p-5 ${className}`} style={{ background: bg, borderColor: border }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: text }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: muted }}>{subtitle}</p>}
        </div>
        <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: muted }}>
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );

  return (
    <div className="p-6 space-y-5" style={{ color: text }}>
      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Analytics Center</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>10-year data visualization · Interactive filters</p>
        </div>
        <div className="flex items-center gap-2">
          {["FY 2023", "FY 2024", "FY 2025", "5Y", "10Y"].map(p => (
            <button key={p} onClick={() => setDateRange(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
              style={{ background: dateRange === p ? "#1E40AF" : bg, color: dateRange === p ? "#fff" : muted, borderColor: dateRange === p ? "#1E40AF" : border }}>
              {p}
            </button>
          ))}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium" style={{ borderColor: border, color: muted, background: bg }}>
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
        </div>
      </div>

      {/* Row 1: Onboarding Trend + Net Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Onboarding & Offboarding Trend" subtitle={`Monthly, ${dateRange}`}>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={onboardingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#F1F5F9"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip dark={dark} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="onboarded" stroke="#1E40AF" strokeWidth={2.5} dot={false} name="Onboarded" />
              <Line type="monotone" dataKey="offboarded" stroke="#EF4444" strokeWidth={2} dot={false} strokeDasharray="4 3" name="Offboarded" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cumulative Project Growth" subtitle="Active project base trajectory">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={netGrowth}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#F1F5F9"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip dark={dark} />} />
              <Area type="monotone" dataKey="cumulative" stroke="#1E40AF" strokeWidth={2.5} fill="url(#cumGrad)" name="Total Projects" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Revenue + Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue Trend" subtitle="Monthly ARR in $M">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#F1F5F9"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip dark={dark} />} />
              <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5} fill="url(#revGrad2)" name="Revenue ($M)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Project Retention Rate" subtitle="Monthly retention % FY 2025">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#F1F5F9"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[90, 100]} tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip dark={dark} />} />
              <Line type="monotone" dataKey="rate" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3, fill: "#16A34A" }} name="Retention %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Service Adoption + Industry Pie + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Service Adoption by Revenue" subtitle="$M per service category">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={serviceAdoption} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#F1F5F9"} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: muted }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip dark={dark} />} />
              <Bar dataKey="revenue" fill="#1E40AF" radius={[0, 3, 3, 0]} name="Revenue ($M)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Industry Distribution" subtitle="Project count by vertical">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={industryData} dataKey="value" nameKey="industry" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {industryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 11, background: dark ? "#1E293B" : "#fff", borderColor: border }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Project Lifecycle Funnel" subtitle="Prospect to onboarded conversion">
          <div className="space-y-2 mt-2">
            {funnelData.map((d, i) => (
              <div key={d.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: text }}>{d.name}</span>
                  <span style={{ color: muted }}>{d.value}</span>
                </div>
                <div className="h-7 rounded-lg flex items-center px-3 text-xs font-semibold text-white transition-all"
                  style={{ background: d.fill, width: `${(d.value / 240) * 100}%`, minWidth: "40%", color: i < 2 ? "#1E40AF" : "#fff" }}>
                  {Math.round((d.value / 240) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Account Manager Performance */}
      <ChartCard title="Account Manager Performance" subtitle="Projects managed, revenue generated, and satisfaction scores">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b" style={{ borderColor: border }}>
                {["Account Manager", "Projects", "Revenue ($M)", "Satisfaction", "Performance"].map(h => (
                  <th key={h} className="py-2 px-3 text-left text-xs font-semibold" style={{ color: muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accountMgrPerf.map(m => (
                <tr key={m.name} className="border-b" style={{ borderColor: border }}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#1E40AF" }}>
                        {m.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <span className="text-xs font-medium" style={{ color: text }}>{m.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs font-semibold" style={{ color: text }}>{m.clients}</td>
                  <td className="py-3 px-3 text-xs font-semibold" style={{ color: text }}>${m.revenue}M</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold" style={{ color: text }}>{m.satisfaction}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => <span key={s} className="text-[10px]" style={{ color: s <= Math.floor(m.satisfaction) ? "#F59E0B" : "#CBD5E1" }}>★</span>)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="w-24 h-2 rounded-full" style={{ background: dark ? "#334155" : "#F1F5F9" }}>
                      <div className="h-2 rounded-full" style={{ background: "#1E40AF", width: `${(m.revenue / 9.3) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

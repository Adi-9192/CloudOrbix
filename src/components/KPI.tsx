import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";

export type KPITrend = "up" | "down" | "neutral";

export type KPICardProps = {
  title: string;
  value: string;
  change: string;
  trend: KPITrend;
  lastUpdated: string;
  accent: string;
  icon: LucideIcon;
  subtitle?: string;
  children?: ReactNode;
};

function TrendPill({ trend, value }: { trend: KPITrend; value: string }) {
  const styles = {
    up: "bg-emerald-100 text-emerald-700",
    down: "bg-red-100 text-red-700",
    neutral: "bg-slate-100 text-slate-600",
  };

  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${styles[trend]}`}>
      <Icon className="h-3 w-3" />
      {value}
    </span>
  );
}

export function KPICard({ title, value, change, trend, lastUpdated, accent, icon: Icon, subtitle, children }: KPICardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(30,64,175,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
        </div>
        <button type="button" className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label={`Info for ${title}`}>
          <Info className="h-4 w-4" />
        </button>
      </div>

      {subtitle && <p className="mt-2 text-[11px] text-slate-500">{subtitle}</p>}

      <div className="mt-4 flex items-center justify-between">
        <TrendPill trend={trend} value={change} />
        <span className="text-[10px] text-slate-500">Updated {lastUpdated}</span>
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function KPIRadialCard({
  title,
  value,
  change,
  trend,
  lastUpdated,
  accent,
  icon: Icon,
  subtitle,
  percent,
}: KPICardProps & { percent: number }) {
  const data = [{ name: "progress", value: percent, fill: accent }];

  return (
    <KPICard title={title} value={value} change={change} trend={trend} lastUpdated={lastUpdated} accent={accent} icon={Icon} subtitle={subtitle}>
      <div className="flex items-center justify-between gap-3">
        <div className="h-16 w-16 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="54%" outerRadius="82%" barSize={10} data={data} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" cornerRadius={999} fill={accent} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-slate-900">{percent}%</div>
          <div className="text-[11px] text-slate-500">of target</div>
        </div>
      </div>
    </KPICard>
  );
}

export function KPISparklineCard({
  title,
  value,
  change,
  trend,
  lastUpdated,
  accent,
  icon: Icon,
  subtitle,
  data,
  area = false,
}: KPICardProps & { data: Array<{ label: string; value: number }>; area?: boolean }) {
  const chart = area ? (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${title.replace(/\s+/g, "-").toLowerCase()}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accent} stopOpacity={0.35} />
            <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} fill={`url(#grad-${title.replace(/\s+/g, "-").toLowerCase()})`} />
      </AreaChart>
    </ResponsiveContainer>
  ) : (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <Tooltip formatter={(value: unknown) => [`${value ?? ""}`, "Trend"]} labelFormatter={() => ""} />
        <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <KPICard title={title} value={value} change={change} trend={trend} lastUpdated={lastUpdated} accent={accent} icon={Icon} subtitle={subtitle}>
      {chart}
    </KPICard>
  );
}

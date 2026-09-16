import { useState } from "react";
import { Download, FileText, Calendar, Clock, CheckCircle2, BarChart3, Users, DollarSign, Server, Plus, Send } from "lucide-react";

interface ReportsProps { dark: boolean; }

const REPORT_TYPES = [
  ["executive-kpi", "Executive KPI Dashboard"], ["project-manager-performance", "Project Manager Performance Report"], ["account-manager-performance", "Account Manager Performance Report"],
  ["revenue", "Revenue Report"], ["project-lifecycle", "Project Lifecycle Report"], ["project-delivery", "Project Delivery Report"], ["service-adoption", "Service Adoption Report"],
  ["risk-management", "Risk Management Report"], ["task-management", "Task Management Report"], ["regional-performance", "Regional Performance Report"], ["industry-analysis", "Industry Analysis Report"],
  ["hyperscaler-adoption", "Hyperscaler Adoption Report"], ["status-distribution", "Status Distribution Report"], ["audit-activity", "Audit Activity Report"], ["excel-import", "Excel Import Report"],
  ["project-updates", "Project Updates Report"], ["document-repository", "Document Repository Report"],
].map(([id, name], index) => ({ id, name, desc: "Live data export with report metrics", icon: index % 3 === 0 ? BarChart3 : index % 3 === 1 ? Users : Server, color: ["#1E40AF", "#0F766E", "#D97706"][index % 3], bg: ["#DBEAFE", "#CCFBF1", "#FEF3C7"][index % 3] }));

const RECENT_REPORTS = [
  { name: "Q2 2025 Revenue Report", type: "Revenue", generated: "Aug 1, 2025", format: "PDF", size: "2.4 MB", status: "ready" },
  { name: "July Project Lifecycle Report", type: "Lifecycle", generated: "Aug 1, 2025", format: "Excel", size: "1.8 MB", status: "ready" },
  { name: "H1 Executive KPI Summary", type: "Executive KPI", generated: "Jul 1, 2025", format: "PDF", size: "3.1 MB", status: "ready" },
  { name: "Service Adoption Q2 2025", type: "Service Adoption", generated: "Jul 1, 2025", format: "PDF", size: "1.2 MB", status: "ready" },
  { name: "Annual Revenue Report 2024", type: "Revenue", generated: "Jan 1, 2025", format: "Excel", size: "4.7 MB", status: "ready" },
];

const SCHEDULED = [
  { name: "Monthly KPI Report", frequency: "Monthly · 1st of month", next: "Sep 1, 2025", recipients: 5, status: "active" },
  { name: "Quarterly Revenue Summary", frequency: "Quarterly", next: "Oct 1, 2025", recipients: 8, status: "active" },
  { name: "Weekly Onboarding Status", frequency: "Every Monday", next: "Aug 18, 2025", recipients: 3, status: "active" },
  { name: "Annual Lifecycle Report", frequency: "Yearly · Jan 1", next: "Jan 1, 2026", recipients: 12, status: "paused" },
];

export default function Reports({ dark }: ReportsProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2025-08-13");
  const [format, setFormat] = useState("PDF");

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const subtle = dark ? "#0F172A" : "#F8FAFC";

  const generate = async (id: string) => {
    setGenerating(id);
    try {
      const token = localStorage.getItem("clmp-token");
      const response = await fetch(`/api/reports/export?type=${encodeURIComponent(id)}&format=${format.toLowerCase()}&from=${dateFrom}&to=${dateTo}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error((await response.json()).message || "Report generation failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cloudorbix-${id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Report generation failed.");
    } finally { setGenerating(null); }
  };

  return (
    <div className="p-6 space-y-6" style={{ color: text }}>
      <div>
        <h1 className="text-xl font-bold">Reports & Exports</h1>
        <p className="text-xs mt-0.5" style={{ color: muted }}>Generate, schedule, and download reports in PDF, Excel, and CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Report Generator */}
        <div className="lg:col-span-2 space-y-5">
          {/* Report type cards */}
          <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: text }}>Generate Report</h3>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {REPORT_TYPES.map(r => {
                const Icon = r.icon;
                const isGen = generating === r.id;
                return (
                  <button key={r.id} onClick={() => generate(r.id)}
                    className="flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:border-blue-300 group"
                    style={{ borderColor: border, background: subtle }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: r.bg }}>
                      {isGen
                        ? <svg className="animate-spin w-5 h-5" style={{ color: r.color }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" /></svg>
                        : <Icon className="w-5 h-5" style={{ color: r.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold mb-0.5" style={{ color: text }}>{r.name}</div>
                      <div className="text-[10px]" style={{ color: muted }}>{r.desc}</div>
                    </div>
                    {isGen
                      ? <span className="text-[10px] font-medium text-blue-600">Generating…</span>
                      : <Download className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: r.color }} />}
                  </button>
                );
              })}
            </div>

            {/* Parameters */}
            <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: border, background: subtle }}>
              <h4 className="text-xs font-semibold" style={{ color: text }}>Report Parameters</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: muted }}>DATE FROM</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none" style={{ background: bg, borderColor: border, color: text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: muted }}>DATE TO</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none" style={{ background: bg, borderColor: border, color: text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: muted }}>FORMAT</label>
                  <select value={format} onChange={e => setFormat(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none" style={{ background: bg, borderColor: border, color: text }}>
                    <option>PDF</option><option>Excel</option><option>CSV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: muted }}>REGION</label>
                  <select className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none" style={{ background: bg, borderColor: border, color: text }}>
                    <option>All Regions</option>
                    <option>North America</option><option>Europe</option><option>APAC</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: border }}>
              <h3 className="font-semibold text-sm" style={{ color: text }}>Recent Reports</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: border, background: subtle }}>
                  {["Report Name", "Type", "Generated", "Format", "Size", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_REPORTS.map(r => (
                  <tr key={r.name} className="border-b hover:bg-slate-50 transition-colors" style={{ borderColor: border }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "#1E40AF" }} />
                        <span className="text-xs font-medium" style={{ color: text }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: muted }}>{r.type}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: muted }}>{r.generated}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: r.format === "PDF" ? "#FEE2E2" : "#DCFCE7", color: r.format === "PDF" ? "#DC2626" : "#16A34A" }}>
                        {r.format}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: muted }}>{r.size}</td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 text-xs font-medium hover:text-blue-600 transition-colors" style={{ color: muted }}>
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Scheduled Reports */}
        <div className="space-y-4">
          <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: text }}>Scheduled Reports</h3>
              <button className="flex items-center gap-1 text-xs font-medium" style={{ color: "#1E40AF" }}>
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {SCHEDULED.map(s => (
                <div key={s.name} className="p-3 rounded-xl border" style={{ borderColor: border, background: subtle }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold" style={{ color: text }}>{s.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[10px] flex items-center gap-1 mb-1" style={{ color: muted }}>
                    <Clock className="w-3 h-3" /> {s.frequency}
                  </div>
                  <div className="text-[10px] flex items-center gap-1" style={{ color: muted }}>
                    <Calendar className="w-3 h-3" /> Next: {s.next}
                  </div>
                  <div className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: muted }}>
                    <Send className="w-3 h-3" /> {s.recipients} recipients
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: text }}>Quick Export</h3>
            <div className="space-y-2">
              {[
                { label: "Export All Projects (CSV)", icon: "📊" },
                { label: "Export Active Projects (Excel)", icon: "📗" },
                { label: "Export Revenue Data (PDF)", icon: "📄" },
                { label: "Export Audit Logs (CSV)", icon: "📋" },
              ].map(e => (
                <button key={e.label} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium text-left hover:border-blue-300 transition-colors"
                  style={{ borderColor: border, background: subtle, color: text }}>
                  <span>{e.icon}</span> {e.label}
                  <Download className="w-3 h-3 ml-auto" style={{ color: muted }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

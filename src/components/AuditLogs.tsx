import { useEffect, useState } from "react";
import { Search, Filter, Download, ChevronDown, ChevronRight } from "lucide-react";

interface AuditLogsProps { dark: boolean; }

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  Update: { bg: "#FEF3C7", text: "#D97706" },
  Import: { bg: "#DBEAFE", text: "#1E40AF" },
  Create: { bg: "#DCFCE7", text: "#16A34A" },
  Export: { bg: "#EDE9FE", text: "#7C3AED" },
  Delete: { bg: "#FEE2E2", text: "#DC2626" },
  Report: { bg: "#F1F5F9", text: "#64748B" },
};

export default function AuditLogs({ dark }: AuditLogsProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [expanded, setExpanded] = useState<number | null>(null);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const subtle = dark ? "#0F172A" : "#F8FAFC";

  useEffect(() => {
    const token = localStorage.getItem("clmp-token");
    fetch("/api/audit", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setAuditLogs(payload?.logs || []))
      .catch(() => setAuditLogs([]));
  }, []);

  const filtered = auditLogs.filter(l =>
    (typeFilter === "All" || l.type === typeFilter) &&
    (!search || l.user.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-5" style={{ color: text }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Audit Logs & Compliance</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Complete audit trail of all system actions</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium" style={{ borderColor: border, color: muted, background: bg }}>
          <Download className="w-3.5 h-3.5" /> Export Logs
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {Object.entries(TYPE_STYLES).map(([type, style]) => {
          const count = auditLogs.filter(l => l.type === type).length;
          return (
            <button key={type} onClick={() => setTypeFilter(typeFilter === type ? "All" : type)}
              className="rounded-xl border p-3 text-center transition-all"
              style={{ background: typeFilter === type ? style.bg : bg, borderColor: typeFilter === type ? style.text : border }}>
              <div className="text-xl font-bold" style={{ color: style.text }}>{count}</div>
              <div className="text-[10px] font-medium mt-0.5" style={{ color: muted }}>{type}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…"
            className="pl-9 pr-4 py-2 rounded-lg border text-xs outline-none w-56"
            style={{ background: bg, borderColor: border, color: text }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border text-xs outline-none" style={{ background: bg, borderColor: border, color: text }}>
          <option value="All">All Types</option>
          {Object.keys(TYPE_STYLES).map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
        <div className="px-5 py-3.5 border-b" style={{ borderColor: border, background: subtle }}>
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 text-xs font-semibold" style={{ color: muted }}>
            <span className="w-5" />
            <span>Action & Entity</span>
            <span className="hidden sm:block w-28">User</span>
            <span className="hidden md:block w-32">Timestamp</span>
            <span className="hidden lg:block w-20">Type</span>
            <span className="hidden lg:block w-24">IP Address</span>
            <span className="w-4" />
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: border }}>
          {filtered.map(log => {
            const ts = TYPE_STYLES[log.type] || TYPE_STYLES.Report;
            const isExpanded = expanded === log.id;
            return (
              <div key={log.id}>
                <div
                  className="px-5 py-3 cursor-pointer transition-colors hover:bg-opacity-50"
                  style={{ background: isExpanded ? (dark ? "#172554" : "#EFF6FF") : "transparent" }}
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                >
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 items-center">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: ts.text, background: ts.bg }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: ts.text }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: text }}>{log.action}</div>
                      <div className="text-[10px] truncate" style={{ color: muted }}>{log.entity}</div>
                    </div>
                    <div className="hidden sm:block w-28">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: "#1E40AF" }}>
                          {log.user === "Admin System" ? "⚙" : log.user.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <span className="text-xs truncate" style={{ color: text }}>{log.user.split(" ")[0]}</span>
                      </div>
                    </div>
                    <div className="hidden md:block w-32 font-mono text-[10px]" style={{ color: muted }}>{log.timestamp}</div>
                    <div className="hidden lg:block w-20">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: ts.bg, color: ts.text }}>{log.type}</span>
                    </div>
                    <div className="hidden lg:block w-24 font-mono text-[10px]" style={{ color: muted }}>{log.ip}</div>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} style={{ color: muted }} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 py-4 border-t" style={{ borderColor: border, background: dark ? "#0C1A35" : "#F0F7FF" }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      {[
                        { label: "Previous Value", value: log.prev },
                        { label: "Updated Value", value: log.next },
                        { label: "Full Timestamp", value: log.timestamp },
                        { label: "IP Address", value: log.ip },
                        { label: "User", value: log.user },
                        { label: "Entity Affected", value: log.entity },
                        { label: "Action Type", value: log.type },
                        { label: "Session ID", value: `SES-${log.id.toString().padStart(5, "0")}` },
                      ].map(f => (
                        <div key={f.label}>
                          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: muted }}>{f.label}</div>
                          <div className="font-medium font-mono text-[11px]" style={{ color: text }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium" style={{ color: muted }}>No audit log entries match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { UserPlus, UserMinus, Server, HelpCircle, CalendarDays, AlertCircle, RefreshCw } from "lucide-react";

interface SimplePageProps { page: string; dark: boolean; }

export default function SimplePage({ page, dark }: SimplePageProps) {
  const [liveClients, setLiveClients] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const subtle = dark ? "#0F172A" : "#F8FAFC";

  useEffect(() => {
    if (page !== "onboarding" && page !== "offboarding" && page !== "services") return;
    const token = localStorage.getItem("clmp-token");
    if (!token) return;
    fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!payload?.clients) return;
        setLiveClients(payload.clients.map((client: any) => ({ id: client.clientId, name: client.clientName, status: client.currentStatus, accountManager: client.accountManager, plannedOnboard: client.estimatedStartDate || client.plannedOnboardDate || "", plannedOffboard: client.estimatedEndDate || client.plannedOffboardDate || "", services: client.services || [] })));
      }).catch(() => undefined);
    if (page === "services") fetch("/api/services", { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((payload) => setServiceData(payload?.services || [])).catch(() => setServiceData([]));
  }, [page]);

  if (page === "onboarding") {
    const today = new Date().toISOString().slice(0, 10);
    const pending = liveClients.filter(c => c.status !== "Offboarded" && c.plannedOnboard && c.plannedOnboard <= today);
    const upcoming = liveClients.filter((client) => client.status !== "Offboarded" && client.plannedOnboard);
    return (
      <div className="p-6 space-y-5" style={{ color: text }}>
        <div>
          <h1 className="text-xl font-bold">Onboarding</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Track projects in onboarding pipeline</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ label: "Pending Onboarding", value: pending.length, color: "#D97706", bg: "#FEF3C7" },
            { label: "Scheduled This Month", value: upcoming.length, color: "#1E40AF", bg: "#DBEAFE" },
            { label: "Avg Onboarding Days", value: "-", color: "#16A34A", bg: "#DCFCE7" }
          ].map(k => (
            <div key={k.label} className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
              <div className="text-3xl font-bold mb-1" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs font-medium" style={{ color: muted }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: border }}>
            <h3 className="font-semibold text-sm" style={{ color: text }}>Pending Onboarding Projects</h3>
          </div>
          {pending.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                <UserPlus className="w-4 h-4" style={{ color: "#D97706" }} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold" style={{ color: text }}>{c.name}</div>
                <div className="text-[10px]" style={{ color: muted }}>{c.id} · {c.accountManager} · Planned: {c.plannedOnboard}</div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "offboarding") {
    const scheduled = liveClients.filter(c => c.status === "Offboarding Scheduled");
    const offboarded = liveClients.filter(c => c.status === "Offboarded");
    return (
      <div className="p-6 space-y-5" style={{ color: text }}>
        <div>
          <h1 className="text-xl font-bold">Offboarding</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Monitor projects scheduled for offboarding</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ label: "Scheduled Offboarding", value: scheduled.length, color: "#D97706", bg: "#FEF3C7" },
            { label: "Offboarded YTD", value: offboarded.length, color: "#64748B", bg: "#F1F5F9" },
            { label: "Avg Offboarding Days", value: "-", color: "#DC2626", bg: "#FEE2E2" }
          ].map(k => (
            <div key={k.label} className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
              <div className="text-3xl font-bold mb-1" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs font-medium" style={{ color: muted }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: border }}>
            <h3 className="font-semibold text-sm" style={{ color: text }}>Scheduled for Offboarding</h3>
          </div>
          {scheduled.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FEE2E2" }}>
                <UserMinus className="w-4 h-4" style={{ color: "#DC2626" }} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold" style={{ color: text }}>{c.name}</div>
                <div className="text-[10px]" style={{ color: muted }}>{c.id} · {c.accountManager} · Planned Off: {c.plannedOffboard}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Scheduled</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "services") {
    const serviceCounts = serviceData.length ? serviceData.map((item) => ({ name: item.name, count: item.project_count, projects: item.projects })) : [];
    return (
      <div className="p-6 space-y-5" style={{ color: text }}>
        <div>
          <h1 className="text-xl font-bold">Services</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Service portfolio and adoption metrics</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {serviceCounts.map(s => (
            <button key={s.name} onClick={() => setSelectedService(selectedService === s.name ? null : s.name)} className="rounded-xl border p-4 text-left" style={{ background: bg, borderColor: selectedService === s.name ? "#1E40AF" : border }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#DBEAFE" }}>
                  <Server className="w-4 h-4" style={{ color: "#1E40AF" }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: text }}>{s.name}</span>
              </div>
              <div className="text-2xl font-bold mb-0.5" style={{ color: "#1E40AF" }}>{s.count}</div>
              <div className="text-[10px]" style={{ color: muted }}>projects</div>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: dark ? "#334155" : "#F1F5F9" }}>
                <div className="h-1.5 rounded-full" style={{ background: "#1E40AF", width: `${(s.count / 10) * 100}%` }} />
              </div>
            </button>
          ))}
        </div>
        {selectedService && <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}><div className="px-5 py-4 border-b font-semibold text-sm" style={{ borderColor: border }}>Projects using {selectedService}</div>{(serviceCounts.find((item) => item.name === selectedService)?.projects || []).map((project: any) => <div key={project.clientId} className="flex items-center justify-between px-5 py-3 border-b text-xs" style={{ borderColor: border }}><span>{project.clientName}</span><span style={{ color: muted }}>{project.status} · {project.completion || 0}%</span></div>)}</div>}
      </div>
    );
  }

  if (page === "help") {
    const faqs = [
      { q: "How do I onboard a new project?", a: "Go to Projects → Add Project and follow the 4-step wizard." },
      { q: "How do I import projects via Excel?", a: "Go to Excel Import, download the template, fill it in, and drag-drop the file to upload." },
      { q: "Who can access the Admin panel?", a: "Only users with the Admin role can access Admin settings." },
      { q: "How do I schedule a recurring report?", a: "Go to Reports → Scheduled Reports and click Add." },
      { q: "How do I export project data?", a: "From the Projects page click Export, or use Reports → Quick Export." },
    ];
    return (
      <div className="p-6 space-y-5" style={{ color: text }}>
        <div>
          <h1 className="text-xl font-bold">Help & Support</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Documentation, FAQs, and contact information</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[{ label: "IT Support", icon: "🛠", desc: "it-support@enterprise.com" },
            { label: "User Guide", icon: "📖", desc: "Full documentation portal" },
            { label: "Release Notes", icon: "📋", desc: "v2.4.1 — Aug 2025" }
          ].map(c => (
            <div key={c.label} className="rounded-xl border p-5 text-center" style={{ background: bg, borderColor: border }}>
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="text-xs font-semibold mb-1" style={{ color: text }}>{c.label}</div>
              <div className="text-[10px]" style={{ color: muted }}>{c.desc}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: text }}>Frequently Asked Questions</h3>
          <div className="space-y-4">
            {faqs.map(f => (
              <div key={f.q} className="p-4 rounded-xl" style={{ background: subtle }}>
                <div className="text-xs font-semibold mb-1" style={{ color: text }}>Q: {f.q}</div>
                <div className="text-xs" style={{ color: muted }}>A: {f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

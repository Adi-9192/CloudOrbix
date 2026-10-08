import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowDownToLine, Calculator, Copy, FileSpreadsheet, FileText, Plus, Printer, Save, Search, Send, Trash2, Users, X } from "lucide-react";

type ResourceType = "Long Term" | "Standard" | "Moderate" | "Experts";
type ResourceRate = { grade: string; resourceType: ResourceType; dailyRate: number };
type CurrencyRate = { currency: string; rateToInr: number };
type ResourceRow = { id: string; name: string; grade: string; resourceType: ResourceType; allocations: Record<string, number | string> };
type Estimate = { id: number; projectName: string; clientName: string; year: number; currency: string; startMonth: string; endMonth: string; allowancePercent: number; workingDaysPerMonth: number; notes: string; status: string; resources: ResourceRow[] };
type RatePayload = { resourceVersions: Array<{ year: number; created_at: string; updated_at: string; updated_by: string }>; resourceRates: Array<{ year: number; grade: string; resource_type: ResourceType; daily_rate: number }>; currencyVersions: Array<{ year: number; created_at: string; updated_at: string; updated_by: string }>; exchangeRates: Array<{ year: number; currency_pair: string; rate_to_inr: number }>; resourceTypes: ResourceType[]; currencies: string[] };

const RESOURCE_TYPES: ResourceType[] = ["Long Term", "Standard", "Moderate", "Experts"];
const CURRENCIES = ["INR", "AED", "AUD", "CAD", "CHF", "DKK", "EUR", "GBP", "NOK", "SEK", "SGD", "USD"];
const FX_CURRENCIES = CURRENCIES.filter((currency) => currency !== "INR");
const fmt = (value: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
const monthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const monthLabel = (value: string) => new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en", { month: "short", year: "2-digit", timeZone: "UTC" });
const makeId = () => Math.random().toString(36).slice(2);
const blankResource = (): ResourceRow => ({ id: makeId(), name: "", grade: "", resourceType: "Standard", allocations: {} });
const emptyEstimate = (): Estimate => {
  const start = new Date();
  const end = new Date(Date.UTC(start.getFullYear(), start.getMonth() + 5, 1));
  return { id: 0, projectName: "", clientName: "", year: start.getFullYear(), currency: "INR", startMonth: monthKey(start), endMonth: monthKey(end), allowancePercent: 0, workingDaysPerMonth: 22, notes: "", status: "Draft", resources: [blankResource()] };
};

export default function RfpEstimation({ dark }: { dark: boolean }) {
  const [section, setSection] = useState<"estimate" | "resources" | "currency">("estimate");
  const [estimate, setEstimate] = useState<Estimate>(emptyEstimate);
  const [estimates, setEstimates] = useState<Array<{ id: number; project_name: string; client_name: string; year: number; status: string; grand_total_inr: number; updated_at: string }>>([]);
  const [ratePayload, setRatePayload] = useState<RatePayload | null>(null);
  const [resourceYear, setResourceYear] = useState(new Date().getFullYear());
  const [currencyYear, setCurrencyYear] = useState(new Date().getFullYear());
  const [resourceRows, setResourceRows] = useState<Array<Record<ResourceType, string> & { grade: string }>>([]);
  const [currencyRows, setCurrencyRows] = useState<Record<string, string>>(() => Object.fromEntries(FX_CURRENCIES.map((currency) => [currency, ""])));
  const [gradeSearch, setGradeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const surface = dark ? "#152333" : "#FFFFFF";
  const panel = dark ? "#1C2D3E" : "#F4F7F5";
  const line = dark ? "#34495A" : "#DCE5DF";
  const ink = dark ? "#E6EFEA" : "#14251F";
  const muted = dark ? "#9DB0A8" : "#64756D";
  const green = "#176B50";

  const api = async (path: string, init: RequestInit = {}) => {
    const token = localStorage.getItem("clmp-token");
    const response = await fetch(`/api/rfp${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers } });
    const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
    if (!response.ok) throw new Error(payload?.message || "The request could not be completed.");
    return payload;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cards, projects] = await Promise.all([api("/rates"), api("/projects")]);
      setRatePayload(cards);
      setEstimates(projects.projects || []);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load RFP workspace."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadAll(); }, []);

  useEffect(() => {
    const entries = (ratePayload?.resourceRates || []).filter((row) => Number(row.year) === resourceYear);
    const byGrade = new Map<string, Record<ResourceType, string> & { grade: string }>();
    entries.forEach((row) => {
      const item = byGrade.get(row.grade) || { grade: row.grade, "Long Term": "", Standard: "", Moderate: "", Experts: "" };
      item[row.resource_type] = String(row.daily_rate);
      byGrade.set(row.grade, item);
    });
    setResourceRows([...byGrade.values()]);
  }, [ratePayload, resourceYear]);

  useEffect(() => {
    const entries = (ratePayload?.exchangeRates || []).filter((row) => Number(row.year) === currencyYear);
    setCurrencyRows(Object.fromEntries(FX_CURRENCIES.map((currency) => [currency, String(entries.find((row) => row.currency_pair === `${currency}/INR`)?.rate_to_inr ?? "")])));
  }, [ratePayload, currencyYear]);

  const months = useMemo(() => {
    const start = new Date(`${estimate.startMonth}-01T00:00:00Z`);
    const end = new Date(`${estimate.endMonth}-01T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
    const result: string[] = [];
    while (start <= end && result.length < 120) { result.push(monthKey(start)); start.setUTCMonth(start.getUTCMonth() + 1); }
    return result;
  }, [estimate.startMonth, estimate.endMonth]);

  const rateLookup = useMemo(() => new Map((ratePayload?.resourceRates || []).filter((row) => Number(row.year) === Number(estimate.year)).map((row) => [`${row.grade}|${row.resource_type}`, Number(row.daily_rate)])), [estimate.year, ratePayload]);
  const yearlyExchange = useMemo(() => new Map((ratePayload?.exchangeRates || []).filter((row) => Number(row.year) === Number(estimate.year)).map((row) => [row.currency_pair, Number(row.rate_to_inr)])), [estimate.year, ratePayload]);
  const resourceCosts = estimate.resources.map((resource) => {
    const dailyRate = rateLookup.get(`${resource.grade}|${resource.resourceType}`) || 0;
    const monthly = Object.fromEntries(months.map((month) => [month, dailyRate * Number(estimate.workingDaysPerMonth || 0) * Number(resource.allocations[month] || 0)]));
    return { id: resource.id, monthly, total: Object.values(monthly).reduce((sum, cost) => sum + cost, 0), missingRate: Boolean(resource.grade && !rateLookup.has(`${resource.grade}|${resource.resourceType}`)) };
  });
  const baseCost = resourceCosts.reduce((sum, row) => sum + row.total, 0);
  const allowanceCost = baseCost * Number(estimate.allowancePercent || 0) / 100;
  const grandTotal = baseCost + allowanceCost;
  const exchangeRate = estimate.currency === "INR" ? 1 : yearlyExchange.get(`${estimate.currency}/INR`) || 0;
  const selectedTotal = exchangeRate ? grandTotal / exchangeRate : 0;
  const gradeOptions = [...new Set((ratePayload?.resourceRates || []).filter((row) => Number(row.year) === Number(estimate.year)).map((row) => row.grade))].sort();

  const patchEstimate = (patch: Partial<Estimate>) => setEstimate((current) => ({ ...current, ...patch }));
  const patchResource = (id: string, patch: Partial<ResourceRow>) => setEstimate((current) => ({ ...current, resources: current.resources.map((row) => row.id === id ? { ...row, ...patch } : row) }));
  const setAllocation = (resource: ResourceRow, month: string, fte: string) => patchResource(resource.id, { allocations: { ...resource.allocations, [month]: fte } });
  const updateRateCell = (index: number, key: string, value: string) => setResourceRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));

  const saveResourceRates = async (cloneFrom?: number) => {
    if (!cloneFrom && resourceRows.some((row) => !row.grade.trim() || RESOURCE_TYPES.some((type) => row[type].trim() === ""))) { setError("Complete every grade and daily rate before saving the version."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (cloneFrom) await api(`/rates/resource/${resourceYear}/clone`, { method: "POST", body: JSON.stringify({ sourceYear: cloneFrom }) });
      else await api(`/rates/resource/${resourceYear}`, { method: "POST", body: JSON.stringify({ rates: resourceRows.flatMap((row) => RESOURCE_TYPES.map((resourceType) => ({ grade: row.grade, resourceType, dailyRate: Number(row[resourceType]) }))) }) });
      await loadAll(); setMessage(`Resource rates for ${resourceYear} saved.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save resource rates."); }
    finally { setBusy(false); }
  };

  const saveCurrencyRates = async (cloneFrom?: number) => {
    if (!cloneFrom && FX_CURRENCIES.some((currency) => !currencyRows[currency]?.trim())) { setError("Enter every exchange rate before saving the version."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (cloneFrom) await api(`/rates/currency/${currencyYear}/clone`, { method: "POST", body: JSON.stringify({ sourceYear: cloneFrom }) });
      else await api(`/rates/currency/${currencyYear}`, { method: "POST", body: JSON.stringify({ rates: FX_CURRENCIES.map((currency) => ({ currency, rateToInr: Number(currencyRows[currency]) })) }) });
      await loadAll(); setMessage(`Exchange rates for ${currencyYear} saved.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save exchange rates."); }
    finally { setBusy(false); }
  };

  const deleteVersion = async (kind: "resource" | "currency", year: number) => {
    if (!window.confirm(`Delete the ${year} ${kind === "resource" ? "resource rate" : "exchange rate"} version?`)) return;
    setBusy(true); setError("");
    try { await api(`/rates/${kind}/${year}`, { method: "DELETE" }); await loadAll(); setMessage(`${year} version deleted.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete the selected version."); }
    finally { setBusy(false); }
  };

  const loadEstimate = async (id: number) => {
    setBusy(true); setError("");
    try {
      const result = await api(`/projects/${id}`);
      const project = result.project;
      setEstimate({ id: project.id, projectName: project.project_name, clientName: project.client_name, year: Number(project.year), currency: project.currency_code, startMonth: new Date(project.start_month).toISOString().slice(0, 7), endMonth: new Date(project.end_month).toISOString().slice(0, 7), allowancePercent: Number(project.allowance_percent), workingDaysPerMonth: Number(project.working_days_per_month), notes: project.notes || "", status: project.status, resources: result.resources.map((row: ResourceRow) => ({ ...row, id: String(row.id) })) });
      setSection("estimate");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to open estimate."); }
    finally { setBusy(false); }
  };

  const saveEstimate = async (status: "Draft" | "Submitted" = "Draft") => {
    setBusy(true); setError(""); setMessage("");
    try {
      const body = { ...estimate, status, resources: estimate.resources.map(({ name, grade, resourceType, allocations }) => ({ name, grade, resourceType, allocations })) };
      const result = await api(estimate.id ? `/projects/${estimate.id}` : "/projects", { method: estimate.id ? "PUT" : "POST", body: JSON.stringify(body) });
      setEstimate((current) => ({ ...current, id: result.id, status }));
      setMessage(status === "Submitted" ? "Estimate submitted." : "Draft saved.");
      const projects = await api("/projects"); setEstimates(projects.projects || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save estimate."); }
    finally { setBusy(false); }
  };

  const duplicateEstimate = async () => {
    if (!estimate.id) { setError("Save this estimate before duplicating it."); return; }
    setBusy(true); setError("");
    try { const result = await api(`/projects/${estimate.id}/duplicate`, { method: "POST" }); await loadAll(); await loadEstimate(result.id); setMessage("Estimate duplicated as a new draft."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to duplicate estimate."); }
    finally { setBusy(false); }
  };

  const exportExcel = async () => {
    if (!estimate.id) { setError("Save the estimate before exporting it."); return; }
    setBusy(true); setError("");
    try {
      const token = localStorage.getItem("clmp-token");
      const response = await fetch(`/api/rfp/projects/${estimate.id}/export.xlsx`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Excel export could not be generated.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `rfp-estimate-${estimate.id}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to export estimate."); }
    finally { setBusy(false); }
  };

  const inputClass = "w-full rounded border px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-700/20";
  const inputStyle = { background: dark ? "#10202E" : "#FFFFFF", borderColor: line, color: ink };
  const labelStyle = { color: muted };
  const yearChoices = [...new Set([...(ratePayload?.resourceVersions || []).map((row) => Number(row.year)), ...(ratePayload?.currencyVersions || []).map((row) => Number(row.year)), new Date().getFullYear(), resourceYear, currencyYear])].sort((a, b) => b - a);

  return <div className="rfp-page min-h-full" style={{ color: ink }}>
    <div className="rfp-toolbar sticky top-0 z-20 border-b px-5 py-3 md:px-8" style={{ background: surface, borderColor: line }}>
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md text-white" style={{ background: green }}><Calculator className="h-5 w-5" /></div><div><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>PMO / Commercial</div><h1 className="text-lg font-bold">RFP Estimation</h1></div></div>
        <div className="flex flex-wrap items-center gap-2">
          {section === "estimate" && <>
            <button onClick={() => void exportExcel()} disabled={busy} className="rfp-action"><FileSpreadsheet size={15} /> Excel</button>
            <button onClick={() => window.print()} className="rfp-action"><FileText size={15} /> PDF</button>
            <button onClick={() => window.print()} className="rfp-icon-action" title="Print" aria-label="Print"><Printer size={16} /></button>
            <button onClick={() => void saveEstimate("Draft")} disabled={busy} className="rfp-action"><Save size={15} /> Save Draft</button>
            <button onClick={() => void saveEstimate("Submitted")} disabled={busy} className="rfp-primary"><Send size={15} /> Submit</button>
          </>}
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-8 md:py-7">
      <div className="mb-5 flex gap-1 border-b" style={{ borderColor: line }} role="tablist" aria-label="RFP sections">
        {([{ id: "estimate", label: "Project Estimation", icon: FileSpreadsheet }, { id: "resources", label: "Resource Rate Card", icon: Users }, { id: "currency", label: "Currency Exchange", icon: Archive }] as const).map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={section === id} onClick={() => { setSection(id); setError(""); setMessage(""); }} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${section === id ? "border-emerald-700" : "border-transparent"}`} style={{ color: section === id ? green : muted }}><Icon size={16} />{label}</button>)}
      </div>
      {error && <div role="alert" className="mb-4 flex items-center justify-between rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
      {message && <div role="status" className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>}
      {loading ? <div className="py-20 text-center text-sm" style={{ color: muted }}>Loading estimation workspace…</div> : <>
        {section === "resources" && <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Commercial configuration</div><h2 className="mt-1 text-xl font-bold">Resource Rate Card</h2><p className="mt-1 text-sm" style={{ color: muted }}>INR daily billing rates by grade and delivery model.</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-semibold" style={labelStyle}>Rate year<select className={`${inputClass} mt-1 min-w-28`} style={inputStyle} value={resourceYear} onChange={(event) => setResourceYear(Number(event.target.value))}>{yearChoices.map((year) => <option key={year}>{year}</option>)}</select></label><button className="rfp-action" onClick={() => { const newYear = Math.max(new Date().getFullYear(), ...yearChoices) + 1; setResourceYear(newYear); setResourceRows([]); }}><Plus size={15} /> Add Year</button><button className="rfp-action" disabled={busy || !ratePayload?.resourceVersions.length} onClick={() => { const previous = ratePayload?.resourceVersions.filter((item) => item.year < resourceYear).sort((a, b) => b.year - a.year)[0]; if (previous) void saveResourceRates(previous.year); }}><Copy size={15} /> Clone Previous</button><button className="rfp-primary" disabled={busy} onClick={() => void saveResourceRates()}><Save size={15} /> Save Version</button></div></div>
          <div className="overflow-x-auto rounded-md border" style={{ borderColor: line, background: surface }}><table className="w-full min-w-[880px] border-collapse text-left text-sm"><thead><tr style={{ background: panel }}><th className="p-3 text-xs uppercase" style={{ color: muted }}>Grade</th>{RESOURCE_TYPES.map((type) => <th key={type} className="p-3 text-xs uppercase" style={{ color: muted }}>{type} · INR/day</th>)}<th className="p-3" /></tr></thead><tbody>{resourceRows.filter((row) => row.grade.toLowerCase().includes(gradeSearch.toLowerCase())).map((row) => { const index = resourceRows.indexOf(row); return <tr key={`${row.grade}-${index}`} className="border-t" style={{ borderColor: line }}><td className="p-2"><input aria-label="Grade" className={inputClass} style={inputStyle} value={row.grade} onChange={(event) => updateRateCell(index, "grade", event.target.value)} placeholder="C1" /></td>{RESOURCE_TYPES.map((type) => <td key={type} className="p-2"><input aria-label={`${row.grade || "New grade"} ${type} daily rate`} type="number" min="0" step="0.01" className={inputClass} style={inputStyle} value={row[type]} onChange={(event) => updateRateCell(index, type, event.target.value)} placeholder="0.00" /></td>)}<td className="p-2"><button className="rfp-icon-action text-red-600" aria-label="Delete grade row" onClick={() => setResourceRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}><Trash2 size={15} /></button></td></tr>; })}</tbody></table></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><button className="rfp-action" onClick={() => setResourceRows((rows) => [...rows, { grade: "", "Long Term": "", Standard: "", Moderate: "", Experts: "" }])}><Plus size={15} /> Add Grade</button><div className="flex items-center gap-2"><Search size={15} style={{ color: muted }} /><input className={`${inputClass} max-w-56`} style={inputStyle} value={gradeSearch} onChange={(event) => setGradeSearch(event.target.value)} placeholder="Search grade" /></div></div>
          <div className="flex flex-wrap items-center justify-between border-t pt-4 text-xs" style={{ borderColor: line, color: muted }}><span>Version audit</span>{ratePayload?.resourceVersions.find((version) => version.year === resourceYear) ? <span>Updated {new Date(ratePayload.resourceVersions.find((version) => version.year === resourceYear)!.updated_at).toLocaleString()} by {ratePayload.resourceVersions.find((version) => version.year === resourceYear)!.updated_by || "Admin"}</span> : <span>Unsaved year version</span>}<button className="text-red-700 disabled:opacity-40" disabled={!ratePayload?.resourceVersions.some((version) => version.year === resourceYear)} onClick={() => void deleteVersion("resource", resourceYear)}>Delete version</button></div>
        </section>}

        {section === "currency" && <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Commercial configuration</div><h2 className="mt-1 text-xl font-bold">Currency Exchange Rate Card</h2><p className="mt-1 text-sm" style={{ color: muted }}>INR equivalent for one unit of the selected currency.</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-semibold" style={labelStyle}>Rate year<select className={`${inputClass} mt-1 min-w-28`} style={inputStyle} value={currencyYear} onChange={(event) => setCurrencyYear(Number(event.target.value))}>{yearChoices.map((year) => <option key={year}>{year}</option>)}</select></label><button className="rfp-action" onClick={() => { const newYear = Math.max(new Date().getFullYear(), ...yearChoices) + 1; setCurrencyYear(newYear); setCurrencyRows(Object.fromEntries(FX_CURRENCIES.map((currency) => [currency, ""]))); }}><Plus size={15} /> Add Year</button><button className="rfp-action" disabled={busy || !ratePayload?.currencyVersions.length} onClick={() => { const previous = ratePayload?.currencyVersions.filter((item) => item.year < currencyYear).sort((a, b) => b.year - a.year)[0]; if (previous) void saveCurrencyRates(previous.year); }}><Copy size={15} /> Copy Previous</button><button className="rfp-primary" disabled={busy} onClick={() => void saveCurrencyRates()}><Save size={15} /> Save Version</button></div></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{FX_CURRENCIES.map((currency) => <label key={currency} className="rounded-md border p-4" style={{ background: surface, borderColor: line }}><span className="text-xs font-semibold uppercase" style={{ color: muted }}>{currency}/INR</span><div className="mt-2 flex items-center gap-2"><span className="text-sm" style={{ color: muted }}>₹</span><input aria-label={`${currency} to INR`} type="number" min="0.000001" step="0.000001" className={inputClass} style={inputStyle} value={currencyRows[currency] || ""} onChange={(event) => setCurrencyRows((current) => ({ ...current, [currency]: event.target.value }))} placeholder="0.000000" /></div></label>)}</div>
          <div className="flex flex-wrap items-center justify-between border-t pt-4 text-xs" style={{ borderColor: line, color: muted }}><span>Version audit</span>{ratePayload?.currencyVersions.find((version) => version.year === currencyYear) ? <span>Updated {new Date(ratePayload.currencyVersions.find((version) => version.year === currencyYear)!.updated_at).toLocaleString()} by {ratePayload.currencyVersions.find((version) => version.year === currencyYear)!.updated_by || "Admin"}</span> : <span>Unsaved year version</span>}<button className="text-red-700 disabled:opacity-40" disabled={!ratePayload?.currencyVersions.some((version) => version.year === currencyYear)} onClick={() => void deleteVersion("currency", currencyYear)}>Delete version</button></div>
        </section>}

        {section === "estimate" && <div className="space-y-5">
          <section className="rounded-md border p-4 md:p-5" style={{ background: surface, borderColor: line }}>
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-bold">Project information</h2><p className="mt-1 text-xs" style={{ color: muted }}>Estimate {estimate.id ? `#${estimate.id}` : "not saved"} · {estimate.status}</p></div><div className="flex gap-2"><button className="rfp-action" onClick={() => { setEstimate(emptyEstimate()); setError(""); setMessage(""); }}><Plus size={15} /> New estimate</button>{estimate.id > 0 && <button className="rfp-action" onClick={() => void duplicateEstimate()}><Copy size={15} /> Duplicate</button>}</div></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
              ["Project Name", estimate.projectName, (value: string) => patchEstimate({ projectName: value }), "text"], ["Client Name", estimate.clientName, (value: string) => patchEstimate({ clientName: value }), "text"], ["Year", String(estimate.year), (value: string) => patchEstimate({ year: Number(value) }), "number"], ["Currency", estimate.currency, (value: string) => patchEstimate({ currency: value }), "currency"], ["Start Month", estimate.startMonth, (value: string) => patchEstimate({ startMonth: value }), "month"], ["End Month", estimate.endMonth, (value: string) => patchEstimate({ endMonth: value }), "month"], ["Allowance %", String(estimate.allowancePercent), (value: string) => patchEstimate({ allowancePercent: Number(value) }), "number"], ["Working Days / Month", String(estimate.workingDaysPerMonth), (value: string) => patchEstimate({ workingDaysPerMonth: Number(value) }), "number"],
            ].map(([label, value, onChange, type]) => <label key={String(label)} className="text-xs font-semibold" style={labelStyle}>{String(label)}{type === "currency" ? <select className={`${inputClass} mt-1`} style={inputStyle} value={String(value)} onChange={(event) => (onChange as (value: string) => void)(event.target.value)}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select> : <input className={`${inputClass} mt-1`} style={inputStyle} type={String(type)} min={type === "number" && label === "Allowance %" ? 0 : undefined} max={label === "Allowance %" ? 100 : undefined} value={String(value)} onChange={(event) => (onChange as (value: string) => void)(event.target.value)} />}</label>)}
              <label className="text-xs font-semibold sm:col-span-2 xl:col-span-4" style={labelStyle}>Notes<textarea className={`${inputClass} mt-1 min-h-20 resize-y`} style={inputStyle} value={estimate.notes} onChange={(event) => patchEstimate({ notes: event.target.value })} placeholder="Assumptions, scope notes, or commercial exclusions" /></label>
            </div>
          </section>

          <section className="rounded-md border" style={{ background: surface, borderColor: line }}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4" style={{ borderColor: line }}><div><h2 className="text-base font-bold">Monthly resource plan</h2><p className="mt-1 text-xs" style={{ color: muted }}>{months.length} month columns · rates automatically use {estimate.year} version</p></div><button className="rfp-action" onClick={() => setEstimate((current) => ({ ...current, resources: [...current.resources, blankResource()] }))}><Plus size={15} /> Add Resource</button></div>
            <div className="rfp-grid-scroll overflow-auto">
              <table className="rfp-grid w-full border-collapse text-left text-xs"><thead><tr style={{ background: panel }}><th className="rfp-sticky-1 min-w-52 p-3">Resource Name</th><th className="rfp-sticky-2 min-w-28 p-3">Grade</th><th className="rfp-sticky-3 min-w-36 p-3">Resource Type</th>{months.map((month) => <th key={month} className="min-w-24 border-l p-2 text-center" style={{ borderColor: line }}>{monthLabel(month)}</th>)}<th className="min-w-36 border-l p-3 text-right" style={{ borderColor: line }}>Total Cost (INR)</th><th className="min-w-20 p-2">Actions</th></tr></thead><tbody>{estimate.resources.map((resource, rowIndex) => { const cost = resourceCosts[rowIndex]; return <tr key={resource.id} className="border-t" style={{ borderColor: line }}><td className="rfp-sticky-1 p-2"><input className={inputClass} style={inputStyle} value={resource.name} onChange={(event) => patchResource(resource.id, { name: event.target.value })} aria-label="Resource name" placeholder="e.g. Infra Architect" /></td><td className="rfp-sticky-2 p-2"><select className={inputClass} style={inputStyle} value={resource.grade} onChange={(event) => patchResource(resource.id, { grade: event.target.value })} aria-label="Grade"><option value="">Select</option>{gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}</select></td><td className="rfp-sticky-3 p-2"><select className={inputClass} style={inputStyle} value={resource.resourceType} onChange={(event) => patchResource(resource.id, { resourceType: event.target.value as ResourceType })} aria-label="Resource type">{RESOURCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></td>{months.map((month) => <td key={month} className="border-l p-2" style={{ borderColor: line }}><input type="number" min="0" max="999.99" step="0.01" className={`${inputClass} px-1 text-center`} style={inputStyle} value={resource.allocations[month] ?? 0} onChange={(event) => setAllocation(resource, month, event.target.value)} aria-label={`${monthLabel(month)} allocation in FTE`} /></td>)}<td className="border-l p-3 text-right font-semibold tabular-nums" style={{ color: cost.missingRate ? "#B45309" : ink, borderColor: line }} title={cost.missingRate ? "No rate exists for this year, grade, and type" : undefined}>{cost.missingRate ? "Rate missing" : fmt(cost.total)}</td><td className="p-2"><div className="flex items-center gap-1"><button className="rfp-icon-action" title="Duplicate row" aria-label="Duplicate resource row" onClick={() => setEstimate((current) => { const original = current.resources.find((item) => item.id === resource.id)!; return { ...current, resources: [...current.resources.slice(0, rowIndex + 1), { ...original, id: makeId(), allocations: { ...original.allocations } }, ...current.resources.slice(rowIndex + 1)] }; })}><Copy size={14} /></button><button className="rfp-icon-action text-red-600" title="Delete row" aria-label="Delete resource row" onClick={() => setEstimate((current) => ({ ...current, resources: current.resources.filter((item) => item.id !== resource.id) }))}><Trash2 size={14} /></button></div></td></tr>; })}
                <tr className="border-t font-semibold" style={{ background: panel, borderColor: line }}><td className="rfp-sticky-1 p-3" colSpan={3}>Total Monthly FTE</td>{months.map((month) => <td key={month} className="border-l p-3 text-center tabular-nums" style={{ borderColor: line }}>{estimate.resources.reduce((sum, row) => sum + Number(row.allocations[month] || 0), 0).toLocaleString("en", { maximumFractionDigits: 2 })}</td>)}<td className="border-l p-3 text-right" style={{ borderColor: line }}>{fmt(baseCost)}</td><td /></tr>
              </tbody></table>
            </div>
            {months.length === 0 && <div className="p-4 text-sm text-amber-700">Choose a valid start and end month to generate the planning grid.</div>}
            {gradeOptions.length === 0 && <div className="border-t px-4 py-3 text-xs text-amber-700" style={{ borderColor: line }}>No resource rates are configured for {estimate.year}. Add a version in Resource Rate Card to calculate and save this estimate.</div>}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rfp-register rounded-md border p-4" style={{ background: surface, borderColor: line }}><h2 className="text-sm font-bold">Estimate register</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead><tr style={{ color: muted }}><th className="py-2">Project / Client</th><th className="py-2">Year</th><th className="py-2">Status</th><th className="py-2 text-right">Grand total INR</th><th /></tr></thead><tbody>{estimates.map((item) => <tr key={item.id} className="border-t" style={{ borderColor: line }}><td className="py-2"><button className="font-semibold hover:underline" onClick={() => void loadEstimate(item.id)}>{item.project_name}</button><div className="mt-0.5" style={{ color: muted }}>{item.client_name}</div></td><td>{item.year}</td><td>{item.status}</td><td className="text-right tabular-nums">{fmt(Number(item.grand_total_inr || 0))}</td><td className="text-right"><button className="rfp-icon-action" title="Open estimate" onClick={() => void loadEstimate(item.id)}><ArrowDownToLine size={14} /></button></td></tr>)}{!estimates.length && <tr><td colSpan={5} className="py-5 text-center" style={{ color: muted }}>No saved estimates yet.</td></tr>}</tbody></table></div></div>
            <div className="rounded-md border p-4" style={{ background: surface, borderColor: line }}><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>Live cost summary</div><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span style={{ color: muted }}>Base resource cost</span><strong>{fmt(baseCost)}</strong></div><div className="flex justify-between gap-3"><span style={{ color: muted }}>Allowance · {Number(estimate.allowancePercent || 0)}%</span><strong>{fmt(allowanceCost)}</strong></div><div className="flex justify-between gap-3 border-t pt-3" style={{ borderColor: line }}><span className="font-semibold">Grand total INR</span><strong className="text-base">{fmt(grandTotal)}</strong></div><div className="flex justify-between gap-3"><span style={{ color: muted }}>{estimate.currency} total</span><strong>{exchangeRate ? fmt(selectedTotal, estimate.currency) : "Rate not configured"}</strong></div><div className="pt-1 text-[11px]" style={{ color: muted }}>{estimate.currency === "INR" ? "INR is the base currency." : exchangeRate ? `1 ${estimate.currency} = ₹${exchangeRate.toLocaleString("en-IN")}` : `Missing ${estimate.year} ${estimate.currency}/INR rate.`}</div></div></div>
          </section>
        </div>}
      </>}
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
  </div>;
}
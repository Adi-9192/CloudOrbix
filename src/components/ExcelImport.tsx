import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, RefreshCw, Eye, Trash2, ChevronRight } from "lucide-react";
import { showCloudOrbixAlert } from "../alert";

interface ExcelImportProps { dark: boolean; }

const TEMPLATES = [
  { name: "New Project Import", desc: "Template for importing new project records", rows: "Includes all required fields", icon: "👤" },
  { name: "Project Updates", desc: "Template for bulk updating existing records", rows: "ID-based delta updates", icon: "✏️" },
  { name: "Service Mapping", desc: "Map services to existing projects in bulk", rows: "Project ID + service columns", icon: "🔗" },
  { name: "Revenue Reports", desc: "Import monthly revenue figures per project", rows: "Project ID + revenue + period", icon: "💰" },
];

export default function ExcelImport({ dark }: ExcelImportProps) {
  const [stage, setStage] = useState<"idle" | "preview" | "done">("idle");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewRows, setPreviewRows] = useState<{ clientId: string; clientName: string; completion: number; currentStatus: string }[]>([]);
  const [summary, setSummary] = useState({ totalProcessed: 0, imported: 0, updated: 0, duplicates: 0, failed: 0 });
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const subtle = dark ? "#0F172A" : "#F8FAFC";

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setFileName(file.name);
    setError("");
    setUploading(true);
    setProgress(0);
    const body = new FormData();
    body.append("file", file);
    try {
      setProgress(30);
      const response = await fetch("/api/excel/upload", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("clmp-token")}` }, body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Import failed.");
      setSummary(payload.summary);
      setPreviewRows(payload.records || []);
      setProgress(100);
      setStage("preview");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Import failed.");
      showCloudOrbixAlert(uploadError instanceof Error ? uploadError.message : "Import failed.", "error");
    } finally { setUploading(false); }
  };

  const STATS = [
    { label: "Records Processed", value: summary.totalProcessed, icon: "📋", color: "#1E40AF", bg: "#DBEAFE" },
    { label: "Successfully Imported", value: summary.imported, icon: "✅", color: "#16A34A", bg: "#DCFCE7" },
    { label: "Existing Updated", value: summary.updated, icon: "✏️", color: "#7C3AED", bg: "#EDE9FE" },
    { label: "Duplicates Detected", value: summary.duplicates, icon: "⚠️", color: "#D97706", bg: "#FEF3C7" },
    { label: "Failed Records", value: summary.failed, icon: "❌", color: "#DC2626", bg: "#FEE2E2" },
    { label: "Validation Errors", value: 1, icon: "🔍", color: "#64748B", bg: "#F1F5F9" },
  ];

  return (
    <div className="p-6 space-y-6" style={{ color: text }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Excel Import & Export</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>Bulk import project data · Download templates · Export reports</p>
        </div>
        {stage !== "idle" && (
          <button onClick={() => { setStage("idle"); setFileName(""); setProgress(0); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors"
            style={{ borderColor: border, color: muted, background: bg }}>
            <RefreshCw className="w-3.5 h-3.5" /> New Import
          </button>
        )}
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Upload Panel */}
        <div className="lg:col-span-2 space-y-5">
          {stage === "idle" && (
            <div className="rounded-xl border p-6" style={{ background: bg, borderColor: border }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: text }}>Upload Excel File</h3>

              {/* Drop zone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
                style={{ borderColor: dragging ? "#1E40AF" : (dark ? "#334155" : "#CBD5E1"), background: dragging ? "#EFF6FF" : subtle }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#DBEAFE" }}>
                  <FileSpreadsheet className="w-7 h-7" style={{ color: "#1E40AF" }} />
                </div>
                <p className="font-semibold text-sm mb-1" style={{ color: text }}>
                  {dragging ? "Drop your file here" : "Drag & drop your Excel file"}
                </p>
                <p className="text-xs mb-4" style={{ color: muted }}>or click to browse · Supports .xlsx and .xls files up to 50MB</p>
                <button className="px-5 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "#1E40AF" }}>
                  Browse Files
                </button>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
              </div>

              {/* Upload progress */}
              {uploading && (
                <div className="mt-4 p-4 rounded-xl border" style={{ background: subtle, borderColor: border }}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium" style={{ color: text }}>📊 {fileName}</span>
                    <span style={{ color: muted }}>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: dark ? "#334155" : "#E2E8F0" }}>
                    <div className="h-2 rounded-full transition-all duration-100" style={{ background: "#1E40AF", width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: muted }}>Validating columns · Checking duplicates · Mapping data…</p>
                </div>
              )}
            </div>
          )}

          {stage === "preview" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {STATS.map(s => (
                  <div key={s.label} className="rounded-xl border p-4 flex items-center gap-3" style={{ background: bg, borderColor: border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: s.bg }}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] leading-tight" style={{ color: muted }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="rounded-xl border overflow-hidden" style={{ background: bg, borderColor: border }}>
                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: border }}>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: text }}>Import Preview</h3>
                    <p className="text-xs mt-0.5" style={{ color: muted }}>📊 {fileName} · 5 records</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium" style={{ borderColor: border, color: muted, background: subtle }}>
                      <Eye className="w-3.5 h-3.5" /> Preview All
                    </button>
                    <button onClick={() => setStage("done")} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#1E40AF" }}>
                      <Upload className="w-3.5 h-3.5" /> Confirm Import
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: border, background: subtle }}>
                        {["Project ID", "Name", "Manager", "Region", "Industry", "Validation"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: muted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map(r => (
                        <tr key={r.clientId} className="border-b" style={{ borderColor: border }}>
                          <td className="px-4 py-2.5 font-mono text-xs" style={{ color: muted }}>{r.clientId}</td>
                          <td className="px-4 py-2.5 text-xs font-medium" style={{ color: text }}>{r.clientName}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: text }}>Imported</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: text }}>{r.completion}%</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: muted }}>{r.currentStatus}</td>
                          <td className="px-4 py-2.5 text-xs">✅ Saved</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 flex gap-2 border-t" style={{ borderColor: border }}>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" /> Rollback
                  </button>
                  <p className="text-xs my-auto ml-2" style={{ color: muted }}>Review errors before confirming. Rollback removes all staged records.</p>
                </div>
              </div>
            </>
          )}

          {stage === "done" && (
            <div className="rounded-xl border p-8 text-center" style={{ background: bg, borderColor: border }}>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-base mb-1" style={{ color: text }}>Import Successful!</h3>
              <p className="text-sm mb-6" style={{ color: muted }}>3 records imported · 1 duplicate skipped · 1 error flagged</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {STATS.slice(0, 3).map(s => (
                  <div key={s.label} className="p-3 rounded-xl border text-center" style={{ borderColor: border, background: s.bg }}>
                    <div className="text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px]" style={{ color: muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium" style={{ borderColor: border, color: muted, background: "transparent" }}>
                  <Download className="w-3.5 h-3.5" /> Download Import Log
                </button>
                <button onClick={() => setStage("idle")} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "#1E40AF" }}>
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Templates */}
        <div className="space-y-4">
          <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: text }}>Download Templates</h3>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <button key={t.name} className="w-full flex items-center gap-3 p-3 rounded-xl border text-left hover:border-blue-300 transition-colors group"
                  style={{ borderColor: border, background: subtle }}>
                  <span className="text-xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: text }}>{t.name}</div>
                    <div className="text-[10px] truncate" style={{ color: muted }}>{t.rows}</div>
                  </div>
                  <Download className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-blue-600 transition-colors" style={{ color: muted }} />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: text }}>Import History</h3>
            <div className="space-y-2.5">
              {[
                { name: "bulk_clients_aug.xlsx", date: "Aug 13", count: 14, status: "success" },
                { name: "updates_q3.xlsx", date: "Aug 5", count: 8, status: "success" },
                { name: "new_clients_jul.xlsx", date: "Jul 28", count: 11, status: "partial" },
                { name: "revenue_q2.xlsx", date: "Jul 1", count: 104, status: "success" },
              ].map(h => (
                <div key={h.name} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: subtle }}>
                  <FileSpreadsheet className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: text }}>{h.name}</div>
                    <div className="text-[10px]" style={{ color: muted }}>{h.date} · {h.count} records</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${h.status === "success" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {h.status === "success" ? "✓" : "~"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

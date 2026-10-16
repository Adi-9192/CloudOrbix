import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Eye,
  Trash2,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { showCloudOrbixAlert } from "../alert";

interface ExcelImportProps {
  dark: boolean;
}

interface ImportPreviewRow {
  rowNumber: number;
  clientId: string;
  year: number;
  clientName: string;
  manager: string;
  projectBillingCode: string | null;
  voumetric: number | null;
  region: string;
  currentStatus: string;
  revenue: number;
  completion: number;
  hyperscaler: string;
  projectType: string;
  projectBrief: string;
  isow: string;
  estimatedStart: string | null;
  estimatedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  importKind: string;
  duplicateInFile: boolean;
  duplicateAction?: "new" | "update";
}

const previewColumns: { key: keyof ImportPreviewRow; label: string }[] = [
  { key: "clientId", label: "Project ID" },
  { key: "year", label: "Year" },
  { key: "clientName", label: "Project Name" },
  { key: "manager", label: "Manager" },
  { key: "projectBillingCode", label: "Project Billing Code" },
  { key: "voumetric", label: "Volumetric" },
  { key: "region", label: "Region" },
  { key: "currentStatus", label: "Status" },
  { key: "revenue", label: "Revenue" },
  { key: "completion", label: "Completion" },
  { key: "hyperscaler", label: "Hyperscaler" },
  { key: "projectType", label: "Project Type" },
  { key: "projectBrief", label: "Project Brief" },
  { key: "isow", label: "ISOW" },
  { key: "estimatedStart", label: "Planned Start Date" },
  { key: "estimatedEnd", label: "Planned End Date" },
  { key: "actualStart", label: "Actual Start Date" },
  { key: "actualEnd", label: "Actual End Date" },
];

const TEMPLATES = [
  {
    name: "New Project Import",
    desc: "Template for importing new project records",
    rows: "Includes all required fields",
    icon: "👤",
  },
  {
    name: "Project Updates",
    desc: "Template for bulk updating existing records",
    rows: "ID-based delta updates",
    icon: "✏️",
  },
  {
    name: "Service Mapping",
    desc: "Map services to existing projects in bulk",
    rows: "Project ID + service columns",
    icon: "🔗",
  },
  {
    name: "Revenue Reports",
    desc: "Import monthly revenue figures per project",
    rows: "Project ID + revenue + period",
    icon: "💰",
  },
];

export default function ExcelImport({ dark }: ExcelImportProps) {
  const [stage, setStage] = useState<"idle" | "preview" | "done">("idle");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [duplicateDecisions, setDuplicateDecisions] = useState<
    Map<number, "accept" | "reject">
  >(new Map());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState({
    totalProcessed: 0,
    imported: 0,
    updated: 0,
    duplicates: 0,
    failed: 0,
  });
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const subtle = dark ? "#0F172A" : "#F8FAFC";

  const downloadProjectTemplate = async () => {
    try {
      const response = await fetch("/api/excel/template", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clmp-token")}`,
        },
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Unable to download the template.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cloudorbix-project-template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      showCloudOrbixAlert(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the template.",
        "error",
      );
    }
  };

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
    setImportWarnings([]);
    setUploading(true);
    setProgress(0);
    const body = new FormData();
    body.append("file", file);
    body.append("preview", "true");
    try {
      setProgress(30);
      const response = await fetch("/api/excel/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clmp-token")}`,
        },
        body,
      });
      const payload = await response.json();
      if (!response.ok) {
        const details = Array.isArray(payload.errors)
          ? `\n${payload.errors.join("\n")}`
          : "";
        throw new Error(`${payload.message || "Import failed."}${details}`);
      }
      setSummary(payload.summary);
      setPreviewRows(payload.records || []);
      setSelectedFile(file);
      setSelectedRows(new Set());
      setDuplicateDecisions(new Map());
      setImportWarnings(payload.warnings || []);
      setProgress(100);
      setStage("preview");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Import failed.",
      );
      showCloudOrbixAlert(
        uploadError instanceof Error ? uploadError.message : "Import failed.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const confirmImport = async (
    rowsToImport: number[],
    rejectedDuplicateRows: number[],
  ) => {
    if (
      !selectedFile ||
      (!rowsToImport.length && !rejectedDuplicateRows.length)
    ) {
      return;
    }
    setConfirming(true);
    setError("");
    const body = new FormData();
    body.append("file", selectedFile);
    body.append("selectedRows", JSON.stringify(rowsToImport));
    body.append("rejectedRows", JSON.stringify(rejectedDuplicateRows));

    try {
      const response = await fetch("/api/excel/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clmp-token")}`,
        },
        body,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to confirm the selected imports.");
      }
      setSummary(payload.summary);
      setStage("done");
    } catch (confirmError) {
      const message = confirmError instanceof Error
        ? confirmError.message
        : "Unable to confirm the selected imports.";
      setError(message);
      showCloudOrbixAlert(message, "error");
    } finally {
      setConfirming(false);
    }
  };

  const decideDuplicate = (
    rowNumber: number,
    decision: "accept" | "reject",
  ) => {
    setDuplicateDecisions((current) =>
      new Map(current).set(rowNumber, decision),
    );
    setSelectedRows((current) => {
      const next = new Set(current);
      if (decision === "accept") next.add(rowNumber);
      else next.delete(rowNumber);
      return next;
    });
  };

  const duplicateRows = previewRows.filter((row) => row.duplicateInFile);
  const unresolvedDuplicates = duplicateRows.filter(
    (row) => !duplicateDecisions.has(row.rowNumber),
  );
  const rejectedDuplicateRows = duplicateRows
    .filter((row) => duplicateDecisions.get(row.rowNumber) === "reject")
    .map((row) => row.rowNumber);

  const rejectAll = () => {
    setSelectedRows(new Set());
    setDuplicateDecisions(new Map());
    setPreviewRows([]);
    setSelectedFile(null);
    setStage("idle");
    showCloudOrbixAlert("All staged project rows were rejected.", "info");
  };

  const STATS = [
    {
      label: "Records Processed",
      value: summary.totalProcessed,
      icon: "📋",
      color: "#1E40AF",
      bg: "#DBEAFE",
    },
    {
      label: "Successfully Imported",
      value: summary.imported,
      icon: "✅",
      color: "#16A34A",
      bg: "#DCFCE7",
    },
    {
      label: "Existing Updated",
      value: summary.updated,
      icon: "✏️",
      color: "#7C3AED",
      bg: "#EDE9FE",
    },
    {
      label: "Duplicates Detected",
      value: summary.duplicates,
      icon: "⚠️",
      color: "#D97706",
      bg: "#FEF3C7",
    },
    {
      label: "Failed Records",
      value: summary.failed,
      icon: "❌",
      color: "#DC2626",
      bg: "#FEE2E2",
    },
    {
      label: "Validation Errors",
      value: 1,
      icon: "🔍",
      color: "#64748B",
      bg: "#F1F5F9",
    },
  ];

  return (
    <div className="p-6 space-y-6" style={{ color: text }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Excel Import & Export</h1>
          <p className="text-xs mt-0.5" style={{ color: muted }}>
            Bulk import project data · Download templates · Export reports
          </p>
        </div>
        {stage !== "idle" && (
          <button
            onClick={() => {
              setStage("idle");
              setFileName("");
              setProgress(0);
              setPreviewRows([]);
              setSelectedRows(new Set());
              setDuplicateDecisions(new Map());
              setSelectedFile(null);
              setError("");
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors"
            style={{ borderColor: border, color: muted, background: bg }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> New Import
          </button>
        )}
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Upload Panel */}
        <div className="lg:col-span-2 space-y-5">
          {stage === "idle" && (
            <div
              className="rounded-xl border p-6"
              style={{ background: bg, borderColor: border }}
            >
              <h3
                className="font-semibold text-sm mb-4"
                style={{ color: text }}
              >
                Upload Excel File
              </h3>

              {/* Drop zone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
                style={{
                  borderColor: dragging
                    ? "#1E40AF"
                    : dark
                      ? "#334155"
                      : "#CBD5E1",
                  background: dragging ? "#EFF6FF" : subtle,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#DBEAFE" }}
                >
                  <FileSpreadsheet
                    className="w-7 h-7"
                    style={{ color: "#1E40AF" }}
                  />
                </div>
                <p
                  className="font-semibold text-sm mb-1"
                  style={{ color: text }}
                >
                  {dragging
                    ? "Drop your file here"
                    : "Drag & drop your Excel file"}
                </p>
                <p className="text-xs mb-4" style={{ color: muted }}>
                  or click to browse · Supports .xlsx and .xls files up to 50MB
                </p>
                <button
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "#1E40AF" }}
                >
                  Browse Files
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>

              {/* Upload progress */}
              {uploading && (
                <div
                  className="mt-4 p-4 rounded-xl border"
                  style={{ background: subtle, borderColor: border }}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium" style={{ color: text }}>
                      📊 {fileName}
                    </span>
                    <span style={{ color: muted }}>{progress}%</span>
                  </div>
                  <div
                    className="h-2 rounded-full"
                    style={{ background: dark ? "#334155" : "#E2E8F0" }}
                  >
                    <div
                      className="h-2 rounded-full transition-all duration-100"
                      style={{ background: "#1E40AF", width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: muted }}>
                    Validating columns · Checking duplicates · Mapping data…
                  </p>
                </div>
              )}
            </div>
          )}

          {stage === "preview" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {STATS.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border p-4 flex items-center gap-3"
                    style={{ background: bg, borderColor: border }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: s.bg }}
                    >
                      {s.icon}
                    </div>
                    <div>
                      <div
                        className="text-xl font-bold"
                        style={{ color: s.color }}
                      >
                        {s.value}
                      </div>
                      <div
                        className="text-[10px] leading-tight"
                        style={{ color: muted }}
                      >
                        {s.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {importWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Import notes</p>
                  <p className="mt-1">
                    Unreadable dates are left blank on new projects. When updating a matched project, its stored dates are preserved.
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {importWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: bg, borderColor: border }}
              >
                <div
                  className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2"
                  style={{ borderColor: border, background: subtle }}
                >
                  <label className="flex items-center gap-2 text-xs font-medium" style={{ color: text }}>
                    <input
                      type="checkbox"
                      checked={
                        previewRows.some((row) => !row.duplicateInFile) &&
                        previewRows.filter((row) => !row.duplicateInFile).every((row) => selectedRows.has(row.rowNumber))
                      }
                      onChange={(event) => {
                        setSelectedRows(() => {
                          const next = new Set(
                            previewRows
                              .filter((row) => row.duplicateInFile && duplicateDecisions.get(row.rowNumber) === "accept")
                              .map((row) => row.rowNumber),
                          );
                          if (event.target.checked) {
                            previewRows
                              .filter((row) => !row.duplicateInFile)
                              .forEach((row) => next.add(row.rowNumber));
                          }
                          return next;
                        });
                      }}
                    />
                    Select all non-duplicate rows
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void confirmImport(
                        [...new Set([
                          ...previewRows.filter((row) => !row.duplicateInFile).map((row) => row.rowNumber),
                          ...selectedRows,
                        ])],
                        rejectedDuplicateRows,
                      )}
                      disabled={confirming || unresolvedDuplicates.length > 0 || !previewRows.length}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: "#1E40AF" }}
                    >
                      Confirm reviewed rows
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmImport([...selectedRows], rejectedDuplicateRows)}
                      disabled={confirming || unresolvedDuplicates.length > 0 || (!selectedRows.size && !rejectedDuplicateRows.length)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50"
                      style={{ borderColor: "#16A34A", color: "#15803D" }}
                    >
                      Confirm selected ({selectedRows.size})
                    </button>
                    <button
                      type="button"
                      onClick={rejectAll}
                      disabled={confirming}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-red-600 disabled:opacity-50"
                      style={{ borderColor: "#FECACA" }}
                    >
                      Reject all
                    </button>
                  </div>
                </div>
                <div
                  className="px-5 py-3.5 border-b flex items-center justify-between"
                  style={{ borderColor: border }}
                >
                  <div>
                    <h3
                      className="font-semibold text-sm"
                      style={{ color: text }}
                    >
                      Import Preview
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: muted }}>
                      📊 {fileName} · {previewRows.length} records
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
                      style={{
                        borderColor: border,
                        color: muted,
                        background: subtle,
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview All
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1900px]">
                    <thead>
                      <tr
                        className="border-b"
                        style={{ borderColor: border, background: subtle }}
                      >
                        {["Select", ...previewColumns.map((column) => column.label), "Import action"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-xs font-semibold"
                            style={{ color: muted }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r) => (
                        <tr
                          key={r.rowNumber}
                          className="border-b"
                          style={{
                            borderColor: border,
                          }}
                        >
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select row ${r.rowNumber}`}
                              checked={selectedRows.has(r.rowNumber)}
                              disabled={confirming}
                              onChange={(event) => {
                                if (r.duplicateInFile) {
                                  decideDuplicate(r.rowNumber, event.target.checked ? "accept" : "reject");
                                  return;
                                }
                                setSelectedRows((current) => {
                                  const next = new Set(current);
                                  if (event.target.checked) next.add(r.rowNumber);
                                  else next.delete(r.rowNumber);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          {previewColumns.map((column) => {
                            const value = r[column.key];
                            const display =
                              column.key === "revenue"
                                ? value
                                  ? `$${Number(value).toLocaleString()}`
                                  : "-"
                                : column.key === "completion"
                                  ? `${value || 0}%`
                                  : String(value ?? "-");
                            return (
                              <td
                                key={column.key}
                                className="px-4 py-2.5 text-xs whitespace-nowrap"
                                style={{ color: text }}
                              >
                                {display}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span style={{ color: r.duplicateInFile ? "#D97706" : r.importKind.startsWith("Update") ? "#7C3AED" : "#64748B" }}>
                                {r.importKind}
                                {r.duplicateInFile && duplicateDecisions.get(r.rowNumber) && (
                                  <span className="ml-1 font-semibold">
                                    · {duplicateDecisions.get(r.rowNumber) === "accept" ? "Accepted" : "Rejected"}
                                  </span>
                                )}
                              </span>
                              {r.duplicateInFile ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={confirming}
                                    onClick={() => decideDuplicate(r.rowNumber, "accept")}
                                    className={`rounded border px-2 py-1 disabled:opacity-50 ${
                                      duplicateDecisions.get(r.rowNumber) === "accept"
                                        ? "border-green-600 bg-green-100 text-green-800"
                                        : "border-green-200 text-green-700"
                                    }`}
                                  >
                                    {r.duplicateAction === "update" ? "Accept update" : "Accept as new"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={confirming}
                                    onClick={() => decideDuplicate(r.rowNumber, "reject")}
                                    className={`rounded border px-2 py-1 disabled:opacity-50 ${
                                      duplicateDecisions.get(r.rowNumber) === "reject"
                                        ? "border-red-600 bg-red-100 text-red-800"
                                        : "border-red-200 text-red-600"
                                    }`}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    aria-label={`Include row ${r.rowNumber}`}
                                    title="Include"
                                    disabled={confirming}
                                    onClick={() => setSelectedRows((current) => new Set(current).add(r.rowNumber))}
                                    className="p-1 rounded hover:bg-green-50 text-green-700 disabled:opacity-50"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Reject row ${r.rowNumber}`}
                                    title="Reject"
                                    disabled={confirming}
                                    onClick={() => setSelectedRows((current) => {
                                      const next = new Set(current);
                                      next.delete(r.rowNumber);
                                      return next;
                                    })}
                                    className="p-1 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div
                  className="px-4 py-3 flex gap-2 border-t"
                  style={{ borderColor: border }}
                >
                  <button
                    type="button"
                    onClick={rejectAll}
                    disabled={confirming}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Reject all
                  </button>
                  <p className="text-xs my-auto ml-2" style={{ color: muted }}>
                    Review every exact duplicate before confirming. Accepted repeated names are imported as separate projects with numbered names.
                  </p>
                </div>
              </div>
            </>
          )}

          {stage === "done" && (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ background: bg, borderColor: border }}
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-base mb-1" style={{ color: text }}>
                Import Complete
              </h3>
              <p className="text-sm mb-6" style={{ color: muted }}>
                {summary.imported} project{summary.imported === 1 ? "" : "s"} added ·{" "}
                {summary.updated} existing project{summary.updated === 1 ? "" : "s"} updated ·{" "}
                {summary.duplicates} exact duplicate{summary.duplicates === 1 ? "" : "s"} reviewed ·{" "}
                {summary.failed} failed
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {STATS.slice(0, 3).map((s) => (
                  <div
                    key={s.label}
                    className="p-3 rounded-xl border text-center"
                    style={{ borderColor: border, background: s.bg }}
                  >
                    <div
                      className="text-2xl font-bold mb-0.5"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </div>
                    <div className="text-[10px]" style={{ color: muted }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium"
                  style={{
                    borderColor: border,
                    color: muted,
                    background: "transparent",
                  }}
                >
                  <Download className="w-3.5 h-3.5" /> Download Import Log
                </button>
                <button
                  onClick={() => setStage("idle")}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "#1E40AF" }}
                >
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Templates */}
        <div className="space-y-4">
          <div
            className="rounded-xl border p-5"
            style={{ background: bg, borderColor: border }}
          >
            <h3 className="font-semibold text-sm mb-4" style={{ color: text }}>
              Download Templates
            </h3>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={
                    t.name === "New Project Import"
                      ? () => void downloadProjectTemplate()
                      : undefined
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-xl border text-left hover:border-blue-300 transition-colors group"
                  style={{ borderColor: border, background: subtle }}
                >
                  <span className="text-xl">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: text }}
                    >
                      {t.name}
                    </div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: muted }}
                    >
                      {t.rows}
                    </div>
                  </div>
                  <Download
                    className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-blue-600 transition-colors"
                    style={{ color: muted }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* <div
            className="rounded-xl border p-5"
            style={{ background: bg, borderColor: border }}
          >
            <h3 className="font-semibold text-sm mb-3" style={{ color: text }}>
              Import History
            </h3>
            <div className="space-y-2.5">
              {[
                {
                  name: "bulk_clients_aug.xlsx",
                  date: "Aug 13",
                  count: 14,
                  status: "success",
                },
                {
                  name: "updates_q3.xlsx",
                  date: "Aug 5",
                  count: 8,
                  status: "success",
                },
                {
                  name: "new_clients_jul.xlsx",
                  date: "Jul 28",
                  count: 11,
                  status: "partial",
                },
                {
                  name: "revenue_q2.xlsx",
                  date: "Jul 1",
                  count: 104,
                  status: "success",
                },
              ].map((h) => (
                <div
                  key={h.name}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: subtle }}
                >
                  <FileSpreadsheet
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#16A34A" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-medium truncate"
                      style={{ color: text }}
                    >
                      {h.name}
                    </div>
                    <div className="text-[10px]" style={{ color: muted }}>
                      {h.date} · {h.count} records
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${h.status === "success" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {h.status === "success" ? "✓" : "~"}
                  </span>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}

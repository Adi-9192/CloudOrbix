import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { showCloudOrbixAlert } from "../alert";
import {
  getConfirmableImportRowNumbers,
  getSuccessfullyImportedRowNumbers,
  reconcileImportRows,
} from "../../shared/excel-import-review.js";

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
  voumetric: number | string | null;
  region: string;
  currentStatus: string;
  phase: string;
  revenue: number;
  completion: number;
  hyperscaler: string;
  projectBrief: string;
  isow: string;
  estimatedStart: string | null;
  estimatedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  importKind: string;
  duplicateInFile: boolean;
  duplicateAction?: "new" | "update";
  validationErrors?: { field: string; message: string }[];
  rowState?: "Valid" | "Validation Failed" | "Corrected" | "Confirmed" | "Rejected";
  isFileFailure?: boolean;
}

type CorrectableField = "clientName" | "manager" | "estimatedStart" | "voumetric";

const previewColumns: { key: keyof ImportPreviewRow; label: string }[] = [
  { key: "clientId", label: "Project ID" },
  { key: "year", label: "Year" },
  { key: "clientName", label: "Project Name" },
  { key: "manager", label: "Manager" },
  { key: "projectBillingCode", label: "Project Billing Code" },
  { key: "voumetric", label: "Volumetric" },
  { key: "region", label: "Region" },
  { key: "currentStatus", label: "Status" },
  { key: "phase", label: "Phase" },
  { key: "revenue", label: "Revenue" },
  { key: "completion", label: "Completion" },
  { key: "hyperscaler", label: "Hyperscaler" },
  { key: "projectBrief", label: "Project Brief" },
  { key: "isow", label: "ISOW" },
  { key: "estimatedStart", label: "Planned Start Date" },
  { key: "estimatedEnd", label: "Planned End Date" },
  { key: "actualStart", label: "Actual Start Date" },
  { key: "actualEnd", label: "Actual End Date" },
];

export default function ExcelImport({ dark }: ExcelImportProps) {
  const [stage, setStage] = useState<"idle" | "preview">("idle");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [rowCorrections, setRowCorrections] = useState<
    Map<number, Partial<Record<CorrectableField, string>>>
  >(new Map());
  const [reviewMessage, setReviewMessage] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [duplicateDecisions, setDuplicateDecisions] = useState<
    Map<number, "accept" | "reject">
  >(new Map());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [hasConfirmedImport, setHasConfirmedImport] = useState(false);
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
    setHasConfirmedImport(false);
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
        if (response.status === 400) {
          setSummary({
            totalProcessed: 1,
            imported: 0,
            updated: 0,
            duplicates: 0,
            failed: 1,
          });
          setPreviewRows([{
            rowNumber: 1,
            clientId: "",
            year: new Date().getFullYear(),
            clientName: file.name,
            manager: "",
            projectBillingCode: null,
            voumetric: null,
            region: "",
            currentStatus: "",
            phase: "",
            revenue: 0,
            completion: 0,
            hyperscaler: "",
            projectBrief: "",
            isow: "",
            estimatedStart: null,
            estimatedEnd: null,
            actualStart: null,
            actualEnd: null,
            importKind: "File validation failed",
            duplicateInFile: false,
            validationErrors: [{
              field: "file",
              message: payload.message || "Invalid Excel file format.",
            }],
            rowState: "Validation Failed",
            isFileFailure: true,
          }]);
          setRowCorrections(new Map());
          setSelectedFile(file);
          setSelectedRows(new Set());
          setDuplicateDecisions(new Map());
          setImportWarnings([]);
          setReviewMessage("");
          setStage("preview");
          return;
        }
        const details = Array.isArray(payload.errors)
          ? `\n${payload.errors.join("\n")}`
          : "";
        throw new Error(`${payload.message || "Import failed."}${details}`);
      }
      setSummary(payload.summary);
      setPreviewRows(payload.records || []);
      setRowCorrections(new Map());
      setSelectedFile(file);
      setSelectedRows(new Set());
      setDuplicateDecisions(new Map());
      setImportWarnings(payload.warnings || []);
      setReviewMessage("");
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
    rejectedRows: number[],
  ) => {
    if (!selectedFile) return;
    if (!rowsToImport.length && !rejectedRows.length) {
      const needsReview = previewRows.filter(
        (row) =>
          row.rowState !== "Confirmed" &&
          row.rowState !== "Rejected" &&
          ((row.validationErrors?.length ?? 0) > 0 ||
            (row.duplicateInFile && !duplicateDecisions.has(row.rowNumber))),
      ).length;
      setReviewMessage(
        `${needsReview} row${needsReview === 1 ? "" : "s"} still require manual review.`,
      );
      return;
    }
    setConfirming(true);
    setError("");
    const body = new FormData();
    body.append("file", selectedFile);
    body.append("selectedRows", JSON.stringify(rowsToImport));
    body.append("rejectedRows", JSON.stringify(rejectedRows));
    body.append(
      "acceptedRows",
      JSON.stringify(
        [...duplicateDecisions]
          .filter(
            ([rowNumber, decision]) =>
              decision === "accept" && rowsToImport.includes(rowNumber),
          )
          .map(([rowNumber]) => rowNumber),
      ),
    );
    body.append(
      "rowCorrections",
      JSON.stringify(
        Object.fromEntries(
          [...rowCorrections].filter(([rowNumber]) =>
            rowsToImport.includes(rowNumber),
          ),
        ),
      ),
    );

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
      const importedRows = new Set(getSuccessfullyImportedRowNumbers(payload));
      const rejectedRowNumbers = new Set(rejectedRows);
      const serverFailures = new Map<number, ImportPreviewRow>(
        (payload.records || [])
          .filter((record: ImportPreviewRow & { imported?: boolean }) => record.imported === false)
          .map((record: ImportPreviewRow) => [record.rowNumber, record]),
      );
      const unreportedRows = rowsToImport
        .filter(
          (rowNumber) =>
            !importedRows.has(rowNumber) && !serverFailures.has(rowNumber),
        )
        .map((rowNumber) => ({
          rowNumber,
          importKind: "Import result missing",
          duplicateInFile: false,
          validationErrors: [{
            field: "import",
            message:
              "The server did not confirm whether this row was saved. It remains in review; verify the project before retrying.",
          }],
          rowState: "Validation Failed" as const,
          imported: false,
        }));
      const nextRows = reconcileImportRows(previewRows, {
        importedRowNumbers: [...importedRows],
        rejectedRowNumbers: [...rejectedRowNumbers],
        failedRecords: [...serverFailures.values(), ...unreportedRows],
      });
      const unresolvedFailures = nextRows.filter(
        (row) =>
          row.rowState !== "Confirmed" &&
          row.rowState !== "Rejected" &&
          (row.validationErrors?.length ?? 0) > 0,
      ).length;
      const manualReviewCount = nextRows.filter(
        (row) =>
          row.rowState !== "Confirmed" &&
          row.rowState !== "Rejected" &&
          ((row.validationErrors?.length ?? 0) > 0 ||
            (row.duplicateInFile && !duplicateDecisions.has(row.rowNumber))),
      ).length;
      const hasPriorDecisions =
        summary.imported + summary.updated > 0 ||
        previewRows.some(
          (row) => row.rowState === "Confirmed" || row.rowState === "Rejected",
        );
      setPreviewRows(nextRows);
      setHasConfirmedImport(true);
      setSelectedRows((current) => {
        const next = new Set(current);
        [...importedRows, ...rejectedRowNumbers].forEach((rowNumber) =>
          next.delete(rowNumber),
        );
        return next;
      });
      setSummary((current) => ({
        ...payload.summary,
        totalProcessed: hasPriorDecisions
          ? current.totalProcessed
          : previewRows.length,
        imported: hasPriorDecisions
          ? current.imported + payload.summary.imported
          : payload.summary.imported,
        updated: hasPriorDecisions
          ? current.updated + payload.summary.updated
          : payload.summary.updated,
        duplicates: hasPriorDecisions
          ? current.duplicates + payload.summary.duplicates
          : payload.summary.duplicates,
        failed: unresolvedFailures,
      }));
      setReviewMessage(
        `${importedRows.size} row${importedRows.size === 1 ? "" : "s"} imported or updated and removed from the table. ${nextRows.length} row${nextRows.length === 1 ? "" : "s"} remain in review; ${manualReviewCount} need correction or a duplicate decision.${unreportedRows.length ? ` ${unreportedRows.length} selected row${unreportedRows.length === 1 ? "" : "s"} did not receive a save result; verify them before retrying.` : ""}`,
      );
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
    setPreviewRows((current) =>
      current.map((row) =>
        row.rowNumber === rowNumber
          ? {
              ...row,
              rowState: decision === "accept" ? "Corrected" : "Valid",
            }
          : row,
      ),
    );
    setReviewMessage(
      decision === "accept"
        ? "Duplicate accepted as a new project. Use Confirm selected or Confirm All Valid Rows to import it."
        : "",
    );
  };

  const updateCorrectableField = (
    rowNumber: number,
    field: CorrectableField,
    rawValue: string,
  ) => {
    setPreviewRows((current) =>
      current.map((row) => {
        if (row.rowNumber !== rowNumber) return row;

        const previousErrors = row.validationErrors || [];
        const remainingErrors = previousErrors.filter(
          (issue) => issue.field !== field,
        );
        let valueIsValid = true;
        if (field === "clientName" || field === "manager") {
          valueIsValid = Boolean(rawValue.trim());
        } else if (field === "estimatedStart") {
          valueIsValid = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
        } else if (field === "voumetric" && rawValue.trim()) {
          const number = Number(rawValue);
          valueIsValid =
            Number.isInteger(number) && number >= 0 && number <= 2147483647;
        }

        if (!valueIsValid) {
          remainingErrors.push(
            previousErrors.find((issue) => issue.field === field) || {
              field,
              message:
                field === "estimatedStart"
                  ? "Enter a valid planned start date."
                  : field === "voumetric"
                    ? "Volumetric must be a whole number from 0 to 2,147,483,647."
                    : `${field === "clientName" ? "Project name" : "Project manager"} is required.`,
            },
          );
        }

        const updatedValue =
          field === "voumetric"
            ? rawValue.trim() && valueIsValid
              ? Number(rawValue)
              : rawValue || null
            : rawValue;
        const validationErrors = remainingErrors;
        const wasFailed = previousErrors.length > 0;

        return {
          ...row,
          [field]: updatedValue,
          validationErrors,
          rowState: validationErrors.length
            ? "Validation Failed"
            : wasFailed
              ? "Corrected"
              : row.rowState || "Valid",
        };
      }),
    );
    setRowCorrections((current) => {
      const next = new Map(current);
      next.set(rowNumber, {
        ...next.get(rowNumber),
        [field]: rawValue,
      });
      return next;
    });
    setReviewMessage("");
  };

  const confirmAllValidRows = () => {
    const importableRows = getConfirmableImportRowNumbers(previewRows, {
      duplicateDecisions,
    });
    const rejectedRows = [
      ...duplicateRows
        .filter((row) => duplicateDecisions.get(row.rowNumber) === "reject")
        .map((row) => row.rowNumber),
    ];
    void confirmImport(
      importableRows,
      rejectedRows,
    );
  };

  const rejectValidationRow = (rowNumber: number) => {
    const row = previewRows.find((candidate) => candidate.rowNumber === rowNumber);
    if (row?.isFileFailure) {
      setPreviewRows((current) =>
        current.map((candidate) =>
          candidate.rowNumber === rowNumber
            ? { ...candidate, rowState: "Rejected" }
            : candidate,
        ),
      );
      setSummary((current) => ({ ...current, failed: 0 }));
      setReviewMessage(`${fileName} was rejected.`);
      return;
    }
    void confirmImport([], [rowNumber]);
  };

  const duplicateRows = previewRows.filter((row) => row.duplicateInFile);
  const confirmableRowNumbers = getConfirmableImportRowNumbers(previewRows, {
    duplicateDecisions,
  });
  const confirmableRowSet = new Set(confirmableRowNumbers);
  const readyUpdateCount = previewRows.filter(
    (row) =>
      confirmableRowSet.has(row.rowNumber) &&
      (row.importKind.startsWith("Update") ||
        (row.duplicateAction === "update" &&
          duplicateDecisions.get(row.rowNumber) === "accept")),
  ).length;
  const readyImportCount = confirmableRowNumbers.length - readyUpdateCount;
  const manualReviewCount = previewRows.filter(
    (row) =>
      row.rowState !== "Confirmed" &&
      row.rowState !== "Rejected" &&
      ((row.validationErrors?.length ?? 0) > 0 ||
        (row.duplicateInFile && !duplicateDecisions.has(row.rowNumber))),
  ).length;
  const rejectedDuplicateRows = duplicateRows
    .filter(
      (row) =>
        row.rowState !== "Confirmed" &&
        row.rowState !== "Rejected" &&
        duplicateDecisions.get(row.rowNumber) === "reject",
    )
    .map((row) => row.rowNumber);

  const rejectAll = () => {
    setSelectedRows(new Set());
    setDuplicateDecisions(new Map());
    setPreviewRows([]);
    setRowCorrections(new Map());
    setSelectedFile(null);
    setHasConfirmedImport(false);
    setStage("idle");
    setReviewMessage("");
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
      label: hasConfirmedImport ? "Successfully Imported" : "Ready to Import",
      value: hasConfirmedImport ? summary.imported : readyImportCount,
      icon: "✅",
      color: "#16A34A",
      bg: "#DCFCE7",
    },
    {
      label: hasConfirmedImport ? "Existing Updated" : "Ready to Update",
      value: hasConfirmedImport ? summary.updated : readyUpdateCount,
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
      label: hasConfirmedImport ? "Still to Review" : "Failed Records",
      value: hasConfirmedImport ? manualReviewCount : summary.failed,
      icon: "❌",
      color: "#DC2626",
      bg: "#FEE2E2",
    },
    {
      label: "Validation Errors",
      value: previewRows.filter(
        (row) =>
          row.rowState !== "Confirmed" &&
          row.rowState !== "Rejected" &&
          (row.validationErrors?.length ?? 0) > 0,
      ).length,
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
            Bulk import project data · Export reports
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
              setRowCorrections(new Map());
              setSelectedFile(null);
              setHasConfirmedImport(false);
              setError("");
              setReviewMessage("");
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
      {reviewMessage && stage === "preview" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {reviewMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        {/* Main Upload Panel */}
        <div className="space-y-5">
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
                  or click to browse · Supports .xlsx files up to 50MB
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
                  accept=".xlsx"
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

              {hasConfirmedImport && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900">
                  <p className="font-semibold">
                    {summary.imported + summary.updated} row
                    {summary.imported + summary.updated === 1 ? "" : "s"} saved and removed from this review.
                  </p>
                  <p className="mt-1">
                    {previewRows.length} row{previewRows.length === 1 ? "" : "s"} remain in the table for review; rows with validation issues have not been imported.
                  </p>
                </div>
              )}

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
                        previewRows.some(
                          (row) =>
                            !row.duplicateInFile &&
                            !row.validationErrors?.length &&
                            (row.rowState || "Valid") === "Valid",
                        ) &&
                        previewRows
                          .filter(
                            (row) =>
                              !row.duplicateInFile &&
                              !row.validationErrors?.length &&
                              (row.rowState || "Valid") === "Valid",
                          )
                          .every((row) => selectedRows.has(row.rowNumber))
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
                              .filter((row) =>
                                !row.duplicateInFile &&
                                !row.validationErrors?.length &&
                                (row.rowState || "Valid") === "Valid",
                              )
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
                      onClick={confirmAllValidRows}
                      disabled={confirming || previewRows.every((row) => row.rowState === "Confirmed" || row.rowState === "Rejected")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: "#1E40AF" }}
                    >
                      Confirm All Valid Rows ({confirmableRowNumbers.length} ready)
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmImport(
                        getConfirmableImportRowNumbers(previewRows, {
                          selectedRowNumbers: selectedRows,
                          duplicateDecisions,
                        }),
                        rejectedDuplicateRows,
                      )}
                      disabled={confirming || selectedRows.size === 0}
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
                      {hasConfirmedImport ? "Rows Remaining for Review" : "Import Preview"}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: muted }}>
                      📊 {fileName} · {previewRows.length} remaining of {summary.totalProcessed} records
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
                        {["Select", ...previewColumns.map((column) => column.label), "Validation / state", "Import action"].map((h) => (
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
                            background:
                              r.validationErrors?.length
                                ? "rgba(239, 68, 68, 0.13)"
                                : undefined,
                            opacity: r.duplicateInFile ? 0.75 : 1,
                          }}
                        >
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select row ${r.rowNumber}`}
                              checked={selectedRows.has(r.rowNumber)}
                              disabled={
                                confirming ||
                                Boolean(r.validationErrors?.length) ||
                                r.rowState === "Confirmed" ||
                                r.rowState === "Rejected"
                              }
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
                            const isEditable =
                              r.rowState !== "Confirmed" &&
                              r.rowState !== "Rejected" &&
                              !confirming;
                            const hasFieldError = (field: CorrectableField) =>
                              r.validationErrors?.some((issue) => issue.field === field);
                            let editor: React.ReactNode = null;
                            if (column.key === "clientName" && hasFieldError("clientName")) {
                              editor = (
                                <input
                                  aria-label={`Project name for row ${r.rowNumber}`}
                                  value={r.clientName}
                                  disabled={!isEditable}
                                  onChange={(event) => updateCorrectableField(r.rowNumber, "clientName", event.target.value)}
                                  className="w-40 rounded border border-red-300 bg-white px-2 py-1 text-xs text-slate-900"
                                />
                              );
                            } else if (column.key === "manager" && hasFieldError("manager")) {
                              editor = (
                                <input
                                  aria-label={`Manager for row ${r.rowNumber}`}
                                  value={r.manager === "Unassigned" ? "" : r.manager}
                                  disabled={!isEditable}
                                  onChange={(event) => updateCorrectableField(r.rowNumber, "manager", event.target.value)}
                                  className="w-40 rounded border border-red-300 bg-white px-2 py-1 text-xs text-slate-900"
                                />
                              );
                            } else if (column.key === "estimatedStart" && hasFieldError("estimatedStart")) {
                              editor = (
                                <input
                                  type="date"
                                  aria-label={`Planned start date for row ${r.rowNumber}`}
                                  value={String(r.estimatedStart || "")}
                                  disabled={!isEditable}
                                  onChange={(event) => updateCorrectableField(r.rowNumber, "estimatedStart", event.target.value)}
                                  className="rounded border border-red-300 bg-white px-2 py-1 text-xs text-slate-900"
                                />
                              );
                            } else if (column.key === "voumetric" && hasFieldError("voumetric")) {
                              editor = (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  aria-label={`Volumetric for row ${r.rowNumber}`}
                                  value={String(r.voumetric ?? "")}
                                  disabled={!isEditable}
                                  onChange={(event) => updateCorrectableField(r.rowNumber, "voumetric", event.target.value)}
                                  className="w-28 rounded border border-red-300 bg-white px-2 py-1 text-xs text-slate-900"
                                />
                              );
                            }
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
                                {editor || display}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2.5 text-xs min-w-48">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 font-semibold ${
                                r.rowState === "Confirmed"
                                  ? "bg-green-100 text-green-800"
                                  : r.rowState === "Rejected"
                                    ? "bg-slate-200 text-slate-700"
                                    : r.validationErrors?.length
                                      ? "bg-red-100 text-red-800"
                                      : r.rowState === "Corrected"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-green-50 text-green-700"
                              }`}
                            >
                              {r.rowState || (r.validationErrors?.length ? "Validation Failed" : "Valid")}
                            </span>
                            {!!r.validationErrors?.length && (
                              <ul className="mt-1 list-inside list-disc text-red-800">
                                {r.validationErrors.map((issue) => (
                                  <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                                ))}
                              </ul>
                            )}
                          </td>
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
                              {r.rowState === "Confirmed" || r.rowState === "Rejected" ? (
                                <span className="font-semibold" style={{ color: r.rowState === "Confirmed" ? "#15803D" : muted }}>
                                  {r.rowState}
                                </span>
                              ) : (
                                <>
                                  {r.duplicateInFile && (
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
                                  )}
                                  {r.validationErrors?.length || r.rowState === "Corrected" ? (
                                    <div className="flex items-center gap-2">
                                      {r.rowState === "Corrected" && !r.validationErrors?.length && (
                                        <span className="font-medium text-amber-700">
                                          Select this row and use Confirm selected or Confirm All Valid Rows.
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        disabled={confirming}
                                        onClick={() => rejectValidationRow(r.rowNumber)}
                                        className="rounded border border-red-300 px-2 py-1 font-semibold text-red-700 disabled:opacity-50"
                                      >
                                        Reject File
                                      </button>
                                    </div>
                                  ) : !r.duplicateInFile ? (
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
                                  ) : null}
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
                    Review every exact duplicate before confirming. Accepted repeated rows are imported as separate projects with numbered names.
                    Nothing is added or updated until you confirm. Repeated rows must be accepted as new before confirmation.
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

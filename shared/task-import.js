import { normalizeProjectTaskStatus } from "./project-task-status.js";
import { parseProjectUpdateDate } from "./project-updates.js";

const taskHeaders = {
  taskTitle: ["task title"],
  assignedTo: ["assigned to"],
  plannedStartDate: ["planned start date", "expected start", "expected start date"],
  plannedEndDate: ["planned end date", "expected end", "expected end date"],
  actualStartDate: ["actual start date", "actual start"],
  actualEndDate: ["actual end date", "actual end"],
  progress: ["progress", "progress %"],
  status: ["status"],
  remarks: ["remarks", "remark"],
};

const requiredTaskHeaders = [
  ["taskTitle", "Task Title"],
  ["status", "Status"],
  ["progress", "Progress"],
];

const taskDateFields = [
  ["plannedStartDate", "Planned Start Date"],
  ["plannedEndDate", "Planned End Date"],
  ["actualStartDate", "Actual Start Date"],
  ["actualEndDate", "Actual End Date"],
];

function isBlankRow(cells) {
  return cells.every((cell) => !String(cell ?? "").trim());
}

export function taskDateYearFromProjectStart(projectStartDate) {
  if (projectStartDate instanceof Date) {
    return Number.isNaN(projectStartDate.getTime())
      ? undefined
      : projectStartDate.getUTCFullYear();
  }
  const isoDate = String(projectStartDate ?? "").trim().match(/^(\d{4})-/);
  return isoDate ? Number(isoDate[1]) : undefined;
}

function hasExplicitDateYear(value) {
  const input = String(value ?? "").trim();
  return (
    /^\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(input) ||
    /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\D|$)/.test(input) ||
    /^\d{1,2}(?:st|nd|rd|th)?(?:\s+|[-/,.]\s*)[A-Za-z]{3,9}(?:[-/,.]\s*|\s+)\d{2,4}$/i.test(input) ||
    /^[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+)\d{2,4}$/i.test(input)
  );
}

export function normalizeTaskDate(value, yearForUndated) {
  const raw = String(value ?? "").trim();
  if (!raw) return { value: "", error: "" };

  const year = Number.isInteger(yearForUndated) ? yearForUndated : Number.NaN;
  if (!hasExplicitDateYear(raw) && !Number.isInteger(year)) {
    return {
      value: raw,
      error: `Date "${raw}" needs a year. Include a year or set the project's start date.`,
    };
  }

  const parsed = parseProjectUpdateDate(raw, year);
  if (!parsed) {
    return {
      value: raw,
      error: `Date "${raw}" is invalid. Enter a valid date such as 2026-10-19 or 19-Oct.`,
    };
  }
  return { value: parsed.slice(0, 10), error: "" };
}

export function parseTaskClipboard(text) {
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let cells = [];
  let cell = "";
  let inQuotes = false;
  let rowNumber = 1;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (inQuotes) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && !cell) {
      inQuotes = true;
    } else if (character === "\t") {
      cells.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      cells.push(cell);
      if (!isBlankRow(cells)) rows.push({ rowNumber, cells });
      cells = [];
      cell = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      rowNumber += 1;
    } else {
      cell += character;
    }
  }

  if (inQuotes) {
    throw new Error("The pasted table contains an unclosed quoted cell.");
  }
  cells.push(cell);
  if (!isBlankRow(cells)) rows.push({ rowNumber, cells });
  if (rows.length < 2) {
    throw new Error("Copy a task table with its header row and at least one task.");
  }

  const headers = rows[0].cells.map((header, index) => {
    const cleanHeader = String(header).trim().replace(/^\uFEFF/, "");
    return cleanHeader || `__blank_${index + 1}`;
  });
  if (headers.every((header) => header.startsWith("__blank_"))) {
    throw new Error("The pasted task table needs a header row.");
  }

  return rows.slice(1).map(({ rowNumber: sourceRow, cells: values }) => ({
    ...Object.fromEntries(
      headers
        .filter((header) => !header.startsWith("__blank_"))
        .map((header, index) => [header, String(values[index] ?? "").trim()]),
    ),
    __rowNumber: sourceRow,
  }));
}

function headerKey(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, " ");
}

export function reviewTaskImportRecords(records, { yearForUndated } = {}) {
  const sourceRecords = Array.isArray(records) ? records : [];
  const sourceHeaders = Object.keys(sourceRecords[0] || {}).filter(
    (header) => header !== "__rowNumber",
  );
  const headerLookup = new Map(
    sourceHeaders.map((header) => [headerKey(header), header]),
  );
  const sourceHeaderByField = Object.fromEntries(
    Object.entries(taskHeaders).map(([field, aliases]) => [
      field,
      aliases.map((alias) => headerLookup.get(alias)).find(Boolean),
    ]),
  );
  const missingColumns = requiredTaskHeaders
    .filter(([field]) => !sourceHeaderByField[field])
    .map(([, label]) => label);

  const rows = sourceRecords.map((record, index) => {
    const read = (field) => {
      const sourceHeader = sourceHeaderByField[field];
      return sourceHeader ? String(record[sourceHeader] ?? "").trim() : "";
    };
    const taskTitle = read("taskTitle");
    const rawStatus = read("status");
    const status = normalizeProjectTaskStatus(rawStatus || "Not Started");
    const parsedProgress = Number(read("progress"));
    const normalizedDates = Object.fromEntries(
      taskDateFields.map(([field, label]) => {
        const result = normalizeTaskDate(read(field), yearForUndated);
        return [
          field,
          {
            value: result.value,
            error: result.error ? `${label}: ${result.error}` : "",
          },
        ];
      }),
    );
    const errors = taskDateFields
      .map(([field]) => normalizedDates[field].error)
      .filter(Boolean);
    if (!status) {
      errors.unshift(
        `Row ${Number(record.__rowNumber) || index + 2} has an unsupported task status. Use Not Started, In progress, Completed, or Blocked.`,
      );
    }

    return {
      rowNumber: Number(record.__rowNumber) || index + 2,
      taskTitle,
      assignedTo: read("assignedTo"),
      plannedStartDate: normalizedDates.plannedStartDate.value,
      plannedEndDate: normalizedDates.plannedEndDate.value,
      actualStartDate: normalizedDates.actualStartDate.value,
      actualEndDate: normalizedDates.actualEndDate.value,
      progress: Math.max(0, Math.min(100, parsedProgress || 0)),
      status,
      remarks: read("remarks"),
      error: errors.join(" "),
      skipped: !taskTitle,
    };
  });

  return { missingColumns, rows };
}

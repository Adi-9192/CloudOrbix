import {
  isProjectStatus,
  normalizeProjectStatus as normalizeSharedProjectStatus,
} from "../../shared/project-status.js"

const cellText = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? "Invalid Date"
      : value.toISOString().slice(0, 10)
  }

  if (value && typeof value === "object") {
    if ("error" in value) return String(value.error ?? "")

    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || "").join("")
    }

    if ("text" in value) return String(value.text ?? "")

    if ("result" in value) {
      if (value.result instanceof Date) {
        return Number.isNaN(value.result.getTime())
          ? "Invalid Date"
          : value.result.toISOString().slice(0, 10)
      }

      return String(value.result ?? "")
    }

    if ("formula" in value) return ""
  }

  return String(value ?? "").trim()
}

export const parseSpreadsheetDate = (raw, yearHint) => {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { value: null, error: null }
  }

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) {
      return { value: null, error: "Invalid Date" }
    }

    if (raw.getUTCFullYear() < 1901) {
      return { value: null, error: raw.toISOString().slice(0, 10) }
    }

    return { value: raw.toISOString().slice(0, 10), error: null }
  }

  const text = String(raw)

    .trim()

    .replace(/\s*\(TBD\)\s*$/i, "")

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const serial = Number(text)

    if (serial === 0) return { value: null, error: null }

    if (serial >= 1 && serial < 2958466) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)

      return { value: date.toISOString().slice(0, 10), error: null }
    }
  }

  if (/^invalid(?:\s+date)?$/i.test(text)) {
    return { value: null, error: text }
  }

  const buildDate = (year, month, day) => {
    const date = new Date(Date.UTC(year, month - 1, day))

    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? date
      : null
  }

  const monthNumber = (month) => {
    if (/^\d{1,2}$/.test(month)) return Number(month)

    const monthIndex = [
      "jan",

      "feb",

      "mar",

      "apr",

      "may",

      "jun",

      "jul",

      "aug",

      "sep",

      "oct",

      "nov",

      "dec",
    ].indexOf(month.slice(0, 3).toLowerCase())

    return monthIndex < 0 ? 0 : monthIndex + 1
  }

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/)

  if (isoDate) {
    const [, year, month, day] = isoDate

    const date = buildDate(Number(year), Number(month), Number(day))

    if (date) {
      return { value: date.toISOString().slice(0, 10), error: null }
    }

    return { value: null, error: text }
  }

  const dayMonthYear = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?[-\s/]([A-Za-z]{3,9}|\d{1,2})[-\s/](\d{4})$/,
  )

  const monthDayYear = text.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})$/,
  )

  const dayMonth = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?[-\s/]([A-Za-z]{3,9})$/,
  )

  let date

  if (dayMonthYear) {
    date = buildDate(
      Number(dayMonthYear[3]),

      monthNumber(dayMonthYear[2]),

      Number(dayMonthYear[1]),
    )
  } else if (monthDayYear) {
    date = buildDate(
      Number(monthDayYear[3]),

      monthNumber(monthDayYear[1]),

      Number(monthDayYear[2]),
    )
  } else if (dayMonth) {
    if (!Number.isInteger(Number(yearHint)) || Number(yearHint) < 1901) {
      return {
        value: null,

        error: `${text} (project year is unavailable)`,
      }
    }

    date = buildDate(
      Number(yearHint),

      monthNumber(dayMonth[2]),

      Number(dayMonth[1]),
    )
  }

  if (date) {
    return date.getUTCFullYear() < 1901
      ? { value: null, error: text }
      : { value: date.toISOString().slice(0, 10), error: null }
  }

  return { value: null, error: text }
}

export const worksheetRecords = (worksheet) => {
  const firstHeader = worksheet.getRow(1)

  const secondHeader = worksheet.getRow(2)

  const hasGroupedDateHeaders = firstHeader.values.some((value) =>
    /^(estimated|actual)$/i.test(cellText(value)),
  )

  const headerRowCount = hasGroupedDateHeaders ? 2 : 1

  const headers = []

  let dateGroup = ""

  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const first = cellText(firstHeader.getCell(column).value)

      .replace(/\s+/g, " ")

      .trim()

    const second =
      headerRowCount === 2 ? cellText(secondHeader.getCell(column).value) : ""

    if (/^(estimated|actual)$/i.test(first)) dateGroup = first

    if (headerRowCount === 2 && dateGroup && second) {
      headers.push(`${dateGroup} ${second.replace(/\s+/g, " ").trim()}`.trim())
    } else {
      headers.push(first || second.replace(/\s+/g, " ").trim())
    }
  }

  const firstDataRow = headerRowCount + 1

  const records = []

  for (
    let rowNumber = firstDataRow;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber)

    const sourceWarnings = []

    const record = Object.fromEntries(
      headers.map((header, index) => {
        const cell = row.getCell(index + 1)

        if (
          cell.value &&
          typeof cell.value === "object" &&
          "formula" in cell.value &&
          !("result" in cell.value)
        ) {
          sourceWarnings.push(
            `Row ${rowNumber}, ${header}: formula has no cached result`,
          )
        } else if (
          cell.value &&
          typeof cell.value === "object" &&
          "error" in cell.value
        ) {
          sourceWarnings.push(
            `Row ${rowNumber}, ${header}: Excel formula error ${cellText(cell.value)}`,
          )
        }

        return [header, cellText(cell.value)]
      }),
    )

    Object.defineProperty(record, "rowNumber", { value: rowNumber })

    Object.defineProperty(record, "sourceWarnings", {
      value: sourceWarnings,
    })

    if (Object.values(record).some(Boolean)) records.push(record)
  }

  return records
}

export const spreadsheetValue = (record, ...keys) => {
  const normalizedEntries = Object.entries(record).map(([key, entry]) => [
    key.replace(/\s+/g, " ").trim().toLowerCase(),

    entry,
  ])

  for (const key of keys) {
    const entry = normalizedEntries.find(
      ([header]) => header === key.replace(/\s+/g, " ").trim().toLowerCase(),
    )?.[1]

    if (entry !== undefined && entry !== "") return entry
  }

  return ""
}

export const parseSpreadsheetPercentage = (raw) => {
  const text = String(raw ?? "").trim()

  if (!text) return 0

  const isPercent = text.endsWith("%")

  const parsed = Number(isPercent ? text.slice(0, -1).trim() : text)

  if (!Number.isFinite(parsed)) return 0

  const percentage = isPercent || parsed > 1 ? parsed : parsed * 100

  return Number(Math.max(0, Math.min(100, percentage)).toFixed(2))
}

export const normalizeProjectStatus = (raw) => {
  const status = normalizeSharedProjectStatus(raw)

  return isProjectStatus(status) ? status : "On Track"
}

const normalizeMatchValue = (value) =>
  String(value ?? "")

    .normalize("NFKD")

    .replace(/[\u0300-\u036f]/g, "")

    .trim()

    .replace(/\s+/g, " ")

    .toLowerCase()

    .replace(/&/g, " and ")

    .replace(/[^a-z0-9]+/g, "")

const exactProjectFields = [
  "clientId",

  "clientName",

  "year",

  "region",

  "currentStatus",

  "completion",

  "projectBillingCode",

  "voumetric",

  "revenue",

  "hyperscaler",

  "projectType",

  "projectBrief",

  "projectManager",

  "isow",

  "estimatedStart",

  "estimatedEnd",

  "actualStart",

  "actualEnd",
]

const normalizeExactProjectValue = (field, value) => {
  if (value === null || value === undefined || value === "") return ""

  if (["year", "completion"].includes(field)) {
    const number = Number(value)

    return Number.isFinite(number) ? String(number) : String(value).trim()
  }

  if (
    ["estimatedStart", "estimatedEnd", "actualStart", "actualEnd"].includes(
      field,
    )
  ) {
    const date =
      value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value).slice(0, 10)

    return date
  }

  const normalized = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

  return field === "currentStatus"
    ? normalizeProjectStatus(normalized).toLowerCase()
    : normalized
}

export const findExactDuplicateProject = (project, existingProjects) =>
  existingProjects.find((existing) =>
    exactProjectFields.every(
      (field) => {
        if (
          field === "clientId" &&
          (!normalizeExactProjectValue(field, project[field]) ||
            !normalizeExactProjectValue(field, existing[field]))
        ) {
          return true
        }

        return (
          normalizeExactProjectValue(field, project[field]) ===
          normalizeExactProjectValue(field, existing[field])
        )
      },
    ),
  ) || null

export const exactProjectMatch = (left, right) =>
  exactProjectFields.every(
    (field) => {
      if (
        field === "clientId" &&
        (!normalizeExactProjectValue(field, left[field]) ||
          !normalizeExactProjectValue(field, right[field]))
      ) {
        return true
      }

      return (
        normalizeExactProjectValue(field, left[field]) ===
        normalizeExactProjectValue(field, right[field])
      )
    },
  )

export const findExistingProject = (
  { clientId, clientName, year, isow },
  existingClients,
  matchedClientIds = new Set(),
) => {
  if (clientId) {
    const exactIdMatch = existingClients.find(
      (client) =>
        !matchedClientIds.has(client.clientId) &&
        normalizeMatchValue(client.clientId) === normalizeMatchValue(clientId),
    )
    if (exactIdMatch) return exactIdMatch
  }

  const normalizedName = normalizeMatchValue(clientName)
  const normalizedIsow = normalizeMatchValue(isow)
  const compatibleYear = (client) => {
    const existingYear = Number(client.year) || null
    return !year || !existingYear || existingYear === Number(year)
  }
  const eligibleClients = existingClients.filter(
    (client) => !matchedClientIds.has(client.clientId) && compatibleYear(client),
  )
  if (normalizedIsow) {
    const exactIsowMatches = eligibleClients.filter(
      (client) => normalizeMatchValue(client.isow) === normalizedIsow,
    )
    if (exactIsowMatches.length === 1) return exactIsowMatches[0]
  }

  const candidates = eligibleClients.filter((client) => {
    const existingName = normalizeMatchValue(client.clientName)
    if (!normalizedName || existingName !== normalizedName) return false
    if (!compatibleYear(client)) return false
    const existingIsow = normalizeMatchValue(client.isow)
    if (normalizedIsow && existingIsow && existingIsow !== normalizedIsow) {
      return false
    }
    return true
  })
  if (normalizedIsow) {
    const exactIsowCandidates = candidates.filter(
      (client) => normalizeMatchValue(client.isow) === normalizedIsow,
    )
    if (exactIsowCandidates.length === 1) return exactIsowCandidates[0]
  }

  return candidates.length === 1 ? candidates[0] : null
}

export { createProjectIdAllocator } from "../../shared/project-id.js"

export const isCanonicalProjectId = (projectId) =>
  /^PS[A-Z]{3}\d{5}$/i.test(String(projectId || ""))

export const resolveImportedProjectId = ({
  sourceClientId,

  existingClientId,

  allocator,

  plannedStartDate,

  year,
}) => {
  if (isCanonicalProjectId(sourceClientId)) return sourceClientId

  if (isCanonicalProjectId(existingClientId)) return existingClientId

  return allocator.next({ date: plannedStartDate, year })
}

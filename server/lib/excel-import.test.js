import assert from "node:assert/strict"

import test from "node:test"

import ExcelJS from "exceljs"

import {
  createProjectIdAllocator,
  findExistingProject,
  normalizeProjectStatus,
  parseSpreadsheetPercentage,
  parseSpreadsheetDate,
  resolveImportedProjectId,
  worksheetRecords,
} from "./excel-import.js"

test("reads grouped Estimated and Actual date headers", () => {
  const workbook = new ExcelJS.Workbook()

  const worksheet = workbook.addWorksheet("Projects")

  worksheet.addRow([
    "Year",

    "Customer Name",

    "Estimated",

    null,

    "Actual",

    null,
  ])

  worksheet.addRow([
    null,

    null,

    "Project Start date",

    "Project End Date",

    "Project Start date",

    "Project End Date",
  ])

  worksheet.addRow([
    2026,

    "Example Project",

    new Date("2026-01-01T00:00:00.000Z"),

    new Date("2026-06-30T00:00:00.000Z"),

    new Date("2026-01-05T00:00:00.000Z"),

    new Date("2026-07-02T00:00:00.000Z"),
  ])

  assert.deepEqual(worksheetRecords(worksheet), [
    {
      Year: "2026",

      "Customer Name": "Example Project",

      "Estimated Project Start date": "2026-01-01",

      "Estimated Project End Date": "2026-06-30",

      "Actual Project Start date": "2026-01-05",

      "Actual Project End Date": "2026-07-02",
    },
  ])
})

test("normalizes repeated spaces and reads formula-cached Excel dates", () => {
  const workbook = new ExcelJS.Workbook()

  const worksheet = workbook.addWorksheet("Projects")

  worksheet.addRow(["Year", "Estimated", "Actual"])

  worksheet.addRow(["Year", "Project  Start date", "Project End Date"])

  worksheet.addRow([
    2026,

    {
      formula: "A1",

      result: new Date("2026-01-15T00:00:00.000Z"),
    },

    { formula: "A1" },
  ])

  const [record] = worksheetRecords(worksheet)

  assert.equal(record["Estimated Project Start date"], "2026-01-15")

  assert.equal(record["Actual Project End Date"], "")

  assert.deepEqual(record.sourceWarnings, [
    "Row 3, Actual Project End Date: formula has no cached result",
  ])
})

test("keeps support for a single-row header workbook", () => {
  const workbook = new ExcelJS.Workbook()

  const worksheet = workbook.addWorksheet("Projects")

  worksheet.addRow(["Project ID", "Customer Name"])

  worksheet.addRow(["CLT-101", "Example Project"])

  assert.deepEqual(worksheetRecords(worksheet), [
    { "Project ID": "CLT-101", "Customer Name": "Example Project" },
  ])
})

test("parses supported date values and rejects invalid spreadsheet dates", () => {
  assert.deepEqual(parseSpreadsheetDate("2026-10-07"), {
    value: "2026-10-07",

    error: null,
  })

  assert.deepEqual(parseSpreadsheetDate(46201), {
    value: "2026-06-28",

    error: null,
  })

  assert.deepEqual(parseSpreadsheetDate("Invalid Da"), {
    value: null,

    error: "Invalid Da",
  })

  assert.deepEqual(parseSpreadsheetDate("2026-02-31"), {
    value: null,

    error: "2026-02-31",
  })

  assert.deepEqual(parseSpreadsheetDate(""), { value: null, error: null })
})

test("parses date strings and cached invalid Excel dates from the project workbook", () => {
  assert.deepEqual(parseSpreadsheetDate("15th Jan", 2026), {
    value: "2026-01-15",

    error: null,
  })

  assert.deepEqual(parseSpreadsheetDate("31st Aug", 2025), {
    value: "2025-08-31",

    error: null,
  })

  assert.deepEqual(parseSpreadsheetDate("07-11-2025 (TBD)"), {
    value: "2025-11-07",

    error: null,
  })

  assert.deepEqual(parseSpreadsheetDate(new Date(Number.NaN)), {
    value: null,

    error: "Invalid Date",
  })

  assert.deepEqual(parseSpreadsheetDate(new Date("1899-12-30T00:00:00Z")), {
    value: null,

    error: "1899-12-30",
  })
})

test("converts Excel percentage fractions and source status values", () => {
  assert.equal(parseSpreadsheetPercentage(0.8928571428571429), 89.29)

  assert.equal(parseSpreadsheetPercentage("75%"), 75)

  assert.equal(parseSpreadsheetPercentage(75), 75)

  assert.equal(normalizeProjectStatus("On Track "), "On-track")

  assert.equal(normalizeProjectStatus("Delayed(External)"), "Delayed")

  assert.equal(normalizeProjectStatus("On Hold"), "ON Hold")
})

test("matches imported projects without risking row-index ID overwrites", () => {
  const existing = [
    {
      id: 3,

      clientId: "CLT-003",

      clientName: "Barts",

      year: 2026,

      isow: "8520_260_2026_472761",
    },

    {
      id: 4,

      clientId: "CLT-004",

      clientName: "Barts",

      year: 2026,

      isow: "OTHER-ISOW",
    },
  ]

  const matched = findExistingProject(
    {
      clientName: "Barts",

      year: 2026,

      isow: "8520_260_2026_472761",
    },

    existing,

    new Set(),
  )

  assert.equal(matched.clientId, "CLT-003")

  assert.equal(
    findExistingProject(
      { clientName: "Barts", year: 2026, isow: "" },

      existing,

      new Set(),
    ),

    null,
  )

  const allocate = createProjectIdAllocator(["PSDEC26003", "clt-004"])

  allocate.reserve("PSDEC26005")

  assert.equal(
    allocate.next({ month: "Dec", year: 2026 }),

    "PSDEC26006",
  )

  assert.equal(
    allocate.next({ month: "Jan", year: 2027 }),

    "PSJAN27001",
  )

  assert.equal(
    resolveImportedProjectId({
      sourceClientId: "CLT-101",

      existingClientId: "CLT-101",

      allocator: allocate,

      period: { date: "2026-12-01", year: 2026 },
    }),

    "PSDEC26007",
  )

  assert.equal(
    resolveImportedProjectId({
      sourceClientId: "CLT-101",

      existingClientId: "PSDEC26008",

      allocator: allocate,

      period: { date: "2026-12-01", year: 2026 },
    }),

    "PSDEC26008",
  )
})

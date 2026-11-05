import assert from "node:assert/strict"

import test from "node:test"

import ExcelJS from "exceljs"

import {
  createProjectIdAllocator,
  decideRepeatedWorkbookRow,
  exactProjectMatch,
  findExactDuplicateProject,
  findExistingProject,
  normalizeProjectStatus,
  parseSpreadsheetPercentage,
  parseSpreadsheetDate,
  resolveImportedProjectId,
  spreadsheetValue,
  worksheetRecords,
} from "./excel-import.js"

const requiredProjectHeaders = [
  "Year",
  "Customer Name",
  "Current Status",
  "% Completion",
  "Hyperscaler",
  "Brief about the Project",
  "PM Name",
  "ISOW",
]

test("matches exact imported project rows across every imported data field", () => {
  const imported = {
    clientId: "PSJAN26001",

    clientName: "Example Project",

    year: 2026,

    region: "North",

    currentStatus: "On Track",

    phase: "Execution",

    completion: 50,

    projectBillingCode: "BILL-1",

    voumetric: 2,

    revenue: 15000,

    hyperscaler: "Azure",

    projectBrief: "Move workloads",

    projectManager: "Example Manager",

    isow: "ISOW-1",

    estimatedStart: "2026-01-01",

    estimatedEnd: "2026-06-30",

    actualStart: null,

    actualEnd: null,
  }

  const existing = { ...imported, completion: "50.00" }

  assert.equal(findExactDuplicateProject(imported, [existing]), existing)

  assert.equal(exactProjectMatch(imported, existing), true)

  assert.equal(
    findExactDuplicateProject({ ...imported, revenue: 15001 }, [existing]),

    null,
  )

  assert.equal(
    exactProjectMatch(imported, { ...existing, voumetric: 3 }),
    false,
  )
  assert.equal(
    exactProjectMatch(imported, { ...existing, phase: "Deployment" }),
    false,
  )

  assert.equal(
    exactProjectMatch(imported, { ...existing, clientId: "PSJAN26002" }),

    false,
  )
})

test("repeated workbook rows import only after explicit acceptance", () => {
  assert.equal(
    decideRepeatedWorkbookRow({
      selected: false,
      accepted: false,
      rejected: false,
    }),
    "skip",
  )
  assert.equal(
    decideRepeatedWorkbookRow({
      selected: true,
      accepted: false,
      rejected: false,
    }),
    "unconfirmed",
  )
  assert.equal(
    decideRepeatedWorkbookRow({
      selected: true,
      accepted: true,
      rejected: false,
    }),
    "import",
  )
  assert.equal(
    decideRepeatedWorkbookRow({
      selected: false,
      accepted: false,
      rejected: true,
    }),
    "reject",
  )
})

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
    ...requiredProjectHeaders.slice(2),
  ])

  worksheet.addRow([
    null,

    null,

    "Project Start date",

    "Project End Date",

    "Project Start date",

    "Project End Date",
    ...Array(6).fill(null),
  ])

  worksheet.addRow([
    2026,

    "Example Project",

    new Date("2026-01-01T00:00:00.000Z"),

    new Date("2026-06-30T00:00:00.000Z"),

    new Date("2026-01-05T00:00:00.000Z"),

    new Date("2026-07-02T00:00:00.000Z"),
    "On Track",
    50,
    "Azure",
    "Example brief",
    "Example Manager",
    "ISOW-1",
  ])

  assert.deepEqual(worksheetRecords(worksheet), [
    {
      Year: "2026",

      "Customer Name": "Example Project",

      "Estimated Project Start date": "2026-01-01",

      "Estimated Project End Date": "2026-06-30",

      "Actual Project Start date": "2026-01-05",

      "Actual Project End Date": "2026-07-02",

      "Current Status": "On Track",

      "% Completion": "50",

      Hyperscaler: "Azure",

      "Brief about the Project": "Example brief",

      "PM Name": "Example Manager",

      ISOW: "ISOW-1",
    },
  ])
})

test("normalizes repeated spaces and reads formula-cached Excel dates", () => {
  const workbook = new ExcelJS.Workbook()

  const worksheet = workbook.addWorksheet("Projects")

  worksheet.addRow(["Year", "Estimated", "Actual", ...requiredProjectHeaders.slice(1)])

  worksheet.addRow([
    null,
    "Project  Start date",
    "Project End Date",
    ...Array(requiredProjectHeaders.length - 1).fill(null),
  ])

  worksheet.addRow([
    2026,

    {
      formula: "A1",

      result: new Date("2026-01-15T00:00:00.000Z"),
    },

    { formula: "A1" },
    "Example Project",
    "On Track",
    25,
    "Azure",
    "Example brief",
    "Example Manager",
    "ISOW-1",
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

  worksheet.addRow(["Project ID", ...requiredProjectHeaders])

  worksheet.addRow([
    "CLT-101",
    2026,
    "Example Project",
    "On Track",
    0,
    "Azure",
    "Example brief",
    "Example Manager",
    "ISOW-1",
  ])

  const [record] = worksheetRecords(worksheet)
  assert.equal(record["Project ID"], "CLT-101")
  assert.equal(record["Customer Name"], "Example Project")
  assert.equal(record.rowNumber, 2)
})

test("reads estimated start and end dates from the workbook's short headers", () => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Projects")
  worksheet.addRow([
    "Year",
    "Estimated start date",
    "end date",
    "Actual start date",
    ...requiredProjectHeaders.slice(1),
  ])
  worksheet.addRow([
    2026,
    new Date("2026-01-15T00:00:00.000Z"),
    new Date("2026-10-30T00:00:00.000Z"),
    new Date("2026-03-19T00:00:00.000Z"),
    "Example Project",
    "On Track",
    50,
    "Azure",
    "Example brief",
    "Example Manager",
    "ISOW-1",
  ])

  const [record] = worksheetRecords(worksheet)
  const estimatedStart = parseSpreadsheetDate(
    spreadsheetValue(
      record,
      "Estimated/Planned Start Date",
      "Estimated Start Date",
      "Planned Start Date",
    ),
    Number(record.Year),
  )
  const estimatedEnd = parseSpreadsheetDate(
    spreadsheetValue(record, "End Date", "Estimated Project End Date"),
    Number(record.Year),
  )

  assert.deepEqual(estimatedStart, { value: "2026-01-15", error: null })
  assert.deepEqual(estimatedEnd, { value: "2026-10-30", error: null })
})

test("finds the project table below report title and summary rows", () => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Projects")
  worksheet.addRow(["Portfolio Status Summary"])
  worksheet.addRow(["Total Projects", 76, "On Track", 6, "Delayed", 1])
  worksheet.addRow([])
  worksheet.addRow(requiredProjectHeaders)
  worksheet.addRow([
    2026,
    "Example Project",
    "On Track",
    50,
    "Azure",
    "Example brief",
    "Example Manager",
    "ISOW-1",
  ])

  const records = worksheetRecords(worksheet)

  assert.equal(records.length, 1)
  assert.equal(records[0].rowNumber, 5)
  assert.equal(records[0]["Customer Name"], "Example Project")
})

test("detects supported project header aliases", () => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Projects")
  worksheet.addRow([
    "Year",
    "Client Name",
    "Status",
    "Completion",
    "Hyperscaler",
    "Project Brief",
    "Account Manager",
    "ISOW",
  ])
  worksheet.addRow([
    2026,
    "Example Project",
    "On Track",
    50,
    "Azure",
    "Example brief",
    "Example Manager",
    "ISOW-1",
  ])

  const [record] = worksheetRecords(worksheet)

  assert.equal(record.rowNumber, 2)
  assert.equal(record["Client Name"], "Example Project")
})

test("finds grouped date headers below summary content and preserves row numbers", () => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Projects")
  worksheet.addRow(["Portfolio Status Summary"])
  worksheet.addRow(["Total Projects", 76, "On Track", 6])
  worksheet.addRow([
    "Year",
    "Customer Name",
    "Estimated",
    null,
    "Actual",
    null,
    "Current Status",
    "% Completion",
    "Hyperscaler",
    "Brief about the Project",
    "PM Name",
    "ISOW",
  ])
  worksheet.addRow([
    null,
    null,
    "Project Start Date",
    "Project End Date",
    "Project Start Date",
    "Project End Date",
    ...Array(6).fill(null),
  ])
  worksheet.addRow([
    2026,
    "Example Project",
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-06-30T00:00:00.000Z"),
    null,
    null,
    "On Track",
    50,
    "Azure",
    "Example brief",
    "Example Manager",
    "ISOW-1",
  ])

  const records = worksheetRecords(worksheet)

  assert.equal(records.length, 1)
  assert.equal(records[0].rowNumber, 5)
  assert.equal(records[0]["Estimated Project Start Date"], "2026-01-01")
  assert.equal(records[0]["Estimated Project End Date"], "2026-06-30")
})

test("reports the required columns when no project header row is found", () => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Projects")
  worksheet.addRow(["Portfolio Status Summary"])
  worksheet.addRow(["Total Projects", 76, "On Track", 6])

  assert.throws(
    () => worksheetRecords(worksheet),
    /Could not find a project table header row\. Missing required columns: Year, Customer Name, Current Status, % Completion, Hyperscaler, Brief about the Project, PM Name, ISOW/,
  )
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

  assert.equal(normalizeProjectStatus("On Track "), "On Track")

  assert.equal(normalizeProjectStatus("Delayed(External)"), "Off Track (External)")

  assert.equal(normalizeProjectStatus("On Hold"), "On Hold")

  assert.equal(normalizeProjectStatus("Delayed(Internal)"), "Off Track (Internal)")
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

      plannedStartDate: "2026-12-01",

      year: 2026,
    }),

    "PSDEC26007",
  )

  assert.equal(
    resolveImportedProjectId({
      sourceClientId: "CLT-101",

      existingClientId: "PSDEC26008",

      allocator: allocate,

      plannedStartDate: "2026-12-01",

      year: 2026,
    }),

    "PSDEC26008",
  )

  assert.equal(
    resolveImportedProjectId({
      sourceClientId: "LEGACY-102",

      allocator: allocate,

      plannedStartDate: "2027-03-15",

      year: 2027,
    }),

    "PSMAR27001",
  )
})

test("matches projects by normalized identity when workbook IDs use another scheme", () => {
  const existing = [
    {
      id: 10,

      clientId: "PSOCT26001",

      clientName: "North & Star – Cloud Migration",

      year: 2026,

      isow: "ISOW-100",
    },

    {
      id: 11,

      clientId: "PSOCT26002",

      clientName: "North Star Cloud Migration",

      year: 2026,

      isow: "ISOW-101",
    },
  ]

  const matched = findExistingProject(
    {
      clientId: "LEGACY-0042",

      clientName: "North and Star Cloud Migration",

      year: 2026,

      isow: "ISOW-100",
    },

    existing,

    new Set(),
  )

  assert.equal(matched.clientId, "PSOCT26001")

  assert.equal(
    findExistingProject(
      {
        clientId: "LEGACY-0099",

        clientName: "Renamed project in the workbook",

        year: 2026,

        isow: "ISOW-101",
      },

      existing,

      new Set(),
    )?.clientId,

    "PSOCT26002",
  )

  assert.equal(
    findExistingProject(
      {
        clientId: "PSOCT26001",

        clientName: "North and Star Cloud Migration",

        year: 2026,

        isow: "ISOW-100",
      },

      existing,

      new Set(["PSOCT26001"]),
    ),

    null,
  )
})

test("matches projects by normalized identity when workbook IDs use another scheme", () => {
  const existing = [
    {
      id: 10,
      clientId: "PSOCT26001",
      clientName: "North & Star – Cloud Migration",
      year: 2026,
      isow: "ISOW-100",
    },
    {
      id: 11,
      clientId: "PSOCT26002",
      clientName: "North Star Cloud Migration",
      year: 2026,
      isow: "ISOW-101",
    },
  ]

  const matched = findExistingProject(
    {
      clientId: "LEGACY-0042",
      clientName: "North and Star Cloud Migration",
      year: 2026,
      isow: "ISOW-100",
    },
    existing,
    new Set(),
  )

  assert.equal(matched.clientId, "PSOCT26001")
  assert.equal(
    findExistingProject(
      {
        clientId: "LEGACY-0099",
        clientName: "Renamed project in the workbook",
        year: 2026,
        isow: "ISOW-101",
      },
      existing,
      new Set(),
    )?.clientId,
    "PSOCT26002",
  )
  assert.equal(
    findExistingProject(
      {
        clientId: "PSOCT26001",
        clientName: "North and Star Cloud Migration",
        year: 2026,
        isow: "ISOW-100",
      },
      existing,
      new Set(["PSOCT26001"]),
    ),
    null,
  )
})

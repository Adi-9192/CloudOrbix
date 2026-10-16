import express from "express"

import multer from "multer"

import ExcelJS from "exceljs"

import { appState, createAuditEntry, createImportLog, getPool } from "../db.js"

import { protectRoute, requireRole } from "../middleware/auth.js"

import {
  createProjectIdAllocator,
  exactProjectMatch,
  findExactDuplicateProject,
  findExistingProject,
  normalizeProjectStatus,
  parseSpreadsheetPercentage,
  parseSpreadsheetDate,
  resolveImportedProjectId,
  spreadsheetValue as value,
  worksheetRecords,
} from "../lib/excel-import.js"

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 50 * 1024 * 1024 },
})

const required = [
  "Year",

  "Customer Name",

  "Current Status",

  "% Completion",

  "Hyperscaler",

  "Project Type",

  "Brief about the Project",

  "PM Name",

  "ISOW",
]

const templateColumns = [
  "Project ID",

  "Year",

  "Customer Name",

  "PM Name",

  "Project Billing Code",

  "Volumetric",

  "Region",

  "Current Status",

  "Revenue",

  "% Completion",

  "Hyperscaler",

  "Project Type",

  "Brief about the Project",

  "ISOW",

  "Estimated Project Start date",

  "Estimated Project End Date",

  "Actual Project Start date",

  "Actual Project End Date",
]

const clientIdFor = (record) =>
  String(value(record, "Project ID", "Client ID", "Customer ID")).trim()

const normalizeSourceIdentity = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

const hasSourceColumn = (headers, ...aliases) =>
  aliases.some((alias) =>
    headers.some(
      (header) =>
        header.replace(/\s+/g, " ").trim().toLowerCase() ===
        alias.replace(/\s+/g, " ").trim().toLowerCase(),
    ),
  )

const hasFormulaIssue = (record, header) =>
  record.sourceWarnings.some((warning) => warning.includes(`, ${header}:`))

const dateForPreview = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value || null

const managerName = (record) =>
  String(
    value(record, "PM Name", "Manager", "Project Manager", "Account Manager") ||
      "Unassigned",
  ).trim()

router.get(
  "/template",

  protectRoute,

  requireRole("Admin", "Operations Team"),

  async (req, res) => {
    const workbook = new ExcelJS.Workbook()

    const worksheet = workbook.addWorksheet("Projects")

    worksheet.addRow(templateColumns)

    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader(
      "Content-Type",

      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    res.setHeader(
      "Content-Disposition",

      'attachment; filename="cloudorbix-project-template.xlsx"',
    )

    return res.send(buffer)
  },
)

router.post(
  "/upload",

  protectRoute,

  requireRole("Admin", "Operations Team"),

  upload.single("file"),

  async (req, res, next) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." })

    try {
      const workbook = new ExcelJS.Workbook()

      await workbook.xlsx.load(req.file.buffer)

      const records = worksheetRecords(workbook.worksheets[0])
      const previewOnly = req.body.preview === "true"

      let selectedRows = null

      let rejectedRows = new Set()

      if (!previewOnly) {
        try {
          const parsedSelectedRows = JSON.parse(req.body.selectedRows || "[]")

          const parsedRejectedRows = JSON.parse(req.body.rejectedRows || "[]")

          if (
            !Array.isArray(parsedSelectedRows) ||
            parsedSelectedRows.some(
              (rowNumber) => !Number.isInteger(rowNumber),
            ) ||
            !Array.isArray(parsedRejectedRows) ||
            parsedRejectedRows.some((rowNumber) => !Number.isInteger(rowNumber))
          ) {
            return res
              .status(400)
              .json({ message: "Selected import rows are invalid." })
          }

          selectedRows = new Set(parsedSelectedRows)

          rejectedRows = new Set(parsedRejectedRows)

          if (
            [...selectedRows].some((rowNumber) => rejectedRows.has(rowNumber))
          ) {
            return res
              .status(400)
              .json({ message: "A row cannot be both accepted and rejected." })
          }
        } catch {
          return res
            .status(400)
            .json({ message: "Selected import rows are invalid." })
        }
      }

      if (!records.length)
        return res

          .status(400)

          .json({ message: "Uploaded file is empty or invalid." })

      const headers = Object.keys(records[0])

      const hasProjectId = hasSourceColumn(
        headers,

        "Project ID",

        "Client ID",

        "Customer ID",
      )

      const missing = required.filter(
        (column) => column !== "PM Name" && !headers.includes(column),
      )

      if (
        !["PM Name", "Manager", "Project Manager", "Account Manager"].some(
          (column) => headers.includes(column),
        )
      ) {
        missing.push("PM Name (or Manager / Project Manager / Account Manager)")
      }

      if (missing.length)
        return res

          .status(400)

          .json({
            message: `Missing required Excel columns: ${missing.join(", ")}`,
          })

      const pool = getPool()

      const existingClients = pool
        ? (
            await pool.query(
              "SELECT id,client_id AS clientId,client_name AS clientName,[year] AS year,isow,region,revenue,project_billing_code AS projectBillingCode,voumetric,completion,current_status AS currentStatus,project_manager AS projectManager,hyperscaler,project_type AS projectType,project_brief AS projectBrief,estimated_start_date AS estimatedStart,estimated_end_date AS estimatedEnd,actual_start_date AS actualStart,actual_end_date AS actualEnd FROM clients",
            )
          ).rows
        : appState.clients.map((client) => ({
            id: client.id,

            clientId: client.clientId,

            clientName: client.clientName,

            year: client.year,

            isow: client.isow,

            region: client.region,

            revenue: client.revenue,

            projectBillingCode: client.projectBillingCode,

            voumetric: client.voumetric,

            completion: client.completion,

            currentStatus: client.currentStatus,

            projectManager:
              client.projectManager ||
              client.project_manager ||
              client.accountManager,

            hyperscaler: client.hyperscaler,

            projectType: client.projectType || client.project_type,

            projectBrief: client.projectBrief || client.project_brief,

            estimatedStart: client.estimatedStartDate || client.estimatedStart,

            estimatedEnd: client.estimatedEndDate || client.estimatedEnd,

            actualStart: client.actualStartDate || client.actualStart,

            actualEnd: client.actualEndDate || client.actualEnd,
          }))

      const clientIdAllocator = createProjectIdAllocator(
        existingClients.map((client) => client.clientId),
      )

      const reservedClientIds = new Set(
        existingClients.map((client) =>
          String(client.clientId || "")
            .trim()
            .toUpperCase(),
        ),
      )

      for (const record of records) {
        clientIdAllocator.reserve(clientIdFor(record))
      }

      const matchedExistingIds = new Set()
      const seenSourceIds = new Set()
      const seenSourceIsows = new Set()
      const duplicateInputRows = new Set()
      for (const record of records) {
        const sourceId = normalizeSourceIdentity(clientIdFor(record))
        const sourceIsow = normalizeSourceIdentity(value(record, "ISOW"))
        const duplicate =
          (sourceId && seenSourceIds.has(sourceId)) ||
          (sourceIsow && seenSourceIsows.has(sourceIsow))
        if (duplicate) duplicateInputRows.add(record.rowNumber)
        if (sourceId) seenSourceIds.add(sourceId)
        if (sourceIsow) seenSourceIsows.add(sourceIsow)
      }

      const inputNameCounts = new Map()

      for (const record of records) {
        const name = normalizeSourceIdentity(
          value(record, "Customer Name", "Client Name"),
        )

        if (name)
          inputNameCounts.set(name, (inputNameCounts.get(name) || 0) + 1)
      }

      const existingNameCounts = new Map()

      const occupiedNames = new Set()

      for (const client of existingClients) {
        const name = String(client.clientName || "").trim()

        const normalizedName = normalizeSourceIdentity(name)

        if (normalizedName) {
          existingNameCounts.set(
            normalizedName,
            (existingNameCounts.get(normalizedName) || 0) + 1,
          )

          occupiedNames.add(normalizedName)
        }
      }

      const nameSequence = new Map()

      const seenImportRows = []

      const dateColumns = [
        {
          key: "estimatedStart",

          label: "Estimated Project Start Date",

          headers: [
            "Estimated/Planned Start Date",
            "Estimated / Planned Start Date",
            "Estimated/Planned Project Start Date",
            "Estimated Start Date",
            "Estimated Project Start date",

            "Estimated Project Start Date",

            "Planned Start Date",

            "Project Start date",

            "Project Start Date",
          ],
        },

        {
          key: "estimatedEnd",

          label: "Estimated Project End Date",

          headers: [
            "End Date",
            "Estimated Project End Date",

            "Estimated Project End date",

            "Planned End Date",

            "Project End Date",
          ],
        },

        {
          key: "actualStart",

          label: "Actual Project Start Date",

          headers: [
            "Actual Project Start date",

            "Actual Project Start Date",

            "Actual Start Date",
          ],
        },

        {
          key: "actualEnd",

          label: "Actual Project End Date",

          headers: [
            "Actual Project End Date",

            "Actual Project End date",

            "Actual End Date",
          ],
        },
      ]

      const parsedDates = new Map()

      const dateWarnings = records.flatMap((record) => record.sourceWarnings)

      if (!hasProjectId) {
        dateWarnings.unshift(
          "No Project ID column was found. Existing projects were matched by name, year, and ISOW where uniquely possible; otherwise a new Project ID was generated.",
        )
      }

      const missingOptionalColumns = [
        ["Project Billing Code", ["Project Billing Code", "Billing Code"]],

        ["Volumetric", ["Volumetric", "Voumetric"]],

        ["Region", ["Region", "Project Region"]],

        ["Revenue", ["Revenue"]],
      ].filter(([, aliases]) => !hasSourceColumn(headers, ...aliases))

      if (missingOptionalColumns.length) {
        dateWarnings.unshift(
          `The workbook does not include ${missingOptionalColumns.map(([label]) => label).join(", ")}; existing values will be preserved when a project is matched, and otherwise blank/default values will be used.`,
        )
      }

      for (const record of records) {
        const dates = {}

        const invalidDates = new Set()

        for (const column of dateColumns) {
          const raw = value(record, ...column.headers)

          const parsed = parseSpreadsheetDate(
            raw,

            Number(value(record, "Year")) || undefined,
          )

          dates[column.key] = parsed.value

          if (parsed.error) {
            invalidDates.add(column.key)

            dateWarnings.push(
              `Row ${record.rowNumber}, ${column.label}: "${parsed.error}"`,
            )
          }
        }

        parsedDates.set(record, { dates, invalidDates })
      }

      let imported = 0

      let updated = 0

      let failed = 0

      let duplicates = 0

      const importedRecords = []

      for (let index = 0; index < records.length; index += 1) {
        const record = records[index]
        if (!previewOnly && !selectedRows.has(record.rowNumber)) continue

        const sourceClientId = clientIdFor(record)

        const originalClientName = String(
          value(record, "Customer Name", "Client Name"),
        ).trim()

        if (!originalClientName || managerName(record) === "Unassigned") {
          failed += 1

          continue
        }

        if (duplicateInputRows.has(record.rowNumber)) {
          duplicates += 1
          if (previewOnly) {
            importedRecords.push({
              rowNumber: record.rowNumber,
              clientId: sourceClientId,
              clientName: String(value(record, "Customer Name", "Client Name")).trim(),
              manager: managerName(record),
              year: Number(value(record, "Year")) || new Date().getFullYear(),
              isow: String(value(record, "ISOW")),
              importKind: "Repeated in this workbook",
              duplicateInFile: true,
            })
          }
          continue
        }

        let existingTarget = findExistingProject(
          {
            clientId: sourceClientId,

            clientName: "",
          },

          existingClients,

          matchedExistingIds,
        )

        if (existingTarget) {
          matchedExistingIds.add(existingTarget.clientId)
        }

        const normalizedName = normalizeSourceIdentity(originalClientName)

        const inputNameCount = inputNameCounts.get(normalizedName) || 0

        const existingNameCount = existingNameCounts.get(normalizedName) || 0

        let clientName = originalClientName

        if (!existingTarget && (inputNameCount > 1 || existingNameCount > 0)) {
          const sequence = (nameSequence.get(normalizedName) || 0) + 1

          nameSequence.set(normalizedName, sequence)

          let suffix = existingNameCount + sequence

          let candidateName = `${originalClientName} (${suffix})`

          while (occupiedNames.has(normalizeSourceIdentity(candidateName))) {
            suffix += 1

            candidateName = `${originalClientName} (${suffix})`
          }

          clientName = candidateName

          occupiedNames.add(normalizeSourceIdentity(clientName))
        }

        const { dates, invalidDates } = parsedDates.get(record)

        const {
          estimatedStart,

          estimatedEnd,

          actualStart,

          actualEnd,
        } = dates

        let clientId

        try {
          const normalizedSourceClientId = sourceClientId.trim().toUpperCase()
          const canUseSourceClientId =
            !existingTarget &&
            /^PS[A-Z]{3}\d{5}$/i.test(sourceClientId) &&
            !reservedClientIds.has(normalizedSourceClientId)

          if (existingTarget) {
            clientId = existingTarget.clientId
          } else if (canUseSourceClientId) {
            clientId = sourceClientId
          } else {
            if (!estimatedStart) {
              dateWarnings.push(
                `Row ${record.rowNumber}: Estimated/Planned Project Start Date is required to generate a Project Code.`,
              )

              failed += 1

              continue
            }

            clientId = resolveImportedProjectId({
              sourceClientId: "",

              allocator: clientIdAllocator,

              plannedStartDate: estimatedStart,

              year: Number(value(record, "Year")) || undefined,
            })
          }

          reservedClientIds.add(clientId.trim().toUpperCase())

          clientIdAllocator.reserve(clientId)
        } catch (error) {
          dateWarnings.push(
            `Row ${record.rowNumber}: ${
              error instanceof Error
                ? error.message
                : "Project ID could not be generated."
            }`,
          )

          failed += 1

          continue
        }

        const rawVoumetric = value(record, "Volumetric", "Voumetric")

        const voumetric = rawVoumetric === "" ? null : Number(rawVoumetric)

        if (
          voumetric !== null &&
          (!Number.isInteger(voumetric) ||
            voumetric < 0 ||
            voumetric > 2147483647)
        ) {
          failed += 1

          continue
        }

        const data = {
          clientId,

          clientName,

          accountManager: managerName(record),

          region: String(
            value(record, "Region", "Project Region") || "Unassigned",
          ),

          industry: String(value(record, "Industry") || "Technology"),

          year: Number(value(record, "Year")) || new Date().getFullYear(),

          completion: parseSpreadsheetPercentage(
            value(record, "% Completion"),
          ),

          hyperscaler: String(value(record, "Hyperscaler")),

          projectType: String(value(record, "Project Type")),

          projectBrief: String(value(record, "Brief about the Project")),

          projectManager: managerName(record),

          isow: String(value(record, "ISOW")),

          projectBillingCode:
            String(
              value(record, "Project Billing Code", "Billing Code") || "",
            ) || null,

          voumetric,

          currentStatus: normalizeProjectStatus(
            value(record, "Current Status"),
          ),

          estimatedStart,

          estimatedEnd,

          actualStart,

          actualEnd,

          plannedOnboardDate: estimatedStart,

          plannedOffboardDate: estimatedEnd,

          actualOnboardDate: actualStart,

          actualOffboardDate: actualEnd,

          contractStartDate: estimatedStart,

          contractEndDate: estimatedEnd,

          remarks: String(value(record, "Remarks") || ""),

          revenue: Number(value(record, "Revenue")) || 0,

          services: String(value(record, "Services") || "")

            .split(",")

            .map((item) => item.trim())

            .filter(Boolean),
        }

        const comparisonData = {
          ...data,

          clientId: hasProjectId ? sourceClientId : "",

          clientName: originalClientName,
        }

        if (existingTarget) {
          if (!hasSourceColumn(headers, "Region", "Project Region")) {
            data.region = existingTarget.region || data.region
          }

          if (!hasSourceColumn(headers, "Revenue")) {
            data.revenue = Number(existingTarget.revenue ?? data.revenue)
          }

          if (
            !hasSourceColumn(
              headers,

              "Project Billing Code",

              "Billing Code",
            )
          ) {
            data.projectBillingCode =
              existingTarget.projectBillingCode ?? data.projectBillingCode
          }

          if (!hasSourceColumn(headers, "Volumetric", "Voumetric")) {
            data.voumetric = existingTarget.voumetric ?? data.voumetric
          }

          if (hasFormulaIssue(record, "% Completion")) {
            data.completion = Number(
              existingTarget.completion ?? data.completion,
            )
          }

          if (hasFormulaIssue(record, "Current Status")) {
            data.currentStatus =
              existingTarget.currentStatus || data.currentStatus
          }

          if (!data.estimatedStart || invalidDates.has("estimatedStart")) {
            data.estimatedStart = existingTarget.estimatedStart || null
          }

          if (!data.estimatedEnd || invalidDates.has("estimatedEnd")) {
            data.estimatedEnd = existingTarget.estimatedEnd || null
          }

          if (!data.actualStart || invalidDates.has("actualStart")) {
            data.actualStart = existingTarget.actualStart || null
          }

          if (!data.actualEnd || invalidDates.has("actualEnd")) {
            data.actualEnd = existingTarget.actualEnd || null
          }

          data.plannedOnboardDate = data.estimatedStart

          data.plannedOffboardDate = data.estimatedEnd

          data.actualOnboardDate = data.actualStart

          data.actualOffboardDate = data.actualEnd

          data.contractStartDate = data.estimatedStart

          data.contractEndDate = data.estimatedEnd
        }

        const exactExisting = findExactDuplicateProject(
          comparisonData,

          existingClients,
        )

        const exactWorkbookRow = seenImportRows.find(({ data: previous }) =>
          exactProjectMatch(comparisonData, previous),
        )

        const exactDuplicate = exactExisting || exactWorkbookRow?.data || null

        const isDuplicate = Boolean(exactDuplicate)

        seenImportRows.push({
          rowNumber: record.rowNumber,
          data: comparisonData,
        })

        if (
          !previewOnly &&
          isDuplicate &&
          !selectedRows.has(record.rowNumber) &&
          !rejectedRows.has(record.rowNumber)
        ) {
          return res.status(400).json({
            message: `Row ${record.rowNumber} is an exact duplicate. Confirm whether to accept or reject it.`,
          })
        }

        if (!previewOnly && rejectedRows.has(record.rowNumber)) {
          if (isDuplicate) duplicates += 1

          continue
        }

        if (!previewOnly && !selectedRows.has(record.rowNumber)) continue

        if (previewOnly) {
          if (existingTarget) {
            updated += 1
            if (isDuplicate) duplicates += 1
          } else {
            imported += 1
          }

          importedRecords.push({
            ...data,

            rowNumber: record.rowNumber,

            manager: data.accountManager,

            importKind: isDuplicate
              ? existingTarget
                ? `Exact duplicate of project ${existingTarget.clientId}`
                : `Exact duplicate of ${
                    exactExisting?.clientId ||
                    (exactWorkbookRow
                      ? `workbook row ${exactWorkbookRow.rowNumber}`
                      : "an existing project")
                  }`
              : existingTarget
                ? `Update existing project ${existingTarget.clientId}`
                : "Add as a new project",

            duplicateInFile: isDuplicate,

            duplicateAction: isDuplicate
              ? existingTarget
                ? "update"
                : "new"
              : undefined,
          })
          continue
        }

        if (!pool) {
          const existing = appState.clients.find(
            (client) => client.clientId === existingTarget?.clientId,
          )

          if (existing) {
            Object.assign(existing, {
              ...data,

              id: existing.id,

              createdAt: existing.createdAt,

              updatedAt: new Date().toISOString().slice(0, 10),

              clientName: data.clientName,
            })

            existingTarget.clientId = clientId

            updated += 1

            if (isDuplicate) duplicates += 1
          } else {
            appState.clients.unshift({
              ...data,

              id: Date.now() + index,

              createdAt: new Date().toISOString().slice(0, 10),

              updatedAt: new Date().toISOString().slice(0, 10),
            })

            imported += 1

            if (isDuplicate) duplicates += 1
          }

          if (!existing) {
            existingClients.push({
              id: appState.clients[0].id,

              clientId,

              clientName,

              year: data.year,

              isow: data.isow,

              region: data.region,

              revenue: data.revenue,

              projectBillingCode: data.projectBillingCode,

              voumetric: data.voumetric,

              completion: data.completion,

              currentStatus: data.currentStatus,

              estimatedStart: dateForPreview(data.estimatedStart),

              estimatedEnd: dateForPreview(data.estimatedEnd),

              actualStart: dateForPreview(data.actualStart),

              actualEnd: dateForPreview(data.actualEnd),
            })
          }

          if (existingTarget) matchedExistingIds.add(clientId)
        } else {
          const params = [
            data.clientId,

            data.clientName,

            data.accountManager,

            data.region,

            data.industry,

            data.revenue,

            data.currentStatus,

            data.remarks,

            data.plannedOnboardDate,

            data.actualOnboardDate,

            data.plannedOffboardDate,

            data.actualOffboardDate,

            data.contractStartDate,

            data.contractEndDate,

            data.year,

            data.completion,

            data.hyperscaler,

            data.projectType,

            data.projectBrief,

            data.projectManager,

            data.isow,

            data.estimatedStart,

            data.estimatedEnd,

            data.actualStart,

            data.actualEnd,

            data.projectBillingCode,

            data.voumetric,
          ]

          let clientDbId

          if (existingTarget) {
            clientDbId = existingTarget.id

            await pool.query(
              `UPDATE clients SET client_id=$1,client_name=$2,account_manager=$3,region=$4,industry=$5,revenue=$6,current_status=$7,remarks=$8,planned_onboard_date=$9,actual_onboard_date=$10,planned_offboard_date=$11,actual_offboard_date=$12,contract_start_date=$13,contract_end_date=$14,year=$15,completion=$16,hyperscaler=$17,project_type=$18,project_brief=$19,project_manager=$20,isow=$21,estimated_start_date=$22,estimated_end_date=$23,actual_start_date=$24,actual_end_date=$25,project_billing_code=$26,voumetric=$27,updated_at=CURRENT_TIMESTAMP WHERE client_id=$28`,

              [...params, existingTarget.clientId],
            )

            existingTarget.clientId = clientId

            matchedExistingIds.add(clientId)

            updated += 1

            if (isDuplicate) duplicates += 1
          } else {
            const inserted = await pool.query(
              `INSERT INTO clients(client_id,client_name,account_manager,region,industry,revenue,current_status,remarks,planned_onboard_date,actual_onboard_date,planned_offboard_date,actual_offboard_date,contract_start_date,contract_end_date,year,completion,hyperscaler,project_type,project_brief,project_manager,isow,estimated_start_date,estimated_end_date,actual_start_date,actual_end_date,project_billing_code,voumetric) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING id`,

              params,
            )

            clientDbId = inserted.rows[0].id

            imported += 1

            if (isDuplicate) duplicates += 1

            existingClients.push({
              id: clientDbId,

              clientId,

              clientName,

              year: data.year,

              isow: data.isow,

              region: data.region,

              revenue: data.revenue,

              projectBillingCode: data.projectBillingCode,

              voumetric: data.voumetric,

              completion: data.completion,

              currentStatus: data.currentStatus,

              estimatedStart: data.estimatedStart,

              estimatedEnd: data.estimatedEnd,

              actualStart: data.actualStart,

              actualEnd: data.actualEnd,
            })
          }

          await pool.query("DELETE FROM client_services WHERE client_id=$1", [
            clientDbId,
          ])

          for (const serviceName of data.services) {
            const service = await pool.query(
              "INSERT INTO services(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id",

              [serviceName],
            )

            await pool.query(
              "INSERT INTO client_services(client_id,service_id) VALUES($1,$2) ON CONFLICT DO NOTHING",

              [clientDbId, service.rows[0].id],
            )
          }
        }

        importedRecords.push({
          clientId,

          clientName,

          year: data.year,

          manager: data.accountManager,

          projectBillingCode: data.projectBillingCode,

          voumetric: data.voumetric,

          region: data.region,

          revenue: data.revenue,

          completion: data.completion,

          hyperscaler: data.hyperscaler,

          projectType: data.projectType,

          projectBrief: data.projectBrief,

          isow: data.isow,

          currentStatus: data.currentStatus,

          estimatedStart: data.estimatedStart,

          estimatedEnd: data.estimatedEnd,

          actualStart: data.actualStart,

          actualEnd: data.actualEnd,
        })
      }

      const summary = {
        totalProcessed: records.length,

        imported,

        updated,

        duplicates,

        failed,
      }

      if (!previewOnly) {
        createImportLog({ fileName: req.file.originalname, ...summary })

        createAuditEntry(
          req.user.email,

          "Excel Imported",

          "—",

          `${imported} imported / ${updated} updated`,
        )
      }

      return res.json({
        summary,

        records: importedRecords,

        warnings: dateWarnings,

        fileName: req.file.originalname,

        preview: previewOnly,
      })
    } catch (error) {
      return next(error)
    }
  },
)

export default router

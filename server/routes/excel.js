import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { appState, createAuditEntry, createImportLog, getPool } from "../db.js";
import { protectRoute, requireRole } from "../middleware/auth.js";
import {
  createProjectIdAllocator,
  findExistingProject,
  normalizeProjectStatus,
  parseSpreadsheetPercentage,
  parseSpreadsheetDate,
  worksheetRecords,
} from "../lib/excel-import.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
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
];
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
];
const value = (record, ...keys) => {
  const normalizedEntries = Object.entries(record).map(([key, entry]) => [
    key.replace(/\s+/g, " ").trim().toLowerCase(),
    entry,
  ]);
  for (const key of keys) {
    const entry = normalizedEntries.find(
      ([header]) => header === key.replace(/\s+/g, " ").trim().toLowerCase(),
    )?.[1];
    if (entry !== undefined && entry !== "") return entry;
  }
  return "";
};
const clientIdFor = (record) =>
  String(value(record, "Project ID", "Client ID", "Customer ID")).trim();
const hasSourceColumn = (headers, ...aliases) =>
  aliases.some((alias) =>
    headers.some(
      (header) =>
        header.replace(/\s+/g, " ").trim().toLowerCase() ===
        alias.replace(/\s+/g, " ").trim().toLowerCase(),
    ),
  );
const hasFormulaIssue = (record, header) =>
  record.sourceWarnings.some((warning) =>
    warning.includes(`, ${header}:`),
  );
const dateForPreview = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value || null;
const managerName = (record) =>
  String(
    value(record, "PM Name", "Manager", "Project Manager", "Account Manager") ||
      "Unassigned",
  ).trim();

router.get(
  "/template",
  protectRoute,
  requireRole("Admin", "Operations Team"),
  async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Projects");
    worksheet.addRow(templateColumns);
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="cloudorbix-project-template.xlsx"',
    );
    return res.send(buffer);
  },
);

router.post(
  "/upload",
  protectRoute,
  requireRole("Admin", "Operations Team"),
  upload.single("file"),
  async (req, res, next) => {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const records = worksheetRecords(workbook.worksheets[0]);
      if (!records.length)
        return res
          .status(400)
          .json({ message: "Uploaded file is empty or invalid." });
      const headers = Object.keys(records[0]);
      const hasProjectId = hasSourceColumn(
        headers,
        "Project ID",
        "Client ID",
        "Customer ID",
      );
      const missing = required.filter(
        (column) =>
          column !== "PM Name" &&
          !headers.includes(column),
      );
      if (
        !["PM Name", "Manager", "Project Manager", "Account Manager"].some(
          (column) => headers.includes(column),
        )
      ) {
        missing.push("PM Name (or Manager / Project Manager / Account Manager)");
      }
      if (missing.length)
        return res
          .status(400)
          .json({
            message: `Missing required Excel columns: ${missing.join(", ")}`,
          });

      const pool = getPool();
      const existingClients = pool
        ? (
            await pool.query(
              "SELECT id,client_id AS clientId,client_name AS clientName,[year] AS year,isow,region,revenue,project_billing_code AS projectBillingCode,voumetric,completion,current_status AS currentStatus,estimated_start_date AS estimatedStart,estimated_end_date AS estimatedEnd,actual_start_date AS actualStart,actual_end_date AS actualEnd FROM clients",
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
            estimatedStart: client.estimatedStartDate || client.estimatedStart,
            estimatedEnd: client.estimatedEndDate || client.estimatedEnd,
            actualStart: client.actualStartDate || client.actualStart,
            actualEnd: client.actualEndDate || client.actualEnd,
          }));
      const clientIdAllocator = createProjectIdAllocator(
        existingClients.map((client) => client.clientId),
      );
      for (const record of records) {
        clientIdAllocator.reserve(clientIdFor(record));
      }
      const matchedExistingIds = new Set();
      const dateColumns = [
        {
          key: "estimatedStart",
          label: "Estimated Project Start Date",
          headers: [
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
      ];
      const parsedDates = new Map();
      const dateWarnings = records.flatMap((record) => record.sourceWarnings);
      if (!hasProjectId) {
        dateWarnings.unshift(
          "No Project ID column was found. Existing projects were matched by name, year, and ISOW where uniquely possible; otherwise a new Project ID was generated.",
        );
      }
      const missingOptionalColumns = [
        ["Project Billing Code", ["Project Billing Code", "Billing Code"]],
        ["Volumetric", ["Volumetric", "Voumetric"]],
        ["Region", ["Region", "Project Region"]],
        ["Revenue", ["Revenue"]],
      ].filter(([, aliases]) => !hasSourceColumn(headers, ...aliases));
      if (missingOptionalColumns.length) {
        dateWarnings.unshift(
          `The workbook does not include ${missingOptionalColumns.map(([label]) => label).join(", ")}; existing values will be preserved when a project is matched, and otherwise blank/default values will be used.`,
        );
      }
      for (const record of records) {
        const dates = {};
        const invalidDates = new Set();
        for (const column of dateColumns) {
          const raw = value(record, ...column.headers);
          const parsed = parseSpreadsheetDate(
            raw,
            Number(value(record, "Year")) || undefined,
          );
          dates[column.key] = parsed.value;
          if (parsed.error) {
            invalidDates.add(column.key);
            dateWarnings.push(
              `Row ${record.rowNumber}, ${column.label}: "${parsed.error}"`,
            );
          }
        }
        parsedDates.set(record, { dates, invalidDates });
      }

      let imported = 0;
      let updated = 0;
      let failed = 0;
      let duplicates = 0;
      const importedRecords = [];
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        const sourceClientId = clientIdFor(record);
        const clientName = String(
          value(record, "Customer Name", "Client Name"),
        ).trim();
        if (!clientName || managerName(record) === "Unassigned") {
          failed += 1;
          continue;
        }
        const existingTarget = findExistingProject(
          {
            clientId: sourceClientId,
            clientName,
            year: Number(value(record, "Year")) || null,
            isow: value(record, "ISOW"),
          },
          existingClients,
          matchedExistingIds,
        );
        if (existingTarget) {
          matchedExistingIds.add(existingTarget.clientId);
        }
        const clientId =
          sourceClientId || existingTarget?.clientId || clientIdAllocator.next();
        const { dates, invalidDates } = parsedDates.get(record);
        const {
          estimatedStart,
          estimatedEnd,
          actualStart,
          actualEnd,
        } = dates;
        const rawVoumetric = value(record, "Volumetric", "Voumetric");
        const voumetric =
          rawVoumetric === "" ? null : Number(rawVoumetric);
        if (
          voumetric !== null &&
          (!Number.isInteger(voumetric) ||
            voumetric < 0 ||
            voumetric > 2147483647)
        ) {
          failed += 1;
          continue;
        }
        const data = {
          clientId,
          clientName,
          accountManager: managerName(record),
          region: String(value(record, "Region", "Project Region") || "Unassigned"),
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
        };
        if (existingTarget) {
          if (!hasSourceColumn(headers, "Region", "Project Region")) {
            data.region = existingTarget.region || data.region;
          }
          if (!hasSourceColumn(headers, "Revenue")) {
            data.revenue = Number(existingTarget.revenue ?? data.revenue);
          }
          if (
            !hasSourceColumn(
              headers,
              "Project Billing Code",
              "Billing Code",
            )
          ) {
            data.projectBillingCode =
              existingTarget.projectBillingCode ?? data.projectBillingCode;
          }
          if (!hasSourceColumn(headers, "Volumetric", "Voumetric")) {
            data.voumetric = existingTarget.voumetric ?? data.voumetric;
          }
          if (hasFormulaIssue(record, "% Completion")) {
            data.completion = Number(
              existingTarget.completion ?? data.completion,
            );
          }
          if (hasFormulaIssue(record, "Current Status")) {
            data.currentStatus =
              existingTarget.currentStatus || data.currentStatus;
          }
          if (invalidDates.has("estimatedStart")) {
            data.estimatedStart = existingTarget.estimatedStart || null;
          }
          if (invalidDates.has("estimatedEnd")) {
            data.estimatedEnd = existingTarget.estimatedEnd || null;
          }
          if (invalidDates.has("actualStart")) {
            data.actualStart = existingTarget.actualStart || null;
          }
          if (invalidDates.has("actualEnd")) {
            data.actualEnd = existingTarget.actualEnd || null;
          }
          data.plannedOnboardDate = data.estimatedStart;
          data.plannedOffboardDate = data.estimatedEnd;
          data.actualOnboardDate = data.actualStart;
          data.actualOffboardDate = data.actualEnd;
          data.contractStartDate = data.estimatedStart;
          data.contractEndDate = data.estimatedEnd;
        }

        if (!pool) {
          const existing = appState.clients.find(
            (client) => client.clientId === existingTarget?.clientId,
          );
          if (existing) {
            Object.assign(existing, {
              ...data,
              id: existing.id,
              createdAt: existing.createdAt,
              updatedAt: new Date().toISOString().slice(0, 10),
              clientName: data.clientName,
            });
            updated += 1;
            duplicates += 1;
          } else {
            appState.clients.unshift({
              ...data,
              id: Date.now() + index,
              createdAt: new Date().toISOString().slice(0, 10),
              updatedAt: new Date().toISOString().slice(0, 10),
            });
            imported += 1;
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
            });
          }
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
          ];
          let clientDbId;
          if (existingTarget) {
            clientDbId = existingTarget.id;
            await pool.query(
              `UPDATE clients SET client_name=$1,account_manager=$2,region=$3,industry=$4,revenue=$5,current_status=$6,remarks=$7,planned_onboard_date=$8,actual_onboard_date=$9,planned_offboard_date=$10,actual_offboard_date=$11,contract_start_date=$12,contract_end_date=$13,year=$14,completion=$15,hyperscaler=$16,project_type=$17,project_brief=$18,project_manager=$19,isow=$20,estimated_start_date=$21,estimated_end_date=$22,actual_start_date=$23,actual_end_date=$24,project_billing_code=$25,voumetric=$26,updated_at=CURRENT_TIMESTAMP WHERE client_id=$27`,
              [...params.slice(1), existingTarget.clientId],
            );
            updated += 1;
            duplicates += 1;
          } else {
            const inserted = await pool.query(
              `INSERT INTO clients(client_id,client_name,account_manager,region,industry,revenue,current_status,remarks,planned_onboard_date,actual_onboard_date,planned_offboard_date,actual_offboard_date,contract_start_date,contract_end_date,year,completion,hyperscaler,project_type,project_brief,project_manager,isow,estimated_start_date,estimated_end_date,actual_start_date,actual_end_date,project_billing_code,voumetric) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING id`,
              params,
            );
            clientDbId = inserted.rows[0].id;
            imported += 1;
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
            });
          }
          await pool.query("DELETE FROM client_services WHERE client_id=$1", [
            clientDbId,
          ]);
          for (const serviceName of data.services) {
            const service = await pool.query(
              "INSERT INTO services(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
              [serviceName],
            );
            await pool.query(
              "INSERT INTO client_services(client_id,service_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
              [clientDbId, service.rows[0].id],
            );
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
        });
      }
      const summary = {
        totalProcessed: records.length,
        imported,
        updated,
        duplicates,
        failed,
      };
      createImportLog({ fileName: req.file.originalname, ...summary });
      createAuditEntry(
        req.user.email,
        "Excel Imported",
        "—",
        `${imported} imported / ${updated} updated`,
      );
      return res.json({
        summary,
        records: importedRecords,
        warnings: dateWarnings,
        fileName: req.file.originalname,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;

import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { appState, createAuditEntry, createImportLog, getPool } from "../db.js";
import { protectRoute, requireRole } from "../middleware/auth.js";

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
const value = (record, ...keys) => {
  for (const key of keys)
    if (record[key] !== undefined && record[key] !== "") return record[key];
  return "";
};
const dateValue = (record, ...keys) => {
  const raw = value(record, ...keys);
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? String(raw).slice(0, 10)
    : parsed.toISOString().slice(0, 10);
};
const clientIdFor = (record, index) =>
  String(
    value(record, "Client ID", "Customer ID") ||
      `CLT-${String(index + 1).padStart(3, "0")}`,
  ).trim();
const managerName = (record) =>
  String(value(record, "PM Name", "Account Manager") || "Unassigned").trim();

const worksheetRecords = (worksheet) => {
  const headers = worksheet.getRow(1).values.slice(1).map((item) => String(item || '').trim());
  return worksheet.getRows(2, Math.max(worksheet.rowCount - 1, 0)).map((row) => Object.fromEntries(headers.map((header, index) => {
    const cell = row.getCell(index + 1).value;
    return [header, cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? '')];
  }))).filter((record) => Object.values(record).some(Boolean));
};

router.get(
  "/template",
  protectRoute,
  requireRole("Admin", "Operations Team"),
  async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Projects");
    worksheet.addRow(required);
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
      const missing = required.filter((column) => !headers.includes(column));
      if (missing.length)
        return res
          .status(400)
          .json({
            message: `Missing required Excel columns: ${missing.join(", ")}`,
          });

      const pool = getPool();
      let imported = 0;
      let updated = 0;
      let failed = 0;
      let duplicates = 0;
      const importedRecords = [];
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        const clientId = clientIdFor(record, index);
        const clientName = String(
          value(record, "Customer Name", "Client Name"),
        ).trim();
        if (!clientName || managerName(record) === "Unassigned") {
          failed += 1;
          continue;
        }
        const estimatedStart = dateValue(
          record,
          "Estimated Project Start date",
          "Estimated Project Start Date",
          "Project Start date",
          "Project Start Date",
        );
        const estimatedEnd = dateValue(
          record,
          "Estimated Project End Date",
          "Estimated Project End date",
          "Project End Date",
        );
        const actualStart = dateValue(
          record,
          "Actual Project Start date",
          "Actual Project Start Date",
        );
        const actualEnd = dateValue(
          record,
          "Actual Project End Date",
          "Actual Project End date",
        );
        const data = {
          clientId,
          clientName,
          accountManager: managerName(record),
          region: String(value(record, "Region") || "Unassigned"),
          industry: String(value(record, "Industry") || "Technology"),
          year: Number(value(record, "Year")) || new Date().getFullYear(),
          completion: Math.max(
            0,
            Math.min(100, Number(value(record, "% Completion")) || 0),
          ),
          hyperscaler: String(value(record, "Hyperscaler")),
          projectType: String(value(record, "Project Type")),
          projectBrief: String(value(record, "Brief about the Project")),
          projectManager: managerName(record),
          isow: String(value(record, "ISOW")),
          currentStatus: String(value(record, "Current Status") || "Onboarded"),
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

        if (!pool) {
          const existing = appState.clients.find(
            (client) => client.clientId === clientId,
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
        } else {
          const existing = await pool.query(
            "SELECT id FROM clients WHERE client_id = $1",
            [clientId],
          );
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
          ];
          let clientDbId;
          if (existing.rows[0]) {
            clientDbId = existing.rows[0].id;
            await pool.query(
              `UPDATE clients SET client_name=$1,account_manager=$2,region=$3,industry=$4,revenue=$5,current_status=$6,remarks=$7,planned_onboard_date=$8,actual_onboard_date=$9,planned_offboard_date=$10,actual_offboard_date=$11,contract_start_date=$12,contract_end_date=$13,year=$14,completion=$15,hyperscaler=$16,project_type=$17,project_brief=$18,project_manager=$19,isow=$20,estimated_start_date=$21,estimated_end_date=$22,actual_start_date=$23,actual_end_date=$24,updated_at=CURRENT_TIMESTAMP WHERE client_id=$25`,
              [...params.slice(1), clientId],
            );
            updated += 1;
            duplicates += 1;
          } else {
            const inserted = await pool.query(
              `INSERT INTO clients(client_id,client_name,account_manager,region,industry,revenue,current_status,remarks,planned_onboard_date,actual_onboard_date,planned_offboard_date,actual_offboard_date,contract_start_date,contract_end_date,year,completion,hyperscaler,project_type,project_brief,project_manager,isow,estimated_start_date,estimated_end_date,actual_start_date,actual_end_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING id`,
              params,
            );
            clientDbId = inserted.rows[0].id;
            imported += 1;
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
          completion: data.completion,
          currentStatus: data.currentStatus,
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
        fileName: req.file.originalname,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;

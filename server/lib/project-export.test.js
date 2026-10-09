import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { createProjectExport } from "./project-export.js";

test("exports project activity as an Excel workbook with the requested columns", async () => {
  const buffer = await createProjectExport({
    project: {
      client_id: "CLT-056",
      client_name: "ASICS",
      project_brief: "Cloud migration",
      created_at: new Date("2026-10-08T00:00:00Z"),
    },
    tasks: [
      {
        task_title: "Provision resources",
        expected_end_date: new Date("2026-10-15T00:00:00Z"),
      },
    ],
    updates: [
      {
        update_text: "Kickoff completed",
        created_at: new Date("2026-10-08T06:00:00Z"),
      },
    ],
    risks: [
      {
        risk_title: "Delayed access",
        date_raised: new Date("2026-10-09T00:00:00Z"),
      },
    ],
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));
  const worksheet = workbook.getWorksheet("Project Updates");

  assert.deepEqual(
    worksheet.getRow(1).values.slice(1),
    ["Type", "Project name", "Project ID", "Task name/ description", "Date"],
  );
  assert.equal(worksheet.rowCount, 5);
  assert.deepEqual(worksheet.getRow(2).values.slice(1, 5), [
    "Project",
    "ASICS",
    "CLT-056",
    "Cloud migration",
  ]);
  assert.equal(worksheet.getRow(3).getCell(1).value, "Task");
  assert.equal(worksheet.getRow(4).getCell(1).value, "Update");
  assert.equal(worksheet.getRow(5).getCell(1).value, "Risk");
  assert.equal(worksheet.views[0].ySplit, 1);
  assert.ok(worksheet.autoFilter);
});

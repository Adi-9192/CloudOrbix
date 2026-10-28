import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildRfpWorkbook } from "./rfp-export.js";

test("exports an RFP workbook with explicit month labels and scope sections", async () => {
  const buffer = await buildRfpWorkbook({
    project: {
      id: 12,
      project_name: "Cloud migration",
      year: 2026,
      currency_code: "EUR",
      project_type: "Std",
      project_status: "Project Initiated",
      request_from_by: "Alex",
      requestor_email: "alex@example.com",
      requested_date: "2026-03-02",
      region: "EMEA",
      cloud: "azure",
      duration_months: 2,
      duration_days: 0,
      working_days_per_month: 19.67,
      allowance_percent: 10,
      project_overview: "Modernize cloud platform",
      in_scope: "Landing zone",
      out_of_scope: "Application refactoring",
      assumption: "Client provides access",
    },
    resources: [{
      id: 1,
      resource_name: "Engineer",
      grade: "G5",
      resource_type: "Standard",
      resource_plan_type: "Monthly",
      daily_rate: 100,
    }],
    monthlyPeriods: [
      { key: "month-1", month: "2026-03" },
      { key: "month-2", month: "2026-04" },
    ],
    allocations: new Map([[1, { "month-1": 1, "month-2": 0.5 }]]),
    exchangeRate: 0.01,
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));
  const worksheet = workbook.getWorksheet("RFP Estimate");
  assert.ok(worksheet);
  assert.equal(worksheet.getCell("E17").value, "M1\n2026-03");
  assert.equal(worksheet.getCell("F17").value, "M2\n2026-04");
  assert.equal(worksheet.getCell("A8").value, "Modernize cloud platform");
  assert.equal(worksheet.getCell("A10").value, "Landing zone");
  assert.equal(worksheet.getCell("A12").value, "Application refactoring");
  assert.equal(worksheet.getCell("A14").value, "Client provides access");
  assert.equal(worksheet.getRow(18).getCell(5).value, 1);
  assert.equal(worksheet.getRow(18).getCell(6).value, 0.5);
  assert.equal(worksheet.getCell("B28").value, 19.67);
  assert.match(worksheet.getCell("B27").numFmt, /€/);
  assert.equal(worksheet.views[0].ySplit, 17);
});

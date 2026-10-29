import ExcelJS from "exceljs";

const sectionFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF1F8" } };
const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173F35" } };
const currencyFormat = (currency) => {
  const symbol = new Intl.NumberFormat("en", { style: "currency", currency })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value || currency;
  return `"${symbol}"#,##0.00;[Red]("${symbol}"#,##0.00)`;
};

export async function buildRfpWorkbook({
  project,
  resources,
  monthlyPeriods,
  allocations,
  exchangeRate,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CloudOrbix";
  workbook.subject = "RFP estimation";
  workbook.title = `RFP Estimate - ${project.project_name}`;

  const hasDailyPlan = Number(project.duration_days || 0) > 0;
  const columns = [
    "Resource Plan",
    "Resource Name",
    "Grade",
    "Resource Type",
    ...monthlyPeriods.map((period, index) => `M${index + 1}\n${period.month}`),
    ...(hasDailyPlan
      ? ["Man Days", "FTE Effort", "Total Daily Effort (Man Days)"]
      : []),
    "Total Cost (INR)",
  ];
  const worksheet = workbook.addWorksheet("RFP Estimate");
  const lastColumn = Math.max(columns.length, 6);

  worksheet.mergeCells(1, 1, 1, lastColumn);
  worksheet.getCell(1, 1).value = "RFP ESTIMATE";
  worksheet.getCell(1, 1).font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  worksheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173F35" } };
  worksheet.getRow(1).height = 32;

  worksheet.addRow(["Account Name", project.project_name, "RFP ID", project.id, "Year", project.year]);
  worksheet.addRow(["Currency", project.currency_code, "Project Type", project.project_type || "", "Project Status", project.project_status || ""]);
  worksheet.addRow(["Request From/By", project.request_from_by || "", "Requestor Email", project.requestor_email || "", "Requested Date", new Date(project.requested_date).toISOString().slice(0, 10)]);
  worksheet.addRow(["Region", project.region || "", "Cloud", project.cloud || "", "Duration", `${project.duration_months || 0} months${hasDailyPlan ? ` + ${project.duration_days} days` : ""}`]);
  for (const rowNumber of [2, 3, 4, 5]) {
    worksheet.getRow(rowNumber).height = 24;
    for (const column of [1, 3, 5]) {
      const label = worksheet.getCell(rowNumber, column);
      label.font = { bold: true, color: { argb: "FF475569" } };
      label.fill = sectionFill;
      worksheet.getCell(rowNumber, column + 1).alignment = { vertical: "middle", wrapText: true };
    }
  }

  const addSection = (rowNumber, title, text) => {
    worksheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
    worksheet.getCell(rowNumber, 1).value = title;
    worksheet.getCell(rowNumber, 1).font = { bold: true, color: { argb: "FF173F35" } };
    worksheet.getCell(rowNumber, 1).fill = sectionFill;
    worksheet.getCell(rowNumber, 1).alignment = { vertical: "middle" };
    worksheet.mergeCells(rowNumber + 1, 1, rowNumber + 1, lastColumn);
    worksheet.getCell(rowNumber + 1, 1).value = text || "";
    worksheet.getCell(rowNumber + 1, 1).alignment = { vertical: "top", wrapText: true };
    worksheet.getRow(rowNumber + 1).height = text ? Math.min(90, Math.max(30, 18 * String(text).split("\n").length)) : 24;
  };

  addSection(7, "Project Overview", project.project_overview);
  addSection(9, "In Scope", project.in_scope);
  addSection(11, "Out of Scope", project.out_of_scope);
  addSection(13, "Assumptions", project.assumption);

  worksheet.mergeCells(16, 1, 16, lastColumn);
  worksheet.getCell(16, 1).value = "RESOURCE PLAN";
  worksheet.getCell(16, 1).font = { bold: true, size: 12, color: { argb: "FF173F35" } };
  worksheet.getCell(16, 1).fill = sectionFill;
  worksheet.addRow(columns);
  const header = worksheet.getRow(17);
  header.height = 36;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = headerFill;
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  const totalFte = Object.fromEntries(monthlyPeriods.map((period) => [period.key, 0]));
  let baseCost = 0;
  let totalDailyEffort = 0;

  for (const resource of resources) {
    const rowAllocations = allocations.get(resource.id) || {};
    const isDaily = String(resource.resource_plan_type || "Monthly").toLowerCase() === "daily";
    const monthlyAllocations = monthlyPeriods.map((period) => {
      const allocation = isDaily ? 0 : Number(rowAllocations[period.key] || 0);
      if (!isDaily) totalFte[period.key] += allocation;
      return allocation;
    });
    const dailyEffort = isDaily
      ? Number(resource.daily_man_days || 0) * Number(rowAllocations.days || 0)
      : 0;
    const rowCost = monthlyAllocations.reduce(
      (sum, allocation) => sum + Number(resource.daily_rate || 0) * Number(project.working_days_per_month || 19.67) * allocation,
      0,
    ) + Number(resource.daily_rate || 0) * dailyEffort;
    baseCost += rowCost;
    totalDailyEffort += dailyEffort;
    worksheet.addRow([
      isDaily ? "Daily" : "Monthly",
      resource.resource_name,
      resource.grade,
      resource.resource_type,
      ...monthlyAllocations,
      ...(hasDailyPlan
        ? [
            isDaily ? Number(resource.daily_man_days || 0) : 0,
            isDaily ? Number(rowAllocations.days || 0) : 0,
            dailyEffort,
          ]
        : []),
      rowCost,
    ]);
  }

  const totalRow = worksheet.addRow([
    "TOTAL",
    "",
    "",
    "",
    ...monthlyPeriods.map((period) => totalFte[period.key]),
    ...(hasDailyPlan ? ["", "", totalDailyEffort] : []),
    baseCost,
  ]);
  totalRow.font = { bold: true };
  totalRow.fill = sectionFill;

  const allowanceCost = baseCost * Number(project.allowance_percent || 0) / 100;
  const grandTotal = baseCost + allowanceCost;
  const summaryStart = worksheet.rowCount + 2;
  worksheet.addRow([]);
  worksheet.addRow(["Cost Summary", "Amount"]);
  worksheet.getRow(summaryStart + 1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(summaryStart + 1).fill = headerFill;
  worksheet.addRows([
    ["Base Resource Cost (INR)", baseCost],
    [`Allowance (${project.allowance_percent || 0}%) (INR)`, allowanceCost],
    ["Grand Total (INR)", grandTotal],
    ["Exchange Rate (selected currency per INR)", exchangeRate ? 1 / exchangeRate : "Not configured"],
    [`Grand Total (${project.currency_code})`, exchangeRate ? grandTotal / exchangeRate : "Not configured"],
    ["Working Days per Month", 19.67],
  ]);
  worksheet.getRow(summaryStart + 4).font = { bold: true };
  worksheet.getRow(summaryStart + 6).font = { bold: true, size: 12 };

  worksheet.columns = columns.map((_, index) => ({
    width: index === 0 ? 16
      : index === 1 ? 24
        : index === 2 ? 14
          : index === 3 ? 18
            : index === columns.length - 1 ? 21
              : index >= 4 ? 15
                : 14,
  }));
  worksheet.getColumn(columns.length).numFmt = currencyFormat("INR");
  for (let rowNumber = 18; rowNumber <= totalRow.number; rowNumber += 1) {
    worksheet.getRow(rowNumber).alignment = { vertical: "middle", wrapText: true };
    worksheet.getCell(rowNumber, columns.length).numFmt = currencyFormat("INR");
  }
  for (const rowNumber of [summaryStart + 2, summaryStart + 3, summaryStart + 4]) {
    worksheet.getCell(rowNumber, 2).numFmt = currencyFormat("INR");
  }
  worksheet.getCell(summaryStart + 5, 2).numFmt = "0.000000";
  worksheet.getCell(summaryStart + 6, 2).numFmt = currencyFormat(project.currency_code || "INR");
  worksheet.getCell(summaryStart + 7, 2).numFmt = "0.00";
  worksheet.autoFilter = { from: { row: 17, column: 1 }, to: { row: 17, column: columns.length } };
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFD8E1EA" } },
      };
    });
  });

  return workbook.xlsx.writeBuffer();
}

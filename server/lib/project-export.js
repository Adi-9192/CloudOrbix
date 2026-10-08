import ExcelJS from "exceljs";

export const createProjectExport = async ({
  project,
  tasks,
  updates,
  risks,
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Project Updates");
  worksheet.columns = [
    { header: "Type", key: "type", width: 16 },
    { header: "Project name", key: "projectName", width: 32 },
    { header: "Project ID", key: "projectId", width: 18 },
    { header: "Task name/ description", key: "description", width: 60 },
    { header: "Date", key: "date", width: 22 },
  ];
  worksheet.addRow({
    type: "Project",
    projectName: project.client_name,
    projectId: project.client_id,
    description: project.project_brief || project.current_status || "",
    date: project.created_at || "",
  });
  for (const task of tasks) {
    worksheet.addRow({
      type: "Task",
      projectName: project.client_name,
      projectId: project.client_id,
      description: task.task_title,
      date: task.expected_end_date || "",
    });
  }
  for (const update of updates) {
    worksheet.addRow({
      type: "Update",
      projectName: project.client_name,
      projectId: project.client_id,
      description: update.update_text,
      date: update.created_at || "",
    });
  }
  for (const risk of risks) {
    worksheet.addRow({
      type: "Risk",
      projectName: project.client_name,
      projectId: project.client_id,
      description: risk.risk_title || risk.description || "",
      date: risk.date_raised || risk.created_at || "",
    });
  }
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };

  return workbook.xlsx.writeBuffer();
};

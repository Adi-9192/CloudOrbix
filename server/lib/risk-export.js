import ExcelJS from 'exceljs';

export const createRiskExport = async (risks) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Risk Register');
  worksheet.columns = [
    { header: 'Risk ID', key: 'riskId', width: 14 },
    { header: 'Project ID', key: 'projectId', width: 18 },
    { header: 'Project', key: 'projectName', width: 32 },
    { header: 'Customer Name', key: 'customerName', width: 28 },
    { header: 'Initiative', key: 'initiative', width: 28 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'PM', key: 'projectManager', width: 28 },
    { header: 'Date Raised', key: 'dateRaised', width: 16 },
    { header: 'Raised By', key: 'raisedBy', width: 28 },
    { header: 'Risk Description', key: 'description', width: 48 },
    { header: 'Probability', key: 'probability', width: 16 },
    { header: 'Impact', key: 'impact', width: 16 },
    { header: 'Impact Description', key: 'impactDescription', width: 42 },
    { header: 'Mitigation', key: 'mitigation', width: 42 },
    { header: 'Owner', key: 'owner', width: 28 },
    { header: 'Comments / Actions', key: 'commentsActions', width: 42 },
  ];

  for (const risk of risks) {
    worksheet.addRow({
      riskId: `R${risk.id}`,
      projectId: risk.project_id || '',
      projectName: risk.client_name || risk.customer_name || '',
      customerName: risk.customer_name || risk.client_name || '',
      initiative: risk.initiative_name || '',
      status: risk.status || '',
      category: risk.risk_category || '',
      projectManager: risk.project_manager || risk.account_manager || '',
      dateRaised: risk.date_raised || '',
      raisedBy: risk.raised_by || '',
      description: risk.risk_title || risk.description || '',
      probability: risk.probability || '',
      impact: risk.impact || '',
      impactDescription: risk.impact_description || '',
      mitigation: risk.mitigation || '',
      owner: risk.owner || '',
      commentsActions: risk.comments_actions || '',
    });
  }

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' },
  };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };

  return workbook.xlsx.writeBuffer();
};

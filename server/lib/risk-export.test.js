import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { createRiskExport } from './risk-export.js';

test('exports the risk register as a formatted Excel workbook', async () => {
  const buffer = await createRiskExport([
    {
      id: 12,
      project_id: 'CLT-006',
      client_name: 'ASICS',
      customer_name: 'ASICS',
      initiative_name: 'Cloud migration',
      status: 'On-track',
      risk_category: 'Schedule',
      project_manager: 'Manager M',
      date_raised: new Date('2026-10-08T00:00:00Z'),
      raised_by: 'Manager M',
      risk_title: 'Delayed access',
      probability: 'Medium',
      impact: 'High',
      impact_description: 'May delay delivery',
      mitigation: 'Escalate access request',
      owner: 'Manager M',
      comments_actions: 'Review next week',
    },
  ]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));
  const worksheet = workbook.getWorksheet('Risk Register');

  assert.deepEqual(worksheet.getRow(1).values.slice(1), [
    'Risk ID',
    'Project ID',
    'Project',
    'Customer Name',
    'Initiative',
    'Status',
    'Category',
    'PM',
    'Date Raised',
    'Raised By',
    'Risk Description',
    'Probability',
    'Impact',
    'Impact Description',
    'Mitigation',
    'Owner',
    'Comments / Actions',
  ]);
  assert.equal(worksheet.getRow(2).getCell(1).value, 'R12');
  assert.equal(worksheet.getRow(2).getCell(2).value, 'CLT-006');
  assert.equal(worksheet.getRow(2).getCell(6).value, 'On-track');
  assert.equal(worksheet.views[0].ySplit, 1);
  assert.ok(worksheet.autoFilter);
});

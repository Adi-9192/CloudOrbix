import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { previewProjectUpdateWorkbook } from './project-update-import.js';

async function workbookBuffer(build) {
  const workbook = new ExcelJS.Workbook();
  build(workbook.addWorksheet('Project Updates'));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('previews updates from the exported project workbook columns', async () => {
  const buffer = await workbookBuffer((sheet) => {
    sheet.addRow(['Type', 'Project name', 'Project ID', 'Task name/ description', 'Date']);
    sheet.addRow(['Update', 'Example', 'P-1', 'Production servers completed.', new Date('2025-10-10T12:30:00Z')]);
    sheet.addRow(['Task', 'Example', 'P-1', 'Ignore non-update rows', new Date('2025-10-11T00:00:00Z')]);
  });

  assert.deepEqual(await previewProjectUpdateWorkbook(buffer, 2026), [
    {
      updateText: 'Production servers completed.',
      createdAt: '2025-10-10T12:30:00.000Z',
    },
  ]);
});

test('uses the selected year for date prefixes in Excel descriptions', async () => {
  const buffer = await workbookBuffer((sheet) => {
    sheet.addRow(['Update Text', 'Date']);
    sheet.addRow(['07-09: Change request raised.', null]);
  });

  assert.deepEqual(await previewProjectUpdateWorkbook(buffer, 2025), [
    {
      updateText: 'Change request raised.',
      createdAt: '2025-09-07T00:00:00.000Z',
    },
  ]);
});

test('rejects workbooks without update text and date columns', async () => {
  const buffer = await workbookBuffer((sheet) => {
    sheet.addRow(['Task', 'Status']);
    sheet.addRow(['Example', 'Done']);
  });

  await assert.rejects(
    previewProjectUpdateWorkbook(buffer, 2025),
    /needs update text and date columns/,
  );
});

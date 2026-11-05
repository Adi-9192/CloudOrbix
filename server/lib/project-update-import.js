import ExcelJS from 'exceljs';
import {
  parseProjectUpdateDate,
  parseProjectUpdatesText,
} from '../../shared/project-updates.js';

function excelCellText(value) {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || '').join('');
    }
    if (typeof value.text === 'string') return value.text;
    if ('result' in value) return value.result;
  }
  return value;
}

function excelDateValue(value, numberFormat) {
  if (typeof value === 'number' && (value > 0 || /[dmy]/i.test(numberFormat || ''))) {
    return new Date(Date.UTC(1899, 11, 30) + value * 24 * 60 * 60 * 1000);
  }
  return excelCellText(value);
}

export async function previewProjectUpdateWorkbook(buffer, year) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new Error('Unable to read this workbook. Upload a valid .xlsx file.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The Excel workbook does not contain a worksheet.');

  let headerRow;
  let descriptionColumn;
  let dateColumn;
  let typeColumn;
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 10); rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const headers = row.values.slice(1).map((value) =>
      String(excelCellText(value) ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
    );
    const descriptionIndex = headers.findIndex((header) =>
      /^(description|tasknamedescription|updatetext|update|dailyupdate|activity|comments?|notes?)$/.test(header),
    );
    const dateIndex = headers.findIndex((header) =>
      /^(date|createdat|timestamp|updatedat|updatedon|updateddate)$/.test(header),
    );
    if (descriptionIndex !== -1 && dateIndex !== -1) {
      headerRow = rowNumber;
      descriptionColumn = descriptionIndex + 1;
      dateColumn = dateIndex + 1;
      typeColumn = headers.findIndex((header) => header === 'type') + 1;
      break;
    }
  }
  if (!headerRow || !descriptionColumn || !dateColumn) {
    throw new Error('The workbook needs update text and date columns (for example, Description and Date).');
  }

  const updates = [];
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const description = String(excelCellText(row.getCell(descriptionColumn).value) ?? '').trim();
    if (!description) continue;
    if (typeColumn) {
      const type = String(excelCellText(row.getCell(typeColumn).value) ?? '').trim();
      if (type && type.toLowerCase() !== 'update') continue;
    }

    const dateCell = row.getCell(dateColumn);
    const parsedDate = parseProjectUpdateDate(
      excelDateValue(dateCell.value, dateCell.numFmt),
      year,
    );
    if (parsedDate) {
      updates.push({ updateText: description, createdAt: parsedDate });
      continue;
    }
    try {
      updates.push(...parseProjectUpdatesText(description, year));
    } catch {
      throw new Error(`Could not read a valid update date on Excel row ${rowNumber}.`);
    }
  }
  if (!updates.length) throw new Error('No dated project updates were found in the workbook.');
  if (updates.length > 100) {
    throw new Error('Import up to 100 updates at a time. Split this workbook into smaller batches.');
  }
  return updates;
}

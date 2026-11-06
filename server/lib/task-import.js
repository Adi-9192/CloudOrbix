export function parseTaskWorksheetRecords(sheet) {
  if (!sheet) return [];

  const headerValues = sheet.getRow(1)?.values || [];
  const headers = Array.from(headerValues).slice(1).map((value) =>
    String(value ?? "").trim(),
  );
  const records = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (!row) continue;

    const record = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1).value;
      record[header] =
        cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? "");
    });
    if (Object.values(record).some(Boolean)) records.push(record);
  }

  return records;
}

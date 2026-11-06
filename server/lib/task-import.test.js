import test from "node:test";
import assert from "node:assert/strict";
import { parseTaskWorksheetRecords } from "./task-import.js";

function createSheet(rows) {
  return {
    rowCount: rows.length,
    getRow(rowNumber) {
      const values = rows[rowNumber - 1];
      if (!values) return undefined;
      return {
        values,
        getCell(columnNumber) {
          return { value: values[columnNumber] };
        },
      };
    },
  };
}

test("parses task rows when the worksheet contains blank header cells", () => {
  const headers = [];
  headers[1] = "Task Title";
  headers[3] = "Status";
  headers[4] = "Progress";
  const row = [];
  row[1] = "Configure server";
  row[3] = "Completed";
  row[4] = 100;

  assert.deepEqual(
    parseTaskWorksheetRecords(createSheet([headers, row])),
    [{ "Task Title": "Configure server", Status: "Completed", Progress: "100" }],
  );
});

test("skips missing worksheet rows instead of throwing", () => {
  const headers = [undefined, "Task Title", "Status", "Progress"];
  const firstTask = [undefined, "Configure server", "Completed", 100];
  const secondTask = [undefined, "Validate backup", "In progress", 50];

  assert.deepEqual(
    parseTaskWorksheetRecords(createSheet([headers, firstTask, undefined, secondTask])),
    [
      { "Task Title": "Configure server", Status: "Completed", Progress: "100" },
      { "Task Title": "Validate backup", Status: "In progress", Progress: "50" },
    ],
  );
});

test("returns no records for a missing worksheet", () => {
  assert.deepEqual(parseTaskWorksheetRecords(undefined), []);
});

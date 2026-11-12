import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTaskDate,
  parseTaskClipboard,
  reviewTaskImportRecords,
  taskDateYearFromProjectStart,
} from "./task-import.js";

test("parses copied Excel tab-separated task rows with quoted tabs and newlines", () => {
  const records = parseTaskClipboard(
    'Task Title\tStatus\tProgress\tRemarks\r\n"Configure\tweb server"\tIn progress\t50\t"Waiting for review\nfrom security"',
  );

  assert.deepEqual(records, [
    {
      "Task Title": "Configure\tweb server",
      Status: "In progress",
      Progress: "50",
      Remarks: "Waiting for review\nfrom security",
      __rowNumber: 2,
    },
  ]);
});

test("accepts displayed task headers and applies the existing task import rules", () => {
  const records = parseTaskClipboard(
    "Task Title\tAssigned To\tPlanned Start Date\tPlanned End Date\tActual Start Date\tActual End Date\tProgress\tStatus\tRemarks\nDeploy service\tA. Manager\t2026-03-01\t2026-03-05\t\t\t120\tCompleted\tReady",
  );
  const review = reviewTaskImportRecords(records, { yearForUndated: 2026 });

  assert.deepEqual(review.missingColumns, []);
  assert.deepEqual(review.rows, [
    {
      rowNumber: 2,
      taskTitle: "Deploy service",
      assignedTo: "A. Manager",
      plannedStartDate: "2026-03-01",
      plannedEndDate: "2026-03-05",
      actualStartDate: "",
      actualEndDate: "",
      progress: 100,
      status: "Completed",
      remarks: "Ready",
      error: "",
      skipped: false,
    },
  ]);
});

test("normalizes task dates using the project start year and preserves explicit years", () => {
  const year = taskDateYearFromProjectStart("2025-04-19T00:00:00.000Z");
  assert.equal(year, 2025);
  assert.deepEqual(normalizeTaskDate("19-Oct", year), {
    value: "2025-10-19",
    error: "",
  });
  assert.deepEqual(normalizeTaskDate("19-Oct-2027", year), {
    value: "2027-10-19",
    error: "",
  });
  assert.deepEqual(normalizeTaskDate("2025-02-31", year), {
    value: "2025-02-31",
    error: 'Date "2025-02-31" is invalid. Enter a valid date such as 2026-10-19 or 19-Oct.',
  });
  assert.deepEqual(normalizeTaskDate("19-Oct", undefined), {
    value: "19-Oct",
    error: 'Date "19-Oct" needs a year. Include a year or set the project\'s start date.',
  });
});

test("reports invalid dates in the task row review", () => {
  const records = parseTaskClipboard(
    "Task Title\tStatus\tProgress\tPlanned Start Date\tActual End Date\nDeploy service\tIn progress\t20\t31-Feb\t2025-13-01",
  );
  const review = reviewTaskImportRecords(records, { yearForUndated: 2025 });

  assert.match(review.rows[0].error, /Planned Start Date: Date "31-Feb" is invalid/);
  assert.match(review.rows[0].error, /Actual End Date: Date "2025-13-01" is invalid/);
  assert.equal(review.rows[0].plannedStartDate, "31-Feb");
});

test("reports required columns, invalid statuses, and blank task titles", () => {
  const records = parseTaskClipboard(
    "Task Title\tStatus\tProgress\nDeploy service\tUnknown\t20\n\tNot Started\t0",
  );
  const review = reviewTaskImportRecords(records);

  assert.deepEqual(review.missingColumns, []);
  assert.equal(
    review.rows[0].error,
    "Row 2 has an unsupported task status. Use Not Started, In progress, Completed, or Blocked.",
  );
  assert.equal(review.rows[1].skipped, true);

  const missingHeaders = reviewTaskImportRecords([{ "Task Title": "Deploy service" }]);
  assert.deepEqual(missingHeaders.missingColumns, ["Status", "Progress"]);
});

test("rejects incomplete pasted tables and unclosed quoted cells", () => {
  assert.throws(
    () => parseTaskClipboard("Task Title\tStatus\tProgress"),
    /header row and at least one task/,
  );
  assert.throws(
    () => parseTaskClipboard('Task Title\tStatus\tProgress\n"Deploy\tCompleted\t50'),
    /unclosed quoted cell/,
  );
});

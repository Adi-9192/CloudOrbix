import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProjectTaskStatus,
  PROJECT_TASK_STATUSES,
} from "./project-task-status.js";

test("normalizes the four supported project task statuses", () => {
  assert.deepEqual(PROJECT_TASK_STATUSES, [
    "Not Started",
    "In progress",
    "Completed",
    "Blocked",
  ]);
  assert.deepEqual(
    PROJECT_TASK_STATUSES.map(normalizeProjectTaskStatus),
    PROJECT_TASK_STATUSES,
  );
});

test("maps legacy project statuses used by existing tasks", () => {
  assert.equal(normalizeProjectTaskStatus("On Track"), "In progress");
  assert.equal(normalizeProjectTaskStatus("Off Track (External)"), "In progress");
});

test("rejects unsupported project task statuses", () => {
  assert.equal(normalizeProjectTaskStatus("Cancelled"), null);
  assert.equal(normalizeProjectTaskStatus(""), null);
});

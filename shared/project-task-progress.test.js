import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProjectTaskProgress } from "./project-task-progress.js";

test("converts fractional task progress to percentage points", () => {
  assert.equal(normalizeProjectTaskProgress(1), 100);
  assert.equal(normalizeProjectTaskProgress(0.5), 50);
});

test("preserves percentages and clamps progress to the supported range", () => {
  assert.equal(normalizeProjectTaskProgress(35), 35);
  assert.equal(normalizeProjectTaskProgress(-5), 0);
  assert.equal(normalizeProjectTaskProgress(150), 100);
  assert.equal(normalizeProjectTaskProgress("invalid"), 0);
});

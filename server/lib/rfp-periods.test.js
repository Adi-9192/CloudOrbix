import test from "node:test";
import assert from "node:assert/strict";

import { buildPeriods, periodAllocationKey } from "./rfp-periods.js";

test("builds month and trailing-day periods from the requested date", () => {
  assert.deepEqual(buildPeriods("2026-10-15", 3, 10), [
    { key: "month-1", month: "2026-10", days: null },
    { key: "month-2", month: "2026-11", days: null },
    { key: "month-3", month: "2026-12", days: null },
    { key: "days", month: "2027-01", days: 10 },
  ]);
});

test("maps stored calendar allocations back to relative period keys", () => {
  assert.equal(periodAllocationKey("2026-10", "2026-10-15", 3, 10), "month-1");
  assert.equal(periodAllocationKey("2026-12", "2026-10-15", 3, 10), "month-3");
  assert.equal(periodAllocationKey("2027-01", "2026-10-15", 3, 10), "days");
  assert.equal(periodAllocationKey("2027-02", "2026-10-15", 3, 10), null);
});

test("supports projects shorter than one month and month-end year rollover", () => {
  assert.deepEqual(buildPeriods("2026-12-31", 0, 10), [
    { key: "days", month: "2026-12", days: 10 },
  ]);
  assert.equal(buildPeriods("2026-12-31", 2, 0)[1].month, "2027-01");
});
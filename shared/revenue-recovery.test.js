import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRevenueRecovery,
  isValidRevenueRecoveryPercentage,
} from "./revenue-recovery.js";

test("calculates recovered and pending revenue from the recovery percentage", () => {
  const amounts = calculateRevenueRecovery(86229.78, 20);
  assert.ok(Math.abs(amounts.recoveredRevenue - 17245.956) < Number.EPSILON * 86229.78);
  assert.ok(Math.abs(amounts.pendingRevenue - 68983.824) < Number.EPSILON * 86229.78);
});

test("revenue recovery handles zero and full recovery", () => {
  assert.deepEqual(calculateRevenueRecovery(100, 0), {
    recoveredRevenue: 0,
    pendingRevenue: 100,
  });
  assert.deepEqual(calculateRevenueRecovery(100, 100), {
    recoveredRevenue: 100,
    pendingRevenue: 0,
  });
});

test("revenue recovery percentage is limited to zero through one hundred", () => {
  for (const value of [0, 20, 100, "25.5", "", null, undefined]) {
    assert.equal(isValidRevenueRecoveryPercentage(value), true);
  }
  for (const value of [-1, 100.01, "invalid", Number.POSITIVE_INFINITY]) {
    assert.equal(isValidRevenueRecoveryPercentage(value), false);
  }
});

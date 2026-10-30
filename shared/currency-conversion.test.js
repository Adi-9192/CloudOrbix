import assert from "node:assert/strict";
import test from "node:test";

import { convertCurrencyAmount } from "./currency-conversion.js";

test("converts using saved INR-per-currency-unit rates", () => {
  assert.equal(convertCurrencyAmount(100, 83.2, 1), 8320);
  assert.equal(convertCurrencyAmount(8320, 1, 83.2), 100);
});

test("converts a saved USD project amount to INR in the correct direction", () => {
  assert.equal(convertCurrencyAmount(86230.14, 83.2, 1), 7174347.648);
});

test("keeps the amount when converting between equal rates", () => {
  assert.equal(convertCurrencyAmount(125.5, 1, 1), 125.5);
});

test("rejects invalid exchange rates and amounts", () => {
  assert.throws(() => convertCurrencyAmount(100, 0, 1), RangeError);
  assert.throws(() => convertCurrencyAmount(Number.NaN, 1, 1), RangeError);
});

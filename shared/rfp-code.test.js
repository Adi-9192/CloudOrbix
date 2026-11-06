import test from "node:test";
import assert from "node:assert/strict";
import { buildRfpCodeBase } from "./rfp-code.js";

test("builds an RFP code from the first two letters of a one-word name", () => {
  assert.equal(buildRfpCodeBase("CloudOrbix", "2026-11-06"), "RFP_CL_061126");
});

test("builds an RFP code from the initials of a two-word name", () => {
  assert.equal(buildRfpCodeBase("Cloud Orbix", "2026-11-06"), "RFP_CO_061126");
});

test("normalizes punctuation and uses the first two words", () => {
  assert.equal(buildRfpCodeBase("Cloud-Orbix Services", "2026-11-06"), "RFP_CO_061126");
});

test("returns no preview when the name or requested date is missing", () => {
  assert.equal(buildRfpCodeBase("", "2026-11-06"), "");
  assert.equal(buildRfpCodeBase("CloudOrbix", ""), "");
});

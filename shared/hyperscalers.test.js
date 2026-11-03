import test from "node:test";
import assert from "node:assert/strict";
import { HYPERSCALERS, normalizeHyperscaler } from "./hyperscalers.js";

test("provides the supported hyperscalers in the requested uppercase form", () => {
  assert.deepEqual(HYPERSCALERS, ["AZURE", "AWS", "GCP", "ORACLE", "MULTICLOUD"]);
});

test("normalizes legacy hyperscaler labels", () => {
  assert.equal(normalizeHyperscaler("Azure"), "AZURE");
  assert.equal(normalizeHyperscaler("Oracle"), "ORACLE");
  assert.equal(normalizeHyperscaler("Multi Cloud"), "MULTICLOUD");
  assert.equal(normalizeHyperscaler("multi_cloud"), "MULTICLOUD");
  assert.equal(normalizeHyperscaler("Other"), "OTHER");
});

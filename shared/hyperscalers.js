export const HYPERSCALERS = ["AZURE", "AWS", "GCP", "ORACLE", "MULTICLOUD"];

const canonicalHyperscalers = new Map([
  ["AZURE", "AZURE"],
  ["AWS", "AWS"],
  ["GCP", "GCP"],
  ["ORACLE", "ORACLE"],
  ["MULTICLOUD", "MULTICLOUD"],
  ["MULTI CLOUD", "MULTICLOUD"],
]);

export function normalizeHyperscaler(value) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/[_-]+/g, " ");
  return canonicalHyperscalers.get(normalized) || normalized;
}

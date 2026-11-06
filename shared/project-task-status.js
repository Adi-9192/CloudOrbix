export const PROJECT_TASK_STATUSES = [
  "Not Started",
  "In progress",
  "Completed",
  "Blocked",
];

const taskStatusAliases = new Map([
  ["not started", "Not Started"],
  ["in progress", "In progress"],
  ["on track", "In progress"],
  ["at risk", "In progress"],
  ["off track external", "In progress"],
  ["off track internal", "In progress"],
  ["on hold", "In progress"],
  ["onboarded", "In progress"],
  ["completed", "Completed"],
  ["complete", "Completed"],
  ["finished", "Completed"],
  ["blocked", "Blocked"],
]);

export function normalizeProjectTaskStatus(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return taskStatusAliases.get(key) ?? null;
}

export const PROJECT_PHASES = [
  'Project Initiation',
  'Discovery & Planning',
  'Execution',
  'Deployment',
  'Testing & Validation',
  'Project Closure',
];

const normalizePhaseKey = (raw) =>
  String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const phaseByNormalizedName = new Map(
  PROJECT_PHASES.map((phase) => [normalizePhaseKey(phase), phase]),
);

const phaseAliases = new Map([
  ['initiation', 'Project Initiation'],
  ['discovery planning', 'Discovery & Planning'],
  ['discovery and planning', 'Discovery & Planning'],
  ['planning discovery', 'Discovery & Planning'],
  ['test validation', 'Testing & Validation'],
  ['testing and validation', 'Testing & Validation'],
  ['validation testing', 'Testing & Validation'],
  ['closure', 'Project Closure'],
]);

export const normalizeProjectPhase = (raw) => {
  const phase = normalizePhaseKey(raw);
  return phaseByNormalizedName.get(phase) || phaseAliases.get(phase) || '';
};

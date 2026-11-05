export const PROJECT_STATUSES = [
  'On Track',
  'At Risk',
  'Off Track (External)',
  'Off Track (Internal)',
  'Completed',
  'On Hold',
  'Cancelled',
];

export const PROJECT_STATUS_COLORS = {
  'On Track': { background: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  'At Risk': { background: '#FEF3C7', color: '#B45309', border: '#FCD34D' },
  'Off Track (External)': { background: '#FFEDD5', color: '#C2410C', border: '#FDBA74' },
  'Off Track (Internal)': { background: '#FCE7F3', color: '#BE185D', border: '#F9A8D4' },
  Completed: { background: '#D1FAE5', color: '#047857', border: '#6EE7B7' },
  'On Hold': { background: '#E2E8F0', color: '#475569', border: '#CBD5E1' },
  Cancelled: { background: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
};

const normalizeStatusKey = (raw) =>
  String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const statusByNormalizedName = new Map(
  PROJECT_STATUSES.map((status) => [normalizeStatusKey(status), status]),
);

const statusAliases = new Map([
  ['in progress', 'On Track'],
  ['ontrack', 'On Track'],
  ['onboarded', 'On Track'],
  ['open', 'On Track'],
  ['pending onboarding', 'On Track'],
  ['atrisk', 'At Risk'],
  ['at risk', 'At Risk'],
  ['delayed', 'At Risk'],
  ['delayedexternal', 'Off Track (External)'],
  ['delayed external', 'Off Track (External)'],
  ['offtrackexternal', 'Off Track (External)'],
  ['off track external', 'Off Track (External)'],
  ['delayedinternal', 'Off Track (Internal)'],
  ['delayed internal', 'Off Track (Internal)'],
  ['offtrackinternal', 'Off Track (Internal)'],
  ['off track internal', 'Off Track (Internal)'],
  ['finished', 'Completed'],
  ['closed', 'Completed'],
  ['hold', 'On Hold'],
  ['onhold', 'On Hold'],
  ['scope finalisation', 'At Risk'],
  ['awaiting approval', 'At Risk'],
  ['awaiting sign off', 'At Risk'],
  ['cancelled', 'Cancelled'],
  ['canceled', 'Cancelled'],
]);

export const normalizeProjectStatus = (raw) => {
  const status = normalizeStatusKey(raw);
  return statusByNormalizedName.get(status) || statusAliases.get(status) || 'On Track';
};

export const isProjectStatus = (value) => {
  const status = normalizeStatusKey(value);
  return statusByNormalizedName.has(status) || statusAliases.has(status);
};

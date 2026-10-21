export const PROJECT_STATUSES = [
  'On Track',
  // 'Delayed',
  'At Risk',
  'On Hold',
  'Scope Finalisation',
  'Awaiting Approval',
  'Completed',
  'Delayed(External)',
  'Delayed(Internal)',
  'Awaiting Sign off',
];

export const PROJECT_STATUS_COLORS = {
  'On Track': { background: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  // 'Delayed': { background: '#FEF3C7', color: '#B45309', border: '#FCD34D' },
  'At Risk': { background: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
  'On Hold': { background: '#E2E8F0', color: '#475569', border: '#CBD5E1' },
  'Scope Finalisation': { background: '#EDE9FE', color: '#6D28D9', border: '#C4B5FD' },
  'Awaiting Approval': { background: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
  Completed: { background: '#D1FAE5', color: '#047857', border: '#6EE7B7' },
  'Delayed(External)': { background: '#FFEDD5', color: '#C2410C', border: '#FDBA74' },
  'Delayed(Internal)': { background: '#FCE7F3', color: '#BE185D', border: '#F9A8D4' },
  'Awaiting Sign off': { background: '#CFFAFE', color: '#0E7490', border: '#67E8F9' },
  Cancelled: { background: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
};

const normalizeStatusKey = (raw) =>
  String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)/g, ')');

const statusByNormalizedName = new Map(
  PROJECT_STATUSES.map((status) => [
    normalizeStatusKey(status),
    status,
  ]),
);

const legacyStatusAliases = new Map([
  ['in progress', 'On Track'],
  ['onboarded', 'On Track'],
  ['hold', 'On Hold'],
  ['delayed external', 'Delayed(External)'],
  ['delayed internal', 'Delayed(Internal)'],
  ['finished', 'Completed'],
  ['closed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['canceled', 'Cancelled'],
]);

export const normalizeProjectStatus = (raw) => {
  const status = normalizeStatusKey(raw);
  const canonical = statusByNormalizedName.get(status);
  if (canonical) return canonical;
  if (!status) return 'On Track';
  if (status === 'open') return 'On Track';
  return legacyStatusAliases.get(status) || String(raw).trim();
};

export const isProjectStatus = (value) => {
  const status = normalizeStatusKey(value);
  return statusByNormalizedName.has(status) || legacyStatusAliases.has(status);
};

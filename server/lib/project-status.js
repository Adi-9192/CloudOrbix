export const PROJECT_STATUSES = [
  'On-track',
  'ON Hold',
  'Delayed',
  'Completed',
  'Cancelled',
];

export const normalizeProjectStatus = (raw) => {
  const status = String(raw ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (/^(on\s*)?track$|^in\s+progress$|^onboarded$/.test(status)) {
    return 'On-track';
  }
  if (/^on\s+hold$|^hold$/.test(status)) return 'ON Hold';
  if (/^delayed?(?:\b|[\s(])/.test(status)) return 'Delayed';
  if (/^(completed?|finished|closed)$/.test(status)) return 'Completed';
  if (/^(cancelled?|canceled)$/.test(status)) return 'Cancelled';
  return 'On-track';
};

export const isProjectStatus = (value) =>
  PROJECT_STATUSES.includes(String(value ?? '').trim());

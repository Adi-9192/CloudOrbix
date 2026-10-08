export function parsePendingPayload(value) {
  if (value === null || value === undefined) return value;

  const payload = typeof value === 'string' ? JSON.parse(value) : value;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Pending client payload must be a JSON object.');
  }

  return payload;
}

import test from 'node:test';
import assert from 'node:assert/strict';

import { parsePendingPayload } from './pending-payload.js';

test('parses a pending client payload stored as JSON text', () => {
  assert.deepEqual(
    parsePendingPayload('{"projectBillingCode":"BILL-1001"}'),
    { projectBillingCode: 'BILL-1001' },
  );
});

test('preserves parsed pending payloads and null values', () => {
  const payload = { projectBillingCode: 'BILL-1001' };

  assert.equal(parsePendingPayload(payload), payload);
  assert.equal(parsePendingPayload(null), null);
});

test('rejects invalid pending client payloads', () => {
  assert.throws(() => parsePendingPayload('{invalid'), SyntaxError);
  assert.throws(() => parsePendingPayload('[]'), TypeError);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProjectMetrics } from './project-metrics.js';

test('accepts empty resources and nullable Voumetric values', () => {
  assert.equal(validateProjectMetrics({ resources: [], voumetric: null }), null);
});

test('accepts resource names with FTE values to two decimal places', () => {
  assert.equal(
    validateProjectMetrics({
      resources: [
        { resourceName: 'Alex Doe', fte: '2.50' },
        { resourceName: 'Sam Lee', fte: '1.15' },
      ],
      voumetric: '12',
    }),
    null,
  );
});

test('rejects invalid FTE precision and out-of-range values', () => {
  assert.match(
    validateProjectMetrics({
      resources: [{ resourceName: 'Alex Doe', fte: '2.555' }],
    }),
    /Each resource FTE must be a non-negative number with at most two decimal places/,
  );
  assert.match(
    validateProjectMetrics({
      resources: [{ resourceName: 'Alex Doe', fte: '-0.50' }],
    }),
    /Each resource FTE must be a non-negative number/,
  );
  assert.match(
    validateProjectMetrics({
      resources: [{ resourceName: 'Alex Doe', fte: '10000000' }],
    }),
    /Each resource FTE must be a non-negative number/,
  );
});

test('requires each resource to have a name', () => {
  assert.match(
    validateProjectMetrics({
      resources: [{ resourceName: '  ', fte: 1 }],
    }),
    /Each resource must have a name/,
  );
  assert.match(
    validateProjectMetrics({
      resources: [{ resourceName: 'x'.repeat(256), fte: 1 }],
    }),
    /255 characters or fewer/,
  );
});

test('rejects fractional or out-of-range Voumetric values', () => {
  assert.match(
    validateProjectMetrics({ voumetric: '2.5' }),
    /Voumetric must be a non-negative whole number/,
  );
  assert.match(
    validateProjectMetrics({ voumetric: '-1' }),
    /Voumetric must be a non-negative whole number/,
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isProjectStatus,
  normalizeProjectStatus,
  PROJECT_STATUSES,
} from './project-status.js';

test('normalizes legacy statuses and preserves the current workflow statuses', () => {
  assert.equal(normalizeProjectStatus('Open'), 'On Track');
  assert.equal(normalizeProjectStatus('On-track'), 'On Track');
  assert.equal(normalizeProjectStatus('On Hold'), 'On Hold');
  assert.equal(normalizeProjectStatus('Closed'), 'Completed');
  assert.equal(normalizeProjectStatus('Delayed (External)'), 'Delayed(External)');
  assert.equal(normalizeProjectStatus('Delayed-Internal'), 'Delayed(Internal)');
  assert.deepEqual(PROJECT_STATUSES, [
    'On Track',
    'Delayed',
    'At Risk',
    'On Hold',
    'Scope Finalisation',
    'Awaiting Approval',
    'Completed',
    'Delayed(External)',
    'Delayed(Internal)',
    'Awaiting Sign off',
  ]);
  assert.equal(isProjectStatus('Delayed'), true);
  assert.equal(isProjectStatus('Open'), false);
  assert.equal(isProjectStatus('Delayed(External)'), true);
});

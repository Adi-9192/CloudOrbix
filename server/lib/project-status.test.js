import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isProjectStatus,
  normalizeProjectStatus,
  PROJECT_STATUSES,
} from './project-status.js';

test('normalizes legacy statuses to the canonical project status set', () => {
  assert.equal(normalizeProjectStatus('Open'), 'On Track');
  assert.equal(normalizeProjectStatus('On-track'), 'On Track');
  assert.equal(normalizeProjectStatus('On Hold'), 'On Hold');
  assert.equal(normalizeProjectStatus('Closed'), 'Completed');
  assert.equal(normalizeProjectStatus('Delayed (External)'), 'Off Track (External)');
  assert.equal(normalizeProjectStatus('Delayed-Internal'), 'Off Track (Internal)');
  assert.deepEqual(PROJECT_STATUSES, [
    'On Track',
    'At Risk',
    'Off Track (External)',
    'Off Track (Internal)',
    'Completed',
    'On Hold',
    'Cancelled',
  ]);
  assert.equal(isProjectStatus('Delayed'), true);
  assert.equal(isProjectStatus('Open'), true);
  assert.equal(isProjectStatus('Delayed(External)'), true);
});

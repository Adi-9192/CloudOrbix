import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isProjectStatus,
  normalizeProjectStatus,
  PROJECT_STATUSES,
} from './project-status.js';

test('normalizes legacy risk statuses to the shared project statuses', () => {
  assert.equal(normalizeProjectStatus('Open'), 'On-track');
  assert.equal(normalizeProjectStatus('On Hold'), 'ON Hold');
  assert.equal(normalizeProjectStatus('Closed'), 'Completed');
  assert.deepEqual(PROJECT_STATUSES, [
    'On-track',
    'ON Hold',
    'Delayed',
    'Completed',
    'Cancelled',
  ]);
  assert.equal(isProjectStatus('Delayed'), true);
  assert.equal(isProjectStatus('Open'), false);
});

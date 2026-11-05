import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isProjectStatus,
  normalizeProjectStatus,
  PROJECT_STATUSES,
} from './project-status.js';
import {
  normalizeProjectPhase,
  PROJECT_PHASES,
} from './project-phase.js';

test('project status options contain only the seven canonical values', () => {
  assert.deepEqual(PROJECT_STATUSES, [
    'On Track',
    'At Risk',
    'Off Track (External)',
    'Off Track (Internal)',
    'Completed',
    'On Hold',
    'Cancelled',
  ]);
});

test('project statuses normalize spelling and legacy aliases to canonical values', () => {
  const cases = [
    ['on-track', 'On Track'],
    ['at risk', 'At Risk'],
    ['Delayed (External)', 'Off Track (External)'],
    ['Off Track Internal', 'Off Track (Internal)'],
    ['awaiting approval', 'At Risk'],
    ['Completed', 'Completed'],
    ['hold', 'On Hold'],
    ['canceled', 'Cancelled'],
    ['CANCELLED', 'Cancelled'],
    ['unrecognized status', 'On Track'],
    ['', 'On Track'],
  ];

  for (const [input, expected] of cases) {
    assert.equal(normalizeProjectStatus(input), expected);
    assert.ok(PROJECT_STATUSES.includes(normalizeProjectStatus(input)));
  }
  assert.equal(isProjectStatus('Delayed(Internal)'), true);
  assert.equal(isProjectStatus('unrecognized status'), false);
});

test('phase normalization accepts variants and leaves unknown or missing values blank', () => {
  assert.deepEqual(PROJECT_PHASES, [
    'Project Initiation',
    'Discovery & Planning',
    'Execution',
    'Deployment',
    'Testing & Validation',
    'Project Closure',
  ]);
  assert.equal(normalizeProjectPhase('project-initiation'), 'Project Initiation');
  assert.equal(normalizeProjectPhase('Discovery and Planning'), 'Discovery & Planning');
  assert.equal(normalizeProjectPhase('testing validation'), 'Testing & Validation');
  assert.equal(normalizeProjectPhase('Closure'), 'Project Closure');
  assert.equal(normalizeProjectPhase('unknown phase'), '');
  assert.equal(normalizeProjectPhase(null), '');
});

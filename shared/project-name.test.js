import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProjectName } from './project-name.js';

test('normalizes project names for duplicate checks', () => {
  assert.equal(normalizeProjectName('  Cloud   Migration  '), 'cloud migration');
  assert.equal(normalizeProjectName('CLOUD MIGRATION'), 'cloud migration');
  assert.equal(normalizeProjectName(''), '');
});

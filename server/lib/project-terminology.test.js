import assert from 'node:assert/strict';
import test from 'node:test';
import { toProjectTerminology } from './project-terminology.js';

test('replaces standalone client wording while preserving IDs and keys', () => {
  assert.equal(
    toProjectTerminology('Client created; clients deleted: clientId and client_name'),
    'Project created; projects deleted: clientId and client_name',
  );
});

test('preserves lowercase and uppercase text casing', () => {
  assert.equal(toProjectTerminology('client CLIENT CLIENTS'), 'project PROJECT PROJECTS');
});

test('leaves non-string values unchanged', () => {
  assert.equal(toProjectTerminology(42), 42);
});

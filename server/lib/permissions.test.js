import test from 'node:test';
import assert from 'node:assert/strict';
import { canApprove, canDelete, hasAnyRole } from './permissions.js';

test('restricts approval and deletion to administrators', () => {
  assert.equal(canApprove(['Manager']), false);
  assert.equal(canApprove(['Admin']), true);
  assert.equal(canDelete(['Operations Team']), false);
  assert.equal(canDelete(['Admin']), true);
});

test('matches any permitted role', () => {
  assert.equal(hasAnyRole(['Viewer', 'Manager'], ['Admin', 'Manager']), true);
  assert.equal(hasAnyRole(['Viewer'], ['Admin', 'Manager']), false);
});

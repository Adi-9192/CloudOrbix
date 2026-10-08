import test from 'node:test';
import assert from 'node:assert/strict';
import { canApprove, canDelete, canManageProject, hasAnyRole } from './permissions.js';

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

test('allows project management for operational roles', () => {
  assert.equal(canManageProject(['Admin']), true);
  assert.equal(canManageProject(['Manager']), true);
  assert.equal(canManageProject(['Operations Team']), true);
  assert.equal(canManageProject(['Viewer']), false);
});

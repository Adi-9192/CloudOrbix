import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canApprove,
  canAccessProject,
  canDelete,
  canManageProject,
  hasAnyRole,
} from './permissions.js';

test('restricts approval and deletion to administrators', () => {
  assert.equal(canApprove(['Manager']), false);
  assert.equal(canApprove(['Admin']), true);
  assert.equal(canDelete(['Operations Team']), false);
  assert.equal(canDelete(['Admin']), true);
});

test('matches any permitted role', () => {
  assert.equal(hasAnyRole(['Viewer', 'Manager'], ['Admin', 'Manager']), true);
  assert.equal(hasAnyRole(['Viewer'], ['Admin', 'Manager']), false);
  assert.equal(hasAnyRole('Viewer, Manager', ['Admin', 'Manager']), true);
});

test('allows project management to administrators and operations team', () => {
  assert.equal(canManageProject(['Admin']), true);
  assert.equal(canManageProject(['Operations Team']), true);
  assert.equal(canManageProject(['Manager']), false);
  assert.equal(canManageProject(['Viewer']), false);
  assert.equal(canManageProject('Admin, Viewer'), true);
});

test('limits manager project access to the assigned project manager', () => {
  const project = {
    accountManager: 'Assigned Manager',
    projectManager: 'assigned.manager@example.com',
  };
  const assignedManager = {
    firstName: 'Assigned',
    lastName: 'Manager',
    email: 'assigned.manager@example.com',
    roles: ['Manager'],
  };
  const otherManager = {
    firstName: 'Other',
    lastName: 'Manager',
    email: 'other.manager@example.com',
    roles: ['Manager'],
  };

  assert.equal(canAccessProject(assignedManager, project), true);
  assert.equal(canAccessProject(otherManager, project), false);
  assert.equal(canAccessProject({ roles: ['Admin'] }, project), true);
  assert.equal(canAccessProject({ roles: ['Operations Team'] }, project), true);
});

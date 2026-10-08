import test from 'node:test';
import assert from 'node:assert/strict';
import { appState, createNotification, listNotificationsForUser } from '../db.js';

test('stores approval notifications for the submitting project manager', async () => {
  appState.notifications = [];

  const entry = await createNotification(
    'peter@cloudorbix.com',
    'approval',
    'Project update approved',
    'Your project update was approved by the admin team.',
    {
      projectId: 'PRJ-1001',
      decision: 'approve',
      requesterName: 'Peter Manager',
      requesterEmail: 'peter@cloudorbix.com',
    },
  );

  assert.equal(entry.userEmail, 'peter@cloudorbix.com');
  assert.equal(entry.type, 'approval');
  assert.equal(entry.metadata.requesterName, 'Peter Manager');
  assert.equal(entry.metadata.requesterEmail, 'peter@cloudorbix.com');
  assert.equal(appState.notifications.length, 1);
  assert.equal(appState.notifications[0].title, 'Project update approved');

  const notifications = await listNotificationsForUser('peter@cloudorbix.com');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].message.includes('approved'), true);
});

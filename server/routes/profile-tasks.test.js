import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTaskUpdateQuery } from './profile-tasks.js';

test('buildTaskUpdateQuery uses stable placeholder numbering for task toggle updates', () => {
  const { text, values } = buildTaskUpdateQuery({ done: true, taskId: 42, userId: 7 });

  assert.equal(text, 'UPDATE user_profile_tasks SET is_done = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3');
  assert.deepEqual(values, [true, 42, 7]);
});

test('buildTaskUpdateQuery supports updating multiple fields without placeholder drift', () => {
  const { text, values } = buildTaskUpdateQuery({ text: 'Follow up', dueDate: '2026-01-15', taskId: 8, userId: 1 });

  assert.equal(text, 'UPDATE user_profile_tasks SET task_text = $1, due_date = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4');
  assert.deepEqual(values, ['Follow up', '2026-01-15', 8, 1]);
});

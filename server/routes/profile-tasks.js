import express from 'express';
import { getPool } from '../db.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

export const normalizeTask = (row) => ({
  id: row.id,
  text: row.task_text,
  dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
  done: Boolean(row.is_done),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function buildTaskUpdateQuery(updates) {
  const assignments = [];
  const values = [];
  let nextParam = 1;

  if (Object.prototype.hasOwnProperty.call(updates, 'text')) {
    assignments.push(`task_text = $${nextParam++}`);
    values.push(updates.text);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
    assignments.push(`due_date = $${nextParam++}`);
    values.push(updates.dueDate);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'done')) {
    assignments.push(`is_done = $${nextParam++}`);
    values.push(updates.done);
  }

  assignments.push('updated_at = CURRENT_TIMESTAMP');
  return {
    text: `UPDATE user_profile_tasks SET ${assignments.join(', ')} WHERE id = $${nextParam++} AND user_id = $${nextParam}`,
    values: [...values, updates.taskId, updates.userId],
  };
}

router.get('/', protectRoute, async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ tasks: [] });

    const result = await pool.query(
      `
        SELECT id, task_text, due_date, is_done, created_at, updated_at
        FROM user_profile_tasks
        WHERE user_id = $1
        ORDER BY is_done ASC, due_date NULLS LAST, created_at DESC
      `,
      [req.user.id],
    );

    return res.json({ tasks: result.rows.map(normalizeTask) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', protectRoute, async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ message: 'Database is not configured.' });

    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Task text is required.' });

    const dueDate = req.body?.dueDate ? String(req.body.dueDate).slice(0, 10) : null;
    const result = await pool.query(
      `
        INSERT INTO user_profile_tasks (user_id, task_text, due_date, is_done)
        VALUES ($1, $2, $3, $4)
        RETURNING id, task_text, due_date, is_done, created_at, updated_at
      `,
      [req.user.id, text, dueDate, false],
    );

    return res.status(201).json({ task: normalizeTask(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', protectRoute, async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ message: 'Database is not configured.' });

    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) return res.status(400).json({ message: 'Invalid task id.' });

    const hasText = Object.prototype.hasOwnProperty.call(req.body || {}, 'text');
    const hasDueDate = Object.prototype.hasOwnProperty.call(req.body || {}, 'dueDate');
    const hasDone = Object.prototype.hasOwnProperty.call(req.body || {}, 'done');

    const text = hasText ? String(req.body.text).trim() : undefined;
    const dueDate = hasDueDate ? (req.body.dueDate ? String(req.body.dueDate).slice(0, 10) : null) : undefined;
    const done = hasDone ? Boolean(req.body.done) : undefined;

    if (text !== undefined && !text) return res.status(400).json({ message: 'Task text cannot be empty.' });

    const updateData = {};
    if (hasText) updateData.text = text;
    if (hasDueDate) updateData.dueDate = dueDate;
    if (hasDone) updateData.done = done;
    updateData.taskId = taskId;
    updateData.userId = req.user.id;

    if (!Object.keys(updateData).some((key) => ['text', 'dueDate', 'done'].includes(key))) {
      return res.status(400).json({ message: 'No task fields were provided to update.' });
    }

    const { text: queryText, values } = buildTaskUpdateQuery(updateData);

    const result = await pool.query(
      `${queryText} RETURNING id, task_text, due_date, is_done, created_at, updated_at`,
      values,
    );

    if (!result.rows[0]) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ task: normalizeTask(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', protectRoute, async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ message: 'Database is not configured.' });

    const taskId = Number(req.params.id);
    const result = await pool.query(
      'DELETE FROM user_profile_tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [taskId, req.user.id],
    );

    if (!result.rows[0]) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ deleted: true, id: result.rows[0].id });
  } catch (error) {
    return next(error);
  }
});

export default router;

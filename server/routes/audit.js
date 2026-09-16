import express from 'express';
import { appState, getPool } from '../db.js';
import { protectRoute, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ logs: appState.auditLogs });
    const result = await pool.query(`SELECT id,user_email,action,old_value,new_value,created_at FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 500`);
    return res.json({ logs: result.rows.map((row) => ({ id: row.id, user: row.user_email, action: row.action, entity: row.new_value, timestamp: row.created_at, prev: row.old_value, next: row.new_value, ip: '-', type: row.action.includes('Import') ? 'Import' : row.action.includes('Created') ? 'Create' : row.action.includes('Deleted') ? 'Delete' : 'Update' })) });
  } catch (error) { return next(error); }
});

export default router;

import express from 'express';
import ExcelJS from 'exceljs';
import { appState, getPool, normalizeAuditAction } from '../db.js';
import { protectRoute, requireRole } from '../middleware/auth.js';

const router = express.Router();
const AUDIT_LOG_QUERY = `SELECT id,user_email,action,old_value,new_value,created_at
  FROM audit_logs
  ORDER BY created_at DESC, id DESC`;

function getAuditType(action) {
  const normalizedAction = String(action || '').toLowerCase();
  if (normalizedAction.includes('import')) return 'Import';
  if (/\b(created|create)\b/.test(normalizedAction)) return 'Create';
  if (/\b(deleted|delete|removed|remove)\b/.test(normalizedAction)) return 'Delete';
  if (normalizedAction.includes('export')) return 'Export';
  if (normalizedAction.includes('report')) return 'Report';
  return 'Update';
}

function mapAuditLog(log) {
  const action = normalizeAuditAction(log.action);
  const user = log.user_email ?? log.userEmail ?? log.user ?? '';
  const previousValue = log.old_value ?? log.oldValue ?? log.prev ?? '—';
  const updatedValue = log.new_value ?? log.newValue ?? log.next ?? '—';
  return {
    id: log.id,
    user,
    action,
    entity: updatedValue,
    timestamp: log.created_at ?? log.createdAt ?? log.timestamp ?? '',
    prev: previousValue,
    next: updatedValue,
    ip: log.ip || '-',
    type: getAuditType(action),
  };
}

async function getAuditLogs() {
  const pool = getPool();
  if (!pool) return appState.auditLogs.map(mapAuditLog);
  const result = await pool.query(`${AUDIT_LOG_QUERY} OFFSET 0 ROWS FETCH NEXT 500 ROWS ONLY`);
  return result.rows.map(mapAuditLog);
}

router.get('/export.xlsx', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  try {
    const pool = getPool();
    const rows = pool
      ? (await pool.query(AUDIT_LOG_QUERY)).rows.map(mapAuditLog)
      : appState.auditLogs.map(mapAuditLog);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = [
      { header: 'Action', key: 'action', width: 36 },
      { header: 'Entity', key: 'entity', width: 28 },
      { header: 'User', key: 'user', width: 32 },
      { header: 'Timestamp', key: 'timestamp', width: 26 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'IP Address', key: 'ip', width: 18 },
      { header: 'Previous Value', key: 'prev', width: 32 },
      { header: 'Updated Value', key: 'next', width: 32 },
    ];
    worksheet.addRows(rows);
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    worksheet.autoFilter = {
      from: 'A1',
      to: `H${Math.max(1, rows.length + 1)}`,
    };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="cloudorbix-audit-logs.xlsx"',
    );
    return res.send(Buffer.from(buffer));
  } catch (error) { return next(error); }
});

router.get('/', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  try {
    return res.json({ logs: await getAuditLogs() });
  } catch (error) { return next(error); }
});

export default router;

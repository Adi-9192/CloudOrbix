import express from 'express';
import { protectRoute, requireRole } from '../middleware/auth.js';
import { appState, getPool } from '../db.js';

const router = express.Router();

const reportQueries = {
  'executive-kpi': 'SELECT client_id, client_name, current_status, revenue, completion FROM clients',
  'project-manager-performance': 'SELECT client_id, client_name, project_manager, completion, revenue, current_status FROM clients',
  'account-manager-performance': 'SELECT client_id, client_name, account_manager, revenue, current_status FROM clients',
  revenue: 'SELECT client_id, client_name, revenue, region, industry, hyperscaler FROM clients',
  'client-lifecycle': 'SELECT client_id, client_name, current_status, planned_onboard_date, actual_onboard_date, planned_offboard_date, actual_offboard_date FROM clients',
  'project-delivery': 'SELECT client_id, client_name, planned_end_date, actual_end_date, completion FROM clients',
  'regional-performance': 'SELECT client_id, client_name, region, revenue, completion FROM clients',
  'industry-analysis': 'SELECT client_id, client_name, industry, revenue FROM clients',
  'hyperscaler-adoption': 'SELECT client_id, client_name, hyperscaler, revenue FROM clients',
  'status-distribution': 'SELECT client_id, client_name, current_status, updated_at FROM clients',
  'risk-management': 'SELECT * FROM project_risks',
  'task-management': 'SELECT * FROM project_tasks',
  'service-adoption': 'SELECT s.name service, COUNT(cs.client_id)::int usage_count FROM services s LEFT JOIN client_services cs ON cs.service_id=s.id GROUP BY s.name ORDER BY usage_count DESC',
  'audit-activity': 'SELECT * FROM audit_logs ORDER BY created_at DESC',
  'excel-import': 'SELECT * FROM excel_import_logs ORDER BY created_at DESC',
  'project-updates': 'SELECT * FROM project_updates ORDER BY created_at DESC',
  'document-repository': 'SELECT * FROM project_documents ORDER BY created_at DESC',
};

const memoryReportRecords = (type) => {
  if (type === 'audit-activity') return appState.auditLogs;
  if (type === 'excel-import') return appState.excelImportLogs;
  if (type === 'service-adoption') return appState.services.map((service) => ({ service: service.name, usage_count: appState.clients.filter((client) => client.services?.includes(service.name)).length }));
  if (type === 'risk-management') return [];
  if (type === 'task-management' || type === 'project-updates' || type === 'document-repository') return [];
  return appState.clients;
};

router.get('/generate', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  try {
    const type = String(req.query.type || 'executive-kpi');
    const query = reportQueries[type];
    if (!query) return res.status(400).json({ message: 'Unsupported report type.' });
    const pool = getPool();
    if (!pool) return res.json({ type, records: memoryReportRecords(type) });
    const result = await pool.query(query);
    return res.json({ type, records: result.rows });
  } catch (error) { return next(error); }
});

router.get('/export', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  try {
    const type = String(req.query.type || 'executive-kpi');
    const query = reportQueries[type];
    if (!query) return res.status(400).json({ message: 'Unsupported report type.' });
    const rows = getPool() ? (await getPool().query(query)).rows : memoryReportRecords(type);
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? '')).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cloudorbix-${type}.csv"`);
    return res.send(csv);
  } catch (error) { return next(error); }
});

export default router;

import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { BlobServiceClient } from '@azure/storage-blob';
import { getPool } from '../db.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const canManage = (project, user) => {
  const projectManagers = String(project.project_manager || project.account_manager)
    .split(/\s*,\s*/)
    .filter(Boolean);
  const currentUserName = `${user.firstName} ${user.lastName}`.trim();
  return user.roles.includes('Admin') || projectManagers.includes(currentUserName) || projectManagers.includes(user.email);
};

async function projectFor(clientId) {
  const pool = getPool();
  const result = await pool.query(`SELECT c.*, COALESCE(AVG(t.progress), c.completion, 0) project_progress FROM clients c LEFT JOIN project_tasks t ON t.client_id = c.id WHERE c.client_id = $1 GROUP BY c.id`, [clientId]);
  return result.rows[0] || null;
}

async function syncCompletion(clientDbId) {
  const pool = getPool();
  const result = await pool.query('SELECT COALESCE(AVG(progress), 0) completion FROM project_tasks WHERE client_id = $1', [clientDbId]);
  const completion = Number(result.rows[0]?.completion || 0);
  await pool.query('UPDATE clients SET completion = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [completion, clientDbId]);
  return completion;
}

router.get('/repository', protectRoute, async (req, res, next) => {
  try {
    const result = await getPool().query(`SELECT c.client_id,c.client_name,c.project_manager,c.completion,c.current_status,COUNT(pd.id)::int document_count FROM clients c LEFT JOIN project_documents pd ON pd.client_id=c.id WHERE c.current_status='Completed' OR c.completion >= 100 GROUP BY c.id ORDER BY c.updated_at DESC`);
    return res.json({ projects: result.rows });
  } catch (error) { return next(error); }
});

router.get('/repository/:clientId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || (project.current_status !== 'Completed' && Number(project.completion || 0) < 100)) return res.status(404).json({ message: 'Completed project not found.' });
    const documents = await getPool().query('SELECT id,file_name,blob_name,blob_url,content_type,document_type,uploaded_by,created_at FROM project_documents WHERE client_id=$1 ORDER BY created_at DESC', [project.id]);
    return res.json({ project, documents: documents.rows });
  } catch (error) { return next(error); }
});

router.get('/:clientId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canManage(project, req.user)) return res.status(403).json({ message: 'Only the project manager or an administrator can access this project.' });
    const pool = getPool();
    const [tasks, documents, updates, risks] = await Promise.all([
      pool.query('SELECT * FROM project_tasks WHERE client_id = $1 ORDER BY expected_start_date NULLS LAST, id', [project.id]),
      pool.query('SELECT id,file_name,blob_name,blob_url,content_type,document_type,uploaded_by,created_at FROM project_documents WHERE client_id = $1 ORDER BY created_at DESC', [project.id]),
      pool.query('SELECT id,update_text,updated_by,created_at FROM project_updates WHERE client_id = $1 ORDER BY created_at DESC', [project.id]),
      pool.query('SELECT * FROM project_risks WHERE client_id = $1 ORDER BY created_at DESC', [project.id]),
    ]);
    return res.json({ project, tasks: tasks.rows, documents: documents.rows, updates: updates.rows, risks: risks.rows });
  } catch (error) { return next(error); }
});

router.post('/:clientId/updates', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    const updateText = String(req.body?.updateText || '').trim();
    if (!updateText) return res.status(400).json({ message: 'Update text is required.' });
    const result = await getPool().query('INSERT INTO project_updates(client_id,update_text,updated_by) VALUES($1,$2,$3) RETURNING *', [project.id, updateText, `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email]);
    return res.status(201).json({ update: result.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/:clientId/risks', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    const body = req.body || {};
    const riskTitle = String(body.riskTitle || body.description || '').trim();
    if (!riskTitle) return res.status(400).json({ message: 'Risk description is required.' });
    const result = await getPool().query('INSERT INTO project_risks(client_id,customer_name,initiative_name,risk_title,risk_category,date_raised,raised_by,description,probability,owner,level,impact,impact_description,status,mitigation,comments_actions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *', [project.id, project.client_name, body.initiativeName || null, riskTitle, body.riskCategory || null, body.dateRaised || null, `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email, body.description || riskTitle, body.probability || 'Medium', body.owner || null, body.level || 'Medium', body.impact || 'Medium', body.impactDescription || null, body.status || 'Open', body.mitigation || null, body.commentsActions || null]);
    return res.status(201).json({ risk: result.rows[0] });
  } catch (error) { return next(error); }
});

router.put('/:clientId/risks/:riskId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    const result = await getPool().query('UPDATE project_risks SET status=COALESCE($1,status),level=COALESCE($2,level),impact=COALESCE($3,impact),updated_at=CURRENT_TIMESTAMP WHERE id=$4 AND client_id=$5 RETURNING *', [req.body?.status, req.body?.level, req.body?.impact, req.params.riskId, project.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Risk not found.' });
    return res.json({ risk: result.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/:clientId/tasks', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    const body = req.body || {};
    if (!body.taskTitle) return res.status(400).json({ message: 'Task title is required.' });
    const result = await getPool().query(`INSERT INTO project_tasks(client_id,task_title,assigned_to,expected_start_date,expected_end_date,actual_start_date,actual_end_date,progress,status,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [project.id, body.taskTitle, body.assignedTo || project.project_manager || project.account_manager || null, body.expectedStartDate || null, body.expectedEndDate || null, body.actualStartDate || null, body.actualEndDate || null, Number(body.progress || 0), body.status || 'Not Started', body.remark || null]);
    const completion = await syncCompletion(project.id);
    return res.status(201).json({ task: result.rows[0], completion });
  } catch (error) { return next(error); }
});

router.post('/:clientId/tasks/import', protectRoute, upload.single('file'), async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    if (!req.file) return res.status(400).json({ message: 'No Excel file uploaded.' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    const headers = sheet.getRow(1).values.slice(1).map((item) => String(item || '').trim());
    const records = sheet.getRows(2, Math.max(sheet.rowCount - 1, 0)).map((row) => Object.fromEntries(headers.map((header, index) => {
      const cell = row.getCell(index + 1).value;
      return [header, cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? '')];
    }))).filter((record) => Object.values(record).some(Boolean));
    if (!records.length) return res.status(400).json({ message: 'The task workbook is empty.' });
    const requiredColumns = ['Task Title', 'Status', 'Progress'];
    const missing = requiredColumns.filter((column) => !Object.prototype.hasOwnProperty.call(records[0], column));
    if (missing.length) return res.status(400).json({ message: `Missing required Excel columns: ${missing.join(', ')}` });
    const inserted = [];
    for (const record of records) {
      const title = String(record['Task Title'] || '').trim();
      if (!title) continue;
      const result = await getPool().query('INSERT INTO project_tasks(client_id,task_title,assigned_to,expected_start_date,expected_end_date,actual_start_date,actual_end_date,progress,status,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [project.id, title, record['Assigned To'] || project.project_manager || project.account_manager || null, record['Expected Start'] || null, record['Expected End'] || null, record['Actual Start'] || null, record['Actual End'] || null, Math.max(0, Math.min(100, Number(record.Progress) || 0)), record.Status || 'Not Started', record.Remark || null]);
      inserted.push(result.rows[0]);
    }
    await syncCompletion(project.id);
    return res.status(201).json({ tasks: inserted, imported: inserted.length });
  } catch (error) { return next(error); }
});

router.put('/:clientId/tasks/:taskId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    const body = req.body || {};
    const result = await getPool().query(`UPDATE project_tasks SET task_title=COALESCE($1,task_title),assigned_to=COALESCE($2,assigned_to),expected_start_date=$3,expected_end_date=$4,actual_start_date=$5,actual_end_date=$6,progress=COALESCE($7,progress),status=COALESCE($8,status),remark=$9,updated_at=CURRENT_TIMESTAMP WHERE id=$10 AND client_id=$11 RETURNING *`, [body.taskTitle, body.assignedTo || project.project_manager || project.account_manager, body.expectedStartDate || null, body.expectedEndDate || null, body.actualStartDate || null, body.actualEndDate || null, body.progress === undefined ? null : Number(body.progress), body.status, body.remark || null, req.params.taskId, project.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Task not found.' });
    const completion = await syncCompletion(project.id);
    return res.json({ task: result.rows[0], completion });
  } catch (error) { return next(error); }
});

router.delete('/:clientId/tasks/:taskId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    const result = await getPool().query('DELETE FROM project_tasks WHERE id = $1 AND client_id = $2 RETURNING id', [req.params.taskId, project.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Task not found.' });
    const completion = await syncCompletion(project.id);
    return res.json({ deleted: true, completion });
  } catch (error) { return next(error); }
});

router.post('/:clientId/documents', protectRoute, upload.single('file'), async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canManage(project, req.user)) return res.status(403).json({ message: 'Project access denied.' });
    if (!req.file) return res.status(400).json({ message: 'No document uploaded.' });
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) return res.status(503).json({ message: 'Azure document storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING on the API server.' });
    const service = BlobServiceClient.fromConnectionString(connectionString);
    const container = service.getContainerClient(process.env.AZURE_STORAGE_CONTAINER || 'cloudorbix-project-documents');
    await container.createIfNotExists();
    const blobName = `${project.client_id}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blob = container.getBlockBlobClient(blobName);
    await blob.uploadData(req.file.buffer, { blobHTTPHeaders: { blobContentType: req.file.mimetype } });
    const result = await getPool().query('INSERT INTO project_documents(client_id,file_name,blob_name,blob_url,content_type,document_type,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [project.id, req.file.originalname, blobName, blob.url, req.file.mimetype, req.body.documentType || 'custom', req.user.email]);
    return res.status(201).json({ document: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;

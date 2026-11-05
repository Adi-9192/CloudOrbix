import express from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { BlobServiceClient } from '@azure/storage-blob';
import { createNotification, getPool } from '../db.js';
import { canAccessProject, isAssignedProjectManager } from '../lib/permissions.js';
import { protectRoute, requireRole } from '../middleware/auth.js';
import { createProjectExport } from '../lib/project-export.js';
import { createRiskExport } from '../lib/risk-export.js';
import { previewProjectUpdateWorkbook } from '../lib/project-update-import.js';
import { MANDATORY_DOCUMENTS } from '../../shared/project-documents.js';
import { parseProjectUpdateDate } from '../../shared/project-updates.js';
import {
  isProjectStatus,
  normalizeProjectStatus,
} from '../lib/project-status.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
async function projectFor(clientId) {
  const pool = getPool();
  const result = await pool.query(`
    SELECT c.*,
      COALESCE((SELECT AVG(t.progress) FROM project_tasks t WHERE t.client_id = c.id), c.completion, 0) project_progress,
      (SELECT STRING_AGG(u.email, ',')
       FROM project_temporary_access ta
       JOIN users u ON u.id = ta.manager_user_id
       WHERE ta.client_id = c.id AND ta.status = 'approved' AND u.is_active = 1) temporary_manager_emails
    FROM clients c
    WHERE c.client_id = $1 OR c.id = TRY_CONVERT(INT, $1)
    ORDER BY CASE WHEN c.client_id = $1 THEN 0 ELSE 1 END
  `, [clientId]);
  const project = result.rows[0];
  if (!project) return null;
  project.current_status = normalizeProjectStatus(project.current_status);
  delete project.project_type;
  delete project.projectType;

  const [resources, services] = await Promise.all([
    pool.query(
      'SELECT resource_name, fte, role_for_project, infrastructure_access FROM project_resources WHERE client_id = $1 ORDER BY id',
      [project.id],
    ),
    pool.query(
      'SELECT s.name FROM services s JOIN client_services cs ON cs.service_id = s.id WHERE cs.client_id = $1 ORDER BY s.name',
      [project.id],
    ),
  ]);
  return {
    ...project,
    services: services.rows.map((service) => service.name),
    resources: resources.rows.map((resource) => ({
      resourceName: resource.resource_name,
      fte: resource.fte === null ? null : Number(resource.fte),
      roleForProject: resource.role_for_project || '',
      infrastructureAccess: Boolean(resource.infrastructure_access),
    })),
  };
}

async function syncCompletion(clientDbId) {
  const pool = getPool();
  const result = await pool.query('SELECT COALESCE(AVG(progress), 0) completion FROM project_tasks WHERE client_id = $1', [clientDbId]);
  const completion = Number(result.rows[0]?.completion || 0);
  await pool.query('UPDATE clients SET completion = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [completion, clientDbId]);
  return completion;
}

router.get('/risks/export', protectRoute, async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) {
      const buffer = await createRiskExport([]);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="risk-register.xlsx"');
      return res.send(Buffer.from(buffer));
    }
    const result = await pool.query(`
      SELECT pr.*, c.client_id AS project_id, c.client_name, c.project_manager, c.account_manager
      FROM project_risks pr
      LEFT JOIN clients c ON c.id = pr.client_id
      ORDER BY pr.created_at DESC
    `);
    const risks = result.rows.map((risk) => ({
      ...risk,
      status: normalizeProjectStatus(risk.status),
      client_name: risk.client_name || risk.customer_name || '-',
      project_manager: risk.project_manager || risk.account_manager || '-',
    }));
    const buffer = await createRiskExport(risks);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="risk-register.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (error) { return next(error); }
});

router.get('/risks', protectRoute, async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ risks: [] });
    const result = await pool.query(`
      SELECT pr.*, c.client_id AS project_id, c.client_name, c.project_manager, c.account_manager
      FROM project_risks pr
      LEFT JOIN clients c ON c.id = pr.client_id
      ORDER BY pr.created_at DESC
    `);
    return res.json({
      risks: result.rows.map((risk) => ({
        ...risk,
        status: normalizeProjectStatus(risk.status),
        projectId: risk.project_id,
        client_name: risk.client_name || risk.customer_name || '-',
        project_manager: risk.project_manager || risk.account_manager || '-',
      })),
    });
  } catch (error) { return next(error); }
});

router.get('/repository', protectRoute, async (req, res, next) => {
  try {
    const result = await getPool().query(`
      SELECT c.client_id,c.client_name,c.project_manager,c.account_manager,c.region,
        c.[year],c.hyperscaler,c.completion,c.current_status,c.updated_at,
        CAST((SELECT COUNT(*) FROM project_documents pd WHERE pd.client_id=c.id) AS int) document_count
      FROM clients c
      WHERE COALESCE(c.approval_status,'approved')='approved'
      ORDER BY c.updated_at DESC,c.id DESC
    `);
    return res.json({
      projects: result.rows.map((project) => {
        const completion = Number(project.completion || 0);
        return {
          ...project,
          completion: completion > 0 && completion <= 1
            ? Math.round(completion * 100)
            : completion,
          current_status: normalizeProjectStatus(project.current_status),
        };
      }),
    });
  } catch (error) { return next(error); }
});

router.get('/repository/:clientId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || project.approval_status === 'pending') return res.status(404).json({ message: 'Approved project not found.' });
    const documents = await getPool().query('SELECT id,file_name,blob_name,blob_url,content_type,document_type,uploaded_by,created_at FROM project_documents WHERE client_id=$1 ORDER BY created_at DESC', [project.id]);
    return res.json({ project, documents: documents.rows });
  } catch (error) { return next(error); }
});

const mapTemporaryAccess = (row) => ({
  id: Number(row.id),
  clientId: row.client_id,
  clientName: row.client_name,
  managerId: Number(row.manager_user_id),
  managerName: row.manager_name,
  managerEmail: row.manager_email,
  requesterName: row.requester_name,
  requesterEmail: row.requester_email,
  reason: row.reason,
  status: row.status,
  createdAt: row.created_at,
});

async function notifyTemporaryAccessAdmins(project, request, requester) {
  const pool = getPool();
  const administrators = await pool.query(`
    SELECT DISTINCT u.email
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.name = 'Admin' AND u.is_active = 1
  `);
  const requesterName = `${requester.firstName || ''} ${requester.lastName || ''}`.trim() || requester.email;
  await Promise.all(administrators.rows.map((admin) => createNotification(
    admin.email,
    'approval',
    'Temporary project access approval requested',
    `${requesterName} requested temporary access for ${request.manager_name} to ${project.client_name}: ${request.reason}`,
    {
      action: 'temporary_project_access',
      requestId: String(request.id),
      projectId: project.client_id,
    },
  )));
}

router.get('/temporary-access/approvals', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await getPool().query(`
      SELECT ta.id, c.client_id, c.client_name,
        manager.id AS manager_user_id,
        CONCAT(manager.first_name, ' ', manager.last_name) AS manager_name,
        manager.email AS manager_email,
        CONCAT(requester.first_name, ' ', requester.last_name) AS requester_name,
        requester.email AS requester_email,
        ta.reason, ta.status, ta.created_at
      FROM project_temporary_access ta
      JOIN clients c ON c.id = ta.client_id
      JOIN users manager ON manager.id = ta.manager_user_id
      JOIN users requester ON requester.id = ta.requester_user_id
      WHERE ta.status = 'pending'
      ORDER BY ta.created_at DESC
    `);
    return res.json({ requests: result.rows.map(mapTemporaryAccess) });
  } catch (error) {
    return next(error);
  }
});

router.post('/temporary-access/approvals/:requestId/decision', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Select approve or reject.' });
    }
    const pool = getPool();
    const requestId = Number(req.params.requestId);
    if (!Number.isInteger(requestId) || requestId < 1) {
      return res.status(400).json({ message: 'Temporary access request is invalid.' });
    }
    const requestResult = await pool.query(`
      SELECT ta.id, ta.client_id, ta.manager_user_id, ta.requester_user_id,
        ta.reason, c.client_name, c.client_id AS project_key,
        manager.email AS manager_email, requester.email AS requester_email
      FROM project_temporary_access ta
      JOIN clients c ON c.id = ta.client_id
      JOIN users manager ON manager.id = ta.manager_user_id
      JOIN users requester ON requester.id = ta.requester_user_id
      WHERE ta.id = $1 AND ta.status = 'pending'
    `, [requestId]);
    const request = requestResult.rows[0];
    if (!request) return res.status(404).json({ message: 'Pending temporary access request was not found.' });
    const updated = await pool.query(`
      UPDATE project_temporary_access
      SET status = $1, decided_at = SYSUTCDATETIME(), decided_by = $2
      OUTPUT INSERTED.id AS id
      WHERE id = $3 AND status = 'pending'
    `, [decision === 'approve' ? 'approved' : 'rejected', req.user.id, requestId]);
    if (!updated.rowCount) {
      return res.status(409).json({ message: 'This temporary access request has already been decided.' });
    }
    const decisionText = decision === 'approve' ? 'approved' : 'declined';
    const adminName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    await Promise.all([request.requester_email, request.manager_email]
      .filter((email, index, emails) => email && emails.indexOf(email) === index)
      .map((email) => createNotification(
        email,
        'approval',
        `Temporary project access ${decisionText}`,
        `Temporary access for ${request.manager_email} to ${request.client_name} was ${decisionText} by ${adminName}.`,
        { action: `temporary_access_${decision}`, projectId: request.project_key, requestId: String(requestId) },
      )));
    return res.json({ decided: true, decision });
  } catch (error) {
    return next(error);
  }
});

router.get('/:clientId/temporary-access', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    const result = await getPool().query(`
      SELECT ta.id, c.client_id, c.client_name,
        manager.id AS manager_user_id,
        CONCAT(manager.first_name, ' ', manager.last_name) AS manager_name,
        manager.email AS manager_email,
        CONCAT(requester.first_name, ' ', requester.last_name) AS requester_name,
        requester.email AS requester_email,
        ta.reason, ta.status, ta.created_at
      FROM project_temporary_access ta
      JOIN clients c ON c.id = ta.client_id
      JOIN users manager ON manager.id = ta.manager_user_id
      JOIN users requester ON requester.id = ta.requester_user_id
      WHERE ta.client_id = $1 AND ta.status IN ('pending', 'approved')
      ORDER BY ta.created_at DESC
    `, [project.id]);
    return res.json({ access: result.rows.map(mapTemporaryAccess) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:clientId/temporary-access', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || project.approval_status === 'pending') {
      return res.status(404).json({ message: 'Approved project not found.' });
    }
    const isAdmin = req.user?.roles?.includes('Admin');
    if (!isAdmin && (
      !req.user?.roles?.includes('Manager') ||
      !isAssignedProjectManager(req.user, project)
    )) {
      return res.status(403).json({ message: 'Only the assigned project manager or an administrator can assign temporary project access.' });
    }
    const managerId = Number(req.body?.managerId);
    const reason = String(req.body?.reason || '').trim();
    if (!Number.isInteger(managerId) || managerId < 1) {
      return res.status(400).json({ message: 'Select a project manager.' });
    }
    if (!reason || reason.length > 1000) {
      return res.status(400).json({ message: 'Enter a reason of 1 to 1000 characters.' });
    }
    const pool = getPool();
    const managerResult = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.id = $1 AND u.is_active = 1 AND r.name = 'Manager'
    `, [managerId]);
    const manager = managerResult.rows[0];
    if (!manager) return res.status(400).json({ message: 'Select an active user with the Manager role.' });
    if (
      `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim().toLowerCase() ===
        `${manager.first_name || ''} ${manager.last_name || ''}`.trim().toLowerCase() ||
      String(req.user.email).toLowerCase() === String(manager.email).toLowerCase()
    ) {
      return res.status(400).json({ message: 'You cannot assign temporary access to yourself.' });
    }
    const existing = await pool.query(`
      SELECT TOP 1 id FROM project_temporary_access
      WHERE client_id = $1 AND manager_user_id = $2
        AND status IN ('pending', 'approved')
    `, [project.id, managerId]);
    if (existing.rows.length) {
      return res.status(409).json({ message: 'This manager already has active access or a pending request for the project.' });
    }
    const status = isAdmin ? 'approved' : 'pending';
    const inserted = await pool.query(`
      INSERT INTO project_temporary_access
        (client_id, manager_user_id, requester_user_id, reason, status, decided_at, decided_by)
      OUTPUT INSERTED.id AS id
      VALUES ($1, $2, $3, $4, $5,
        CASE WHEN $5 = 'approved' THEN SYSUTCDATETIME() ELSE NULL END,
        CASE WHEN $5 = 'approved' THEN $3 ELSE NULL END)
    `, [project.id, managerId, req.user.id, reason, status]);
    const request = {
      id: Number(inserted.rows[0].id),
      manager_id: manager.id,
      manager_name: `${manager.first_name || ''} ${manager.last_name || ''}`.trim(),
      manager_email: manager.email,
    };
    if (isAdmin) {
      await createNotification(
        manager.email,
        'approval',
        'Temporary project access granted',
        `An administrator granted you temporary access to ${project.client_name}. Reason: ${reason}`,
        { action: 'temporary_access_approved', projectId: project.client_id, requestId: String(request.id) },
      );
    } else {
      await notifyTemporaryAccessAdmins(project, request, req.user);
    }
    return res.status(isAdmin ? 201 : 202).json({
      accessId: request.id,
      status,
      message: isAdmin ? 'Temporary access granted.' : 'Temporary access request sent for administrator approval.',
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:clientId/temporary-access/:accessId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const accessId = Number(req.params.accessId);
    if (!Number.isInteger(accessId) || accessId < 1) {
      return res.status(400).json({ message: 'Temporary access entry is invalid.' });
    }
    const pool = getPool();
    const entryResult = await pool.query(`
      SELECT ta.id, ta.manager_user_id, ta.status, u.email AS manager_email,
        c.client_name, c.client_id AS project_key
      FROM project_temporary_access ta
      JOIN users u ON u.id = ta.manager_user_id
      JOIN clients c ON c.id = ta.client_id
      WHERE ta.id = $1 AND ta.client_id = $2
        AND ta.status IN ('pending', 'approved')
    `, [accessId, project.id]);
    const entry = entryResult.rows[0];
    if (!entry) return res.status(404).json({ message: 'Active temporary access entry was not found.' });
    const isAdmin = req.user?.roles?.includes('Admin');
    const isOwner = isAssignedProjectManager(req.user, project);
    const isGrantHolder = String(req.user?.email || '').toLowerCase() === String(entry.manager_email).toLowerCase();
    if (!isAdmin && !isOwner && !isGrantHolder) {
      return res.status(403).json({ message: 'Only an administrator, assigned project manager, or the temporary manager can revoke this access.' });
    }
    const updated = await pool.query(`
      UPDATE project_temporary_access
      SET status = 'revoked', revoked_at = SYSUTCDATETIME(), revoked_by = $1
      OUTPUT INSERTED.id AS id
      WHERE id = $2 AND status IN ('pending', 'approved')
    `, [req.user.id, accessId]);
    if (!updated.rowCount) return res.status(409).json({ message: 'This temporary access entry has already changed.' });
    await createNotification(
      entry.manager_email,
      'approval',
      'Temporary project access revoked',
      `Temporary access to ${entry.client_name} has been revoked.`,
      { action: 'temporary_access_revoked', projectId: entry.project_key, requestId: String(accessId) },
    );
    return res.json({ revoked: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/:clientId/export', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });

    const pool = getPool();
    const [tasks, updates, risks] = await Promise.all([
      pool.query('SELECT task_title,expected_end_date FROM project_tasks WHERE client_id=$1 ORDER BY expected_start_date NULLS LAST,id', [project.id]),
      pool.query('SELECT update_text,created_at FROM project_updates WHERE client_id=$1 ORDER BY created_at', [project.id]),
      pool.query('SELECT risk_title,description,date_raised,created_at FROM project_risks WHERE client_id=$1 ORDER BY created_at', [project.id]),
    ]);

    const buffer = await createProjectExport({
      project,
      tasks: tasks.rows,
      updates: updates.rows,
      risks: risks.rows,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.client_id}-project-updates.xlsx"`,
    );
    return res.send(Buffer.from(buffer));
  } catch (error) { return next(error); }
});

router.get('/:clientId/risks/export', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });

    const result = await getPool().query(
      `SELECT pr.*, c.client_id AS project_id, c.client_name, c.project_manager, c.account_manager
       FROM project_risks pr
       LEFT JOIN clients c ON c.id = pr.client_id
       WHERE pr.client_id = $1
       ORDER BY pr.created_at DESC`,
      [project.id],
    );
    const risks = result.rows.map((risk) => ({
      ...risk,
      status: normalizeProjectStatus(risk.status),
      client_name: risk.client_name || risk.customer_name || '-',
      project_manager: risk.project_manager || risk.account_manager || '-',
    }));
    const buffer = await createRiskExport(risks);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.client_id}-risks.xlsx"`,
    );
    return res.send(Buffer.from(buffer));
  } catch (error) { return next(error); }
});

router.get('/:clientId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied. Only the assigned project manager, an approved temporary manager, or an administrator can access this project.' });
    const pool = getPool();
    const [tasks, documents, updates, risks] = await Promise.all([
      pool.query('SELECT * FROM project_tasks WHERE client_id = $1 ORDER BY expected_start_date NULLS LAST, id', [project.id]),
      pool.query('SELECT id,file_name,blob_name,blob_url,content_type,document_type,uploaded_by,created_at FROM project_documents WHERE client_id = $1 ORDER BY created_at DESC', [project.id]),
      pool.query('SELECT id,update_text,updated_by,created_at FROM project_updates WHERE client_id = $1 ORDER BY created_at DESC', [project.id]),
      pool.query('SELECT * FROM project_risks WHERE client_id = $1 ORDER BY created_at DESC', [project.id]),
    ]);
    return res.json({
      project,
      tasks: tasks.rows,
      documents: documents.rows,
      updates: updates.rows,
      risks: risks.rows.map((risk) => ({
        ...risk,
        status: normalizeProjectStatus(risk.status),
      })),
    });
  } catch (error) { return next(error); }
});

router.post('/:clientId/updates/import/preview', protectRoute, upload.single('file'), async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    if (!req.file) return res.status(400).json({ message: 'Select an Excel file to preview.' });
    const year = Number(req.body?.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      return res.status(400).json({ message: 'Enter a valid year for dates without a year.' });
    }
    let updates;
    try {
      updates = await previewProjectUpdateWorkbook(req.file.buffer, year);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Unable to preview the Excel workbook.',
      });
    }
    return res.json({ updates });
  } catch (error) { return next(error); }
});

router.post('/:clientId/updates/import', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    const updates = req.body?.updates;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Choose dated updates to import.' });
    }
    if (updates.length > 100) {
      return res.status(400).json({ message: 'Import up to 100 updates at a time.' });
    }

    const values = [];
    const tuples = updates.map((update, index) => {
      const updateText = String(update?.updateText || '').trim();
      const createdAt = parseProjectUpdateDate(update?.createdAt);
      if (!updateText || !createdAt) {
        return null;
      }
      const offset = index * 4;
      values.push(project.id, updateText, `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email, new Date(createdAt));
      return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4})`;
    });
    if (tuples.some((tuple) => tuple === null)) {
      return res.status(400).json({ message: 'Every update must include text and a valid date.' });
    }
    const result = await getPool().query(
      `INSERT INTO project_updates(client_id,update_text,updated_by,created_at) VALUES ${tuples.join(',')} RETURNING *`,
      values,
    );
    return res.status(201).json({ updates: result.rows, imported: result.rows.length });
  } catch (error) { return next(error); }
});

router.post('/:clientId/updates', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    const updateText = String(req.body?.updateText || '').trim();
    if (!updateText) return res.status(400).json({ message: 'Update text is required.' });
    const result = await getPool().query('INSERT INTO project_updates(client_id,update_text,updated_by) VALUES($1,$2,$3) RETURNING *', [project.id, updateText, `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email]);
    return res.status(201).json({ update: result.rows[0] });
  } catch (error) { return next(error); }
});

router.delete('/:clientId/updates/:updateId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    const result = await getPool().query(
      'DELETE FROM project_updates WHERE id=$1 AND client_id=$2 RETURNING id',
      [req.params.updateId, project.id],
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Project update not found.' });
    return res.json({ deleted: true });
  } catch (error) { return next(error); }
});

router.post('/:clientId/risks', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    const body = req.body || {};
    const riskTitle = String(body.riskTitle || body.description || '').trim();
    if (!riskTitle) return res.status(400).json({ message: 'Risk description is required.' });
    const status = body.status || 'On Track';
    if (!isProjectStatus(status)) return res.status(400).json({ message: 'Invalid risk status.' });
    const result = await getPool().query('INSERT INTO project_risks(client_id,customer_name,initiative_name,risk_title,risk_category,date_raised,raised_by,description,probability,owner,level,impact,impact_description,status,mitigation,comments_actions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *', [project.id, project.client_name, body.initiativeName || null, riskTitle, body.riskCategory || null, body.dateRaised || null, `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email, body.description || riskTitle, body.probability || 'Medium', body.owner || null, body.level || 'Medium', body.impact || 'Medium', body.impactDescription || null, status, body.mitigation || null, body.commentsActions || null]);
    return res.status(201).json({
      risk: {
        ...result.rows[0],
        projectId: project.client_id,
      },
    });
  } catch (error) { return next(error); }
});

router.put('/:clientId/risks/:riskId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    if (req.body?.status !== undefined && !isProjectStatus(req.body.status)) {
      return res.status(400).json({ message: 'Invalid risk status.' });
    }
    const result = await getPool().query('UPDATE project_risks SET status=COALESCE($1,status),level=COALESCE($2,level),impact=COALESCE($3,impact),updated_at=CURRENT_TIMESTAMP WHERE id=$4 AND client_id=$5 RETURNING *', [req.body?.status, req.body?.level, req.body?.impact, req.params.riskId, project.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Risk not found.' });
    return res.json({
      risk: {
        ...result.rows[0],
        status: normalizeProjectStatus(result.rows[0].status),
      },
    });
  } catch (error) { return next(error); }
});

router.post('/:clientId/tasks', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
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
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
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
      const result = await getPool().query(
        'INSERT INTO project_tasks(client_id,task_title,assigned_to,expected_start_date,expected_end_date,actual_start_date,actual_end_date,progress,status,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
        [
          project.id,
          title,
          record['Assigned To'] || project.project_manager || project.account_manager || null,
          record['Planned Start Date'] || record['Expected Start'] || null,
          record['Planned End Date'] || record['Expected End'] || null,
          record['Actual Start Date'] || record['Actual Start'] || null,
          record['Actual End Date'] || record['Actual End'] || null,
          Math.max(0, Math.min(100, Number(record.Progress) || 0)),
          record.Status || 'Not Started',
          record.Remarks || record.Remark || null,
        ],
      );
      inserted.push(result.rows[0]);
    }
    await syncCompletion(project.id);
    return res.status(201).json({ tasks: inserted, imported: inserted.length });
  } catch (error) { return next(error); }
});

router.put('/:clientId/tasks/:taskId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
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
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
    const result = await getPool().query('DELETE FROM project_tasks WHERE id = $1 AND client_id = $2 RETURNING id', [req.params.taskId, project.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Task not found.' });
    const completion = await syncCompletion(project.id);
    return res.json({ deleted: true, completion });
  } catch (error) { return next(error); }
});

router.post('/:clientId/documents/link', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });

    const documentType = String(req.body?.documentType || '').trim();
    const fileName = String(req.body?.fileName || '').trim();
    const link = String(req.body?.url || '').trim();
    if (!/^[a-z0-9-]{1,100}$/i.test(documentType)) return res.status(400).json({ message: 'A valid document type is required.' });
    if (!fileName || fileName.length > 255) return res.status(400).json({ message: 'A valid document name is required.' });
    if (!link || link.length > 2048) return res.status(400).json({ message: 'A valid document link is required.' });

    let parsedLink;
    try {
      parsedLink = new URL(link);
    } catch {
      return res.status(400).json({ message: 'Enter a valid document link.' });
    }
    if (!['http:', 'https:'].includes(parsedLink.protocol) || parsedLink.username || parsedLink.password) {
      return res.status(400).json({ message: 'Document links must use a valid HTTP or HTTPS address.' });
    }

    const result = await getPool().query(
      'INSERT INTO project_documents(client_id,file_name,blob_name,blob_url,content_type,document_type,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [project.id, fileName, `link-${randomUUID()}`, parsedLink.href, 'text/uri-list', documentType, req.user.email],
    );
    return res.status(201).json({ document: result.rows[0] });
  } catch (error) { return next(error); }
});

router.delete('/:clientId/documents/:documentId', protectRoute, async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });

    const pool = getPool();
    const existing = await pool.query(
      'SELECT id,blob_name,document_type FROM project_documents WHERE id=$1 AND client_id=$2',
      [req.params.documentId, project.id],
    );
    const document = existing.rows[0];
    if (!document) return res.status(404).json({ message: 'Document not found.' });

    if (
      normalizeProjectStatus(project.current_status) === 'Completed' &&
      MANDATORY_DOCUMENTS.some(({ id }) => id === document.document_type)
    ) {
      const remaining = await pool.query(
        'SELECT COUNT(*) AS count FROM project_documents WHERE client_id=$1 AND document_type=$2',
        [project.id, document.document_type],
      );
      if (Number(remaining.rows[0]?.count || 0) <= 1) {
        return res.status(409).json({
          message: 'A completed project must keep every mandatory document. Change the project status before removing its last copy.',
        });
      }
    }

    if (document.blob_name && !document.blob_name.startsWith('link-')) {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) return res.status(503).json({ message: 'Azure document storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING on the API server.' });
      const service = BlobServiceClient.fromConnectionString(connectionString);
      const container = service.getContainerClient(process.env.AZURE_STORAGE_CONTAINER || 'cloudorbix-project-documents');
      await container.getBlockBlobClient(document.blob_name).deleteIfExists();
    }

    await pool.query('DELETE FROM project_documents WHERE id=$1 AND client_id=$2', [document.id, project.id]);
    return res.json({ deleted: true });
  } catch (error) { return next(error); }
});

router.post('/:clientId/documents', protectRoute, upload.single('file'), async (req, res, next) => {
  try {
    const project = await projectFor(req.params.clientId);
    if (!project || !canAccessProject(req.user, project)) return res.status(403).json({ message: 'Project access denied.' });
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

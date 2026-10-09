import express from 'express';
import { appState, createAuditEntry, createNotification, getPool } from '../db.js';
import { parsePendingPayload } from '../lib/pending-payload.js';
import {
  canApprove,
  canAccessProject,
  canManageProject,
  isAssignedProjectManager,
} from '../lib/permissions.js';
import { validateProjectMetrics } from '../lib/project-metrics.js';
import { protectRoute, requireRole } from '../middleware/auth.js';

const router = express.Router();
let accessRequestTableReady;
let serviceCategoryColumnReady;
const publicClient = (client) => ({ ...client, id: client.id, name: client.clientName, status: client.currentStatus, lastUpdated: client.updatedAt });
async function ensureServiceCategoryColumn(pool) {
  if (!pool) return;
  if (!serviceCategoryColumnReady) {
    serviceCategoryColumnReady = pool
      .query(`
        IF COL_LENGTH('dbo.clients', 'service_category') IS NULL
        BEGIN
          ALTER TABLE dbo.clients ADD service_category NVARCHAR(255) NULL;
        END;
      `)
      .catch((error) => {
        serviceCategoryColumnReady = undefined;
        throw error;
      });
  }
  await serviceCategoryColumnReady;
}
async function ensureAccessRequestTable(pool) {
  if (!pool) return;
  if (!accessRequestTableReady) {
    accessRequestTableReady = pool.query(`
      IF OBJECT_ID(N'dbo.project_access_requests', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.project_access_requests (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          client_id NVARCHAR(255) NOT NULL,
          requester_email NVARCHAR(255) NOT NULL,
          requester_name NVARCHAR(255) NOT NULL,
          status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_project_access_requests_status DEFAULT N'pending',
          created_at DATETIME2 NOT NULL
            CONSTRAINT DF_project_access_requests_created_at DEFAULT SYSUTCDATETIME(),
          decided_at DATETIME2 NULL,
          decided_by NVARCHAR(255) NULL
        );
      END;

      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.project_access_requests')
          AND name = N'IX_project_access_requests_status_created_at'
      )
      BEGIN
        CREATE INDEX IX_project_access_requests_status_created_at
          ON dbo.project_access_requests (status, created_at DESC);
      END;

      IF OBJECT_ID(N'dbo.notifications', N'U') IS NOT NULL
      BEGIN
        EXEC sys.sp_executesql N'
          INSERT INTO dbo.project_access_requests (client_id,requester_email,requester_name)
          SELECT DISTINCT
            JSON_VALUE(n.metadata, N''$.clientId''),
            LOWER(JSON_VALUE(n.metadata, N''$.requesterEmail'')),
            COALESCE(JSON_VALUE(n.metadata, N''$.requesterName''), N''Project Manager'')
          FROM dbo.notifications n
          INNER JOIN dbo.clients c ON c.client_id = JSON_VALUE(n.metadata, N''$.clientId'')
          WHERE n.type = ''approval''
            AND ISJSON(n.metadata) = 1
            AND JSON_VALUE(n.metadata, N''$.action'') = ''access_request''
            AND NULLIF(JSON_VALUE(n.metadata, N''$.requesterEmail''), N'''') IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM dbo.project_access_requests ar
              WHERE ar.client_id = JSON_VALUE(n.metadata, N''$.clientId'')
                AND LOWER(ar.requester_email) = LOWER(JSON_VALUE(n.metadata, N''$.requesterEmail''))
            );
        ';
      END;
    `).catch((error) => {
      accessRequestTableReady = undefined;
      throw error;
    });
  }
  await accessRequestTableReady;
}
const getSubmittedBy = (user) => ({
  submittedBy: user?.email?.trim().toLowerCase(),
  submittedByEmail: user?.email?.trim().toLowerCase(),
  submittedByName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Project Manager',
});
async function getAdminEmails() {
  const pool = getPool();
  return pool
    ? (await pool.query(
        `SELECT DISTINCT u.email
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE r.name = @p1 AND u.is_active = 1`,
        ['Admin'],
      )).rows.map((row) => row.email)
    : appState.users
        .filter((user) => user.isActive !== false && user.roles?.includes('Admin'))
        .map((user) => user.email);
}
async function notifyAdminsOfRequest(clientId, clientName, requester) {
  const recipients = await getAdminEmails();
  const requesterName = requester.submittedByName || 'Project Manager';
  const requesterEmail = requester.submittedByEmail || requester.submittedBy;
  const message = `${requesterName} (${requesterEmail || 'email unavailable'}) requested approval for ${clientName} (${clientId}).`;
  await Promise.all(recipients.map((email) =>
    createNotification(
      email,
      'approval',
      'Project approval requested',
      message,
      { projectId: clientId, clientId, action: 'request', requesterName, requesterEmail },
    ),
  ));
}
async function notifyAdminsOfAccessRequest(clientId, clientName, requester, recipients) {
  if (!recipients.length) return false;
  await Promise.all(recipients.map((email) =>
    createNotification(
      email,
      'approval',
      'Project access requested',
      `${requester.requesterName} (${requester.requesterEmail}) requested access to ${clientName} (${clientId}).`,
      {
        projectId: clientId,
        clientId,
        requestId: requester.requestId,
        action: 'access_request',
        requesterName: requester.requesterName,
        requesterEmail: requester.requesterEmail,
      },
    ),
  ));
  return true;
}
async function notifyRequesterOfAccessDecision(request, decision, approver) {
  const decisionLabel = decision === 'approve' ? 'approved' : 'rejected';
  const approverName = `${approver?.firstName || ''} ${approver?.lastName || ''}`.trim() || approver?.email || 'an administrator';
  await createNotification(
    request.requesterEmail,
    'approval',
    `Project access ${decisionLabel}`,
    `Your request to access ${request.clientName} (${request.clientId}) was ${decisionLabel} by ${approverName}.`,
    {
      projectId: request.clientId,
      clientId: request.clientId,
      requestId: request.id,
      action: `access_${decisionLabel}`,
    },
  );
}
const mapAccessRequest = (row) => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name,
  requesterEmail: row.requester_email,
  requesterName: row.requester_name,
  status: row.status,
  createdAt: row.created_at,
});
async function saveAccessRequest(clientId, clientName, requester) {
  const pool = getPool();
  if (!pool) {
    const existing = appState.projectAccessRequests.find(
      (request) =>
        request.clientId === clientId &&
        request.requesterEmail === requester.submittedByEmail &&
        request.status === 'pending',
    );
    if (existing) return { ...existing, created: false };
    const accessRequest = {
      id: Date.now(),
      clientId,
      clientName,
      requesterEmail: requester.submittedByEmail,
      requesterName: requester.submittedByName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    appState.projectAccessRequests.unshift(accessRequest);
    return { ...accessRequest, created: true };
  }
  await ensureAccessRequestTable(pool);
  const existing = await pool.query(
    `SELECT TOP 1 ar.id,ar.client_id,c.client_name,ar.requester_email,ar.requester_name,ar.status,ar.created_at
     FROM dbo.project_access_requests ar
     JOIN clients c ON c.client_id=ar.client_id
     WHERE ar.client_id=@p1 AND ar.requester_email=@p2 AND ar.status='pending'
     ORDER BY ar.created_at DESC`,
    [clientId, requester.submittedByEmail],
  );
  if (existing.rows[0]) return { ...mapAccessRequest(existing.rows[0]), created: false };
  const result = await pool.query(
    `INSERT INTO dbo.project_access_requests(client_id,requester_email,requester_name)
     OUTPUT INSERTED.id AS id,INSERTED.client_id AS client_id,
       INSERTED.requester_email AS requester_email,
       INSERTED.requester_name AS requester_name,INSERTED.status AS status,
       INSERTED.created_at AS created_at
     VALUES(@p1,@p3,@p4)`,
    [clientId, clientName, requester.submittedByEmail, requester.submittedByName],
  );
  return { ...mapAccessRequest({ ...result.rows[0], client_name: clientName }), created: true };
}
async function notifySubmitterOfDecision(payload, clientId, decision, approver) {
  const requesterEmail = payload?.submittedByEmail || payload?.submittedBy || payload?.email;
  if (!requesterEmail) return;
  const requesterName = payload.submittedByName || 'Project Manager';
  const decisionLabel = decision === 'approve' ? 'approved' : 'rejected';
  const approverName = `${approver?.firstName || ''} ${approver?.lastName || ''}`.trim() || 'the approval team';
  await createNotification(
    requesterEmail,
    'approval',
    `Project update ${decisionLabel}`,
    `Your project change for ${clientId} was ${decisionLabel} by ${approverName}.`,
    { projectId: clientId, clientId, action: decision, requesterName, approverName, approverEmail: approver?.email },
  );
}
const canApproveForProject = (user, client = {}) => {
  const roles = user?.roles || [];
  if (roles.includes('Admin')) return true;
  if (!canManageProject(roles)) return false;

  const matchingValues = [
    client.accountManager,
    client.projectManager,
    client.pendingPayload?.submittedBy,
    client.pendingPayload?.submittedByEmail,
    client.pendingPayload?.submittedByName,
  ];

  return isAssignedProjectManager(user, {
    accountManager: matchingValues.join(','),
  });
};
const columns = `c.id,c.client_id,c.client_name,c.account_manager,c.region,c.industry,c.revenue,c.current_status,c.remarks,c.created_at,c.updated_at,c.planned_onboard_date,c.actual_onboard_date,c.planned_offboard_date,c.actual_offboard_date,c.contract_start_date,c.contract_end_date,c.year,c.completion,c.hyperscaler,c.project_type,c.service_category,c.project_brief,c.project_manager,c.isow,c.project_billing_code,c.voumetric,c.estimated_start_date,c.estimated_end_date,c.actual_start_date,c.actual_end_date,c.approval_status,c.pending_payload,c.pending_create,COALESCE((SELECT STRING_AGG(s2.name, ',') FROM client_services cs2 JOIN services s2 ON s2.id=cs2.service_id WHERE cs2.client_id=c.id),'') services`;
const mapRow = (row) => ({ id: row.id, clientId: row.client_id, clientName: row.client_name, accountManager: row.account_manager, region: row.region, industry: row.industry, revenue: Number(row.revenue || 0), currentStatus: row.current_status, remarks: row.remarks, createdAt: row.created_at?.toISOString?.().slice(0,10) || row.created_at, updatedAt: row.updated_at?.toISOString?.().slice(0,10) || row.updated_at, plannedOnboardDate: row.planned_onboard_date, actualOnboardDate: row.actual_onboard_date, plannedOffboardDate: row.planned_offboard_date, actualOffboardDate: row.actual_offboard_date, contractStartDate: row.contract_start_date, contractEndDate: row.contract_end_date, year: row.year, completion: Number(row.completion || 0), hyperscaler: row.hyperscaler, projectType: row.project_type, serviceCategory: row.service_category, projectBrief: row.project_brief, projectManager: row.project_manager, isow: row.isow, projectBillingCode: row.project_billing_code, resources: [], voumetric: row.voumetric, estimatedStartDate: row.estimated_start_date, estimatedEndDate: row.estimated_end_date, actualStartDate: row.actual_start_date, actualEndDate: row.actual_end_date, approvalStatus: row.approval_status || 'approved', pendingCreate: Boolean(row.pending_create), pendingPayload: parsePendingPayload(row.pending_payload), services: row.services || [] });
async function mapDbClients(pool, rows) {
  const clients = rows.map(mapRow);
  if (!clients.length) return clients;

  const placeholders = clients.map((_, index) => `$${index + 1}`).join(',');
  const resources = await pool.query(
    `SELECT client_id,resource_name,fte FROM project_resources WHERE client_id IN (${placeholders}) ORDER BY id`,
    clients.map((client) => client.id),
  );
  const resourcesByClient = new Map();
  for (const resource of resources.rows) {
    const allocations = resourcesByClient.get(resource.client_id) || [];
    allocations.push({
      resourceName: resource.resource_name,
      fte: resource.fte === null ? null : Number(resource.fte),
    });
    resourcesByClient.set(resource.client_id, allocations);
  }

  return clients.map((client) => ({
    ...client,
    resources: resourcesByClient.get(client.id) || [],
  }));
}
async function findDbClient(clientId) {
  const pool = getPool();
  await ensureServiceCategoryColumn(pool);
  const result = await pool.query(`SELECT ${columns} FROM clients c WHERE c.client_id=$1`, [clientId]);
  return (await mapDbClients(pool, result.rows))[0];
}
async function saveProjectResources(pool, clientDbId, resources = []) {
  await pool.query('DELETE FROM project_resources WHERE client_id=@p1', [clientDbId]);
  for (const resource of resources || []) {
    const resourceName = resource.resourceName.trim();
    await pool.query(
      'INSERT INTO project_resources(client_id,resource_name,fte) VALUES(@p1,@p2,@p3)',
      [clientDbId, resourceName, resource.fte === '' ? null : resource.fte],
    );
  }
}
async function saveServices(pool, clientDbId, services = []) {
  await pool.query('DELETE FROM client_services WHERE client_id=@p1', [clientDbId]);
  for (const name of services) {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) continue;
    const existing = await pool.query('SELECT id FROM services WHERE name=@p1', [trimmedName]);
    const serviceId = existing.rows[0]?.id || (await pool.query('INSERT INTO services(name) OUTPUT INSERTED.id AS id VALUES(@p1)', [trimmedName])).rows[0].id;
    await pool.query('INSERT INTO client_services(client_id,service_id) SELECT @p1, @p2 WHERE NOT EXISTS (SELECT 1 FROM client_services WHERE client_id=@p1 AND service_id=@p2)', [clientDbId, serviceId]);
  }
}
router.get('/', protectRoute, async (req, res, next) => { try { const pool = getPool(); if (!pool) return res.json({ clients: appState.clients.map(publicClient) }); await ensureServiceCategoryColumn(pool); const result = await pool.query(`SELECT ${columns} FROM clients c WHERE COALESCE(c.approval_status,'approved')='approved' ORDER BY c.id DESC`); const clients = await mapDbClients(pool, result.rows); return res.json({ clients: clients.map(publicClient) }); } catch (error) { return next(error); } });

router.get('/approvals', protectRoute, async (req, res, next) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!canApprove(userRoles)) {
      return res.status(403).json({ message: 'You are not authorized to view approval requests.' });
    }

    const pool = getPool();
    await ensureServiceCategoryColumn(pool);
    if (!pool) {
      const visible = appState.clients.filter((client) => client.approvalStatus === 'pending' && (
        req.user?.roles?.includes('Admin') ||
        canApproveForProject(req.user, client)
      ));
      return res.json({ clients: visible });
    }

    const result = await pool.query(`SELECT ${columns} FROM clients c WHERE c.approval_status='pending' ORDER BY c.updated_at DESC`);
    const clients = await mapDbClients(pool, result.rows);
    const visibleClients = req.user?.roles?.includes('Admin') ? clients : clients.filter((client) => canApproveForProject(req.user, client));
    return res.json({ clients: visibleClients });
  } catch (error) {
    return next(error);
  }
});

router.get('/access-requests', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.json({
        requests: appState.projectAccessRequests.filter((request) => request.status === 'pending'),
      });
    }
    await ensureAccessRequestTable(pool);
    const result = await pool.query(
      `SELECT ar.id,ar.client_id,c.client_name,ar.requester_email,ar.requester_name,
        ar.status,ar.created_at
       FROM dbo.project_access_requests ar
       JOIN clients c ON c.client_id=ar.client_id
       WHERE ar.status='pending'
       ORDER BY ar.created_at DESC`,
    );
    return res.json({ requests: result.rows.map(mapAccessRequest) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  const body = req.body || {}; if (!body.clientId || !String(body.clientName || '').trim() || !String(body.projectManager || '').trim()) return res.status(400).json({ message: 'Project ID, project name, and project manager are required.' });
  try {
    const metricError = validateProjectMetrics(body);
    if (metricError) return res.status(400).json({ message: metricError });
    const canManage = canManageProject(req.user?.roles || []);
    const pool = getPool();
    await ensureServiceCategoryColumn(pool);
    if (!pool) {
      if (appState.clients.some((client) => client.clientId === body.clientId)) return res.status(409).json({ message: 'Client ID already exists.' });
      const requester = canManage ? null : getSubmittedBy(req.user);
      const client = { id: Date.now(), clientId: body.clientId, clientName: body.clientName, accountManager: body.accountManager, projectManager: body.projectManager || body.accountManager, serviceCategory: body.serviceCategory || null, region: body.region || 'North America', industry: body.industry || 'Technology', revenue: Number(body.revenue || 0), currentStatus: body.currentStatus || 'Pending Onboarding', services: body.services || [], createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), plannedOnboardDate: body.plannedOnboardDate || null, actualOnboardDate: body.actualOnboardDate || null, plannedOffboardDate: body.plannedOffboardDate || null, actualOffboardDate: body.actualOffboardDate || null, contractStartDate: body.contractStartDate || null, contractEndDate: body.contractEndDate || null, projectBillingCode: body.projectBillingCode || null, resources: body.resources || [], voumetric: body.voumetric === null || body.voumetric === undefined ? null : Number(body.voumetric), remarks: body.remarks || '', approvalStatus: canManage ? 'approved' : 'pending', pendingPayload: requester ? { ...body, ...requester } : null, pendingCreate: !canManage };
      appState.clients.unshift(client);
      if (requester) await notifyAdminsOfRequest(client.clientId, client.clientName, requester);
      createAuditEntry(req.user.email, canManage ? 'Client Created' : 'Client Submitted for Approval', '—', client.clientName);
      return res.status(canManage ? 201 : 202).json({ pending: !canManage, client: publicClient(client) });
    }
    const pendingPayload = canManage ? null : JSON.stringify({ ...body, ...getSubmittedBy(req.user) });
    const result = await pool.query(`INSERT INTO clients(client_id,client_name,account_manager,region,industry,revenue,current_status,remarks,planned_onboard_date,actual_onboard_date,planned_offboard_date,actual_offboard_date,contract_start_date,contract_end_date,year,completion,hyperscaler,project_type,project_brief,project_manager,isow,estimated_start_date,estimated_end_date,actual_start_date,actual_end_date,approval_status,pending_payload,pending_create,project_billing_code,resources,fte,voumetric,service_category) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NULL,NULL,$30,$31) RETURNING id`,     [body.clientId,body.clientName,body.accountManager,body.region || 'North America',body.industry || 'Technology',Number(body.revenue || 0),body.currentStatus || 'Onboarded',body.remarks || '',body.plannedOnboardDate || null,body.actualOnboardDate || null,body.plannedOffboardDate || null,body.actualOffboardDate || null,body.contractStartDate || null,body.contractEndDate || null,body.year || new Date().getFullYear(),Number(body.completion || 0),body.hyperscaler || null,body.projectType || null,body.projectBrief || null,body.projectManager || body.accountManager || null,body.isow || null,body.estimatedStartDate || body.plannedOnboardDate || null,body.estimatedEndDate || body.plannedOffboardDate || null,body.actualStartDate || body.actualOnboardDate || null,body.actualEndDate || body.actualOffboardDate || null,canManage ? 'approved' : 'pending',pendingPayload,!canManage,body.projectBillingCode || null,body.voumetric === null || body.voumetric === undefined ? null : Number(body.voumetric),body.serviceCategory || null]);
    await saveProjectResources(pool, result.rows[0].id, body.resources || []);
    await saveServices(pool, result.rows[0].id, body.services);
    if (!canManage) await notifyAdminsOfRequest(body.clientId, body.clientName, getSubmittedBy(req.user));
    createAuditEntry(req.user.email, canManage ? 'Client Created' : 'Client Submitted for Approval', '—', body.clientName);
    return res.status(canManage ? 201 : 202).json({ pending: !canManage, client: publicClient(await findDbClient(body.clientId)) });
  } catch (error) { return error.code === '23505' ? res.status(409).json({ message: 'Client ID already exists.' }) : next(error); }
});

router.post('/:clientId/access-request', protectRoute, requireRole('Manager'), async (req, res, next) => {
  try {
    const pool = getPool();
    let project;
    if (!pool) {
      project = appState.clients.find((client) => client.clientId === req.params.clientId);
    } else {
      project = await findDbClient(req.params.clientId);
    }
    if (!project || project.approvalStatus === 'pending') {
      return res.status(404).json({ message: 'Approved project not found.' });
    }
    if (canAccessProject(req.user, project)) {
      return res.status(409).json({ message: 'You already have access to this project.' });
    }

    const adminEmails = await getAdminEmails();
    if (!adminEmails.length) {
      return res.status(503).json({ message: 'No active administrators are available to receive access requests.' });
    }
    const accessRequest = await saveAccessRequest(
      req.params.clientId,
      project.clientName,
      getSubmittedBy(req.user),
    );
    await notifyAdminsOfAccessRequest(
      req.params.clientId,
      project.clientName,
      { ...accessRequest, requestId: accessRequest.id },
      adminEmails,
    );
    createAuditEntry(req.user.email, 'Project Access Requested', '—', req.params.clientId);
    return res.status(202).json({ requested: true, requestId: accessRequest.id });
  } catch (error) {
    return next(error);
  }
});

router.post('/access-requests/:requestId/decision', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be approve or reject.' });
    }
    const pool = getPool();
    let accessRequest;
    if (!pool) {
      accessRequest = appState.projectAccessRequests.find(
        (request) => Number(request.id) === Number(req.params.requestId) && request.status === 'pending',
      );
      if (!accessRequest) {
        return res.status(404).json({ message: 'Pending project access request not found.' });
      }
      const project = appState.clients.find((client) => client.clientId === accessRequest.clientId);
      if (!project) return res.status(404).json({ message: 'Project not found.' });
      if (decision === 'approve') {
        const currentManagers = String(project.projectManager || '').split(/[,;/|]+/).map((manager) => manager.trim()).filter(Boolean);
        if (!currentManagers.some((manager) => manager.toLowerCase() === accessRequest.requesterEmail.toLowerCase())) {
          currentManagers.push(accessRequest.requesterEmail);
        }
        project.projectManager = currentManagers.join(', ');
      }
      accessRequest.status = decision === 'approve' ? 'approved' : 'rejected';
      accessRequest.decidedBy = req.user.email;
      accessRequest.decidedAt = new Date().toISOString();
      accessRequest.clientName = project.clientName;
    } else {
      await ensureAccessRequestTable(pool);
      const pending = await pool.query(
        `SELECT ar.id,ar.client_id,c.client_name,ar.requester_email,ar.requester_name,
          ar.status,ar.created_at,c.project_manager
         FROM dbo.project_access_requests ar
         JOIN clients c ON c.client_id=ar.client_id
         WHERE ar.id=@p1 AND ar.status='pending'`,
        [req.params.requestId],
      );
      const row = pending.rows[0];
      if (!row) return res.status(404).json({ message: 'Pending project access request not found.' });
      accessRequest = mapAccessRequest(row);
      if (decision === 'approve') {
        const currentManagers = String(row.project_manager || '').split(/[,;/|]+/).map((manager) => manager.trim()).filter(Boolean);
        if (!currentManagers.some((manager) => manager.toLowerCase() === accessRequest.requesterEmail.toLowerCase())) {
          currentManagers.push(accessRequest.requesterEmail);
        }
        await pool.query(
          'UPDATE clients SET project_manager=@p1,updated_at=GETDATE() WHERE client_id=@p2',
          [currentManagers.join(', '), accessRequest.clientId],
        );
      }
      const updated = await pool.query(
        `UPDATE dbo.project_access_requests
         SET status=@p1,decided_at=SYSUTCDATETIME(),decided_by=@p2
         OUTPUT INSERTED.id AS id
         WHERE id=@p3 AND status='pending'`,
        [decision === 'approve' ? 'approved' : 'rejected', req.user.email, req.params.requestId],
      );
      if (!updated.rows[0]) {
        return res.status(409).json({ message: 'This project access request has already been decided.' });
      }
    }
    await notifyRequesterOfAccessDecision(accessRequest, decision, req.user);
    createAuditEntry(
      req.user.email,
      `Project Access ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
      'pending',
      accessRequest.clientId,
    );
    return res.json({ request: { ...accessRequest, status: decision === 'approve' ? 'approved' : 'rejected' } });
  } catch (error) {
    return next(error);
  }
});

router.put('/:clientId', protectRoute, requireRole('Admin', 'Manager', 'Operations Team'), async (req, res, next) => {
  const body = req.body || {};

  try {
    const metricError = validateProjectMetrics(body);
    if (metricError) return res.status(400).json({ message: metricError });
    const pool = getPool();

    let existingClient;

    if (!pool) {
      existingClient = appState.clients.find(
        (client) => client.clientId === req.params.clientId
      );

      if (!existingClient) {
        return res.status(404).json({
          message: 'Client not found.',
        });
      }
    } else {
      existingClient = await findDbClient(
        req.params.clientId
      );

      if (!existingClient) {
        return res.status(404).json({
          message: 'Client not found.',
        });
      }
    }

    if (!canAccessProject(req.user, existingClient)) {
      return res.status(403).json({
        message: 'You are not authorized to update this project. Request access from an administrator.',
      });
    }

    const canManage = canManageProject(req.user?.roles || []);
    if (!pool) {
      const index = appState.clients.findIndex((client) => client.clientId === req.params.clientId);
      if (index < 0) return res.status(404).json({ message: 'Client not found.' });
      if (canManage) {
        appState.clients[index] = {
          ...appState.clients[index],
          ...body,
          updatedAt: new Date().toISOString().slice(0, 10),
          approvalStatus: 'approved',
          pendingPayload: null,
          pendingCreate: false,
        };
        createAuditEntry(req.user.email, 'Client Updated', '—', req.params.clientId);
        return res.json({ client: publicClient(appState.clients[index]) });
      }
      const pendingPayload = { ...existingClient, ...body, ...getSubmittedBy(req.user), approvalStatus: 'pending', pendingCreate: false };
      appState.clients[index] = {
        ...appState.clients[index],
        ...body,
        updatedAt: new Date().toISOString().slice(0, 10),
        approvalStatus: 'pending',
        pendingPayload,
        pendingCreate: false,
      };
      await notifyAdminsOfRequest(req.params.clientId, existingClient.clientName, getSubmittedBy(req.user));
      createAuditEntry(req.user.email, 'Client Change Submitted for Approval', '—', req.params.clientId);
      return res.status(202).json({ pending: true, client: publicClient(appState.clients[index]) });
    }

    if (!canManage) {
      const pendingPayload = JSON.stringify({ ...body, ...getSubmittedBy(req.user) });
      await pool.query(
        `UPDATE clients SET pending_payload=$1, pending_create=0, approval_status='pending', updated_at=CURRENT_TIMESTAMP WHERE client_id=$2`,
        [pendingPayload, req.params.clientId],
      );
      await notifyAdminsOfRequest(req.params.clientId, existingClient.clientName, getSubmittedBy(req.user));
      createAuditEntry(req.user.email, 'Client Change Submitted for Approval', '—', req.params.clientId);
      return res.status(202).json({ pending: true, client: publicClient(existingClient) });
    }

    const result = await pool.query(
      `UPDATE clients
       SET
         client_name=COALESCE($1,client_name),
         account_manager=COALESCE($2,account_manager),
         region=COALESCE($3,region),
         industry=COALESCE($4,industry),
         revenue=COALESCE($5,revenue),
         current_status=COALESCE($6,current_status),
         remarks=COALESCE($7,remarks),
         planned_onboard_date=$8,
         actual_onboard_date=$9,
         planned_offboard_date=$10,
         actual_offboard_date=$11,
         contract_start_date=$12,
         contract_end_date=$13,
         year=$14,
         completion=$15,
         hyperscaler=$16,
         project_type=$17,
         project_brief=$18,
         project_manager=$19,
         isow=$20,
         estimated_start_date=$21,
         estimated_end_date=$22,
         actual_start_date=$23,
         actual_end_date=$24,
         updated_at=CURRENT_TIMESTAMP,
         project_billing_code=$25,
         voumetric=$26,
         service_category=$27
       WHERE client_id=$28
       RETURNING id`,
      [
        body.clientName,
        body.accountManager,
        body.region,
        body.industry,
        body.revenue === undefined
          ? null
          : Number(body.revenue),
        body.currentStatus,
        body.remarks,
        body.plannedOnboardDate || null,
        body.actualOnboardDate || null,
        body.plannedOffboardDate || null,
        body.actualOffboardDate || null,
        body.contractStartDate || null,
        body.contractEndDate || null,
        body.year || new Date().getFullYear(),
        body.completion === undefined
          ? 0
          : Number(body.completion),
        body.hyperscaler || null,
        body.projectType || null,
        body.projectBrief || null,
        body.projectManager ||
          body.accountManager ||
          null,
        body.isow || null,
        body.estimatedStartDate || null,
        body.estimatedEndDate || null,
        body.actualStartDate || null,
        body.actualEndDate || null,
        body.projectBillingCode || null,
        body.voumetric === null || body.voumetric === undefined ? null : Number(body.voumetric),
        body.serviceCategory || null,
        req.params.clientId,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        message: 'Client not found.',
      });
    }

    if (Array.isArray(body.resources)) {
      await saveProjectResources(pool, result.rows[0].id, body.resources);
    }

    if (Array.isArray(body.services)) {
      await saveServices(
        pool,
        result.rows[0].id,
        body.services
      );
    }

    createAuditEntry(
      req.user.email,
      'Client Updated',
      '—',
      req.params.clientId
    );

    return res.json({
      client: publicClient(
        await findDbClient(req.params.clientId)
      ),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:clientId/approve', protectRoute, async (req, res, next) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!canApprove(userRoles)) {
      return res.status(403).json({ message: 'You are not authorized to approve this project change.' });
    }

    const pool = getPool();
    if (!pool) {
      const index = appState.clients.findIndex((client) => client.clientId === req.params.clientId);
      if (index < 0) return res.status(404).json({ message: 'Pending client change not found.' });
      const client = appState.clients[index];
      if (!canApproveForProject(req.user, client)) {
        return res.status(403).json({ message: 'You are not authorized to approve this project change.' });
      }
      const payload = client.pendingPayload || {};
      const approvedClient = {
        ...client,
        ...payload,
        updatedAt: new Date().toISOString().slice(0, 10),
        approvalStatus: 'approved',
        pendingPayload: null,
        pendingCreate: false,
      };
      appState.clients[index] = approvedClient;
      await notifySubmitterOfDecision(payload, req.params.clientId, 'approve', req.user);
      createAuditEntry(req.user.email, 'Client Change Approved', 'pending', req.params.clientId);
      return res.json({ client: publicClient(approvedClient) });
    }

    const pending = await pool.query('SELECT id,client_id,pending_payload FROM clients WHERE client_id=$1 AND approval_status=$2', [req.params.clientId, 'pending']);
    const record = pending.rows[0];
    if (!record) return res.status(404).json({ message: 'Pending client change not found.' });

    const currentClient = await findDbClient(req.params.clientId);
    if (!currentClient || !canApproveForProject(req.user, currentClient)) {
      return res.status(403).json({ message: 'You are not authorized to approve this project change.' });
    }

    const payload = parsePendingPayload(record.pending_payload) || {};
    const metricError = validateProjectMetrics(payload);
    if (metricError) return res.status(400).json({ message: metricError });
    const result = await pool.query(
      `UPDATE clients SET client_name=COALESCE($1,client_name),account_manager=COALESCE($2,account_manager),region=COALESCE($3,region),industry=COALESCE($4,industry),revenue=COALESCE($5,revenue),current_status=COALESCE($6,current_status),remarks=COALESCE($7,remarks),planned_onboard_date=$8,actual_onboard_date=$9,planned_offboard_date=$10,actual_offboard_date=$11,contract_start_date=$12,contract_end_date=$13,year=$14,completion=$15,hyperscaler=$16,project_type=$17,project_brief=$18,project_manager=$19,isow=$20,estimated_start_date=$21,estimated_end_date=$22,actual_start_date=$23,actual_end_date=$24,project_billing_code=$25,voumetric=$26,service_category=$27,pending_payload=NULL,approval_status='approved',updated_at=CURRENT_TIMESTAMP WHERE id=$28 RETURNING id`,
      [payload.clientName,payload.accountManager,payload.region,payload.industry,payload.revenue === undefined ? null : Number(payload.revenue),payload.currentStatus,payload.remarks,payload.plannedOnboardDate || null,payload.actualOnboardDate || null,payload.plannedOffboardDate || null,payload.actualOffboardDate || null,payload.contractStartDate || null,payload.contractEndDate || null,payload.year || new Date().getFullYear(),payload.completion === undefined ? 0 : Number(payload.completion),payload.hyperscaler || null,payload.projectType || null,payload.projectBrief || null,payload.projectManager || payload.accountManager || null,payload.isow || null,payload.estimatedStartDate || null,payload.estimatedEndDate || null,payload.actualStartDate || null,payload.actualEndDate || null,payload.projectBillingCode || null,payload.voumetric === null || payload.voumetric === undefined ? null : Number(payload.voumetric),payload.serviceCategory || null,record.id],
    );
    if (Array.isArray(payload.resources)) {
      await saveProjectResources(pool, record.id, payload.resources);
    }
    if (Array.isArray(payload.services)) await saveServices(pool, record.id, payload.services);
    await notifySubmitterOfDecision(payload, req.params.clientId, 'approve', req.user);
    createAuditEntry(req.user.email, 'Client Change Approved', 'pending', req.params.clientId);
    return res.json({ client: publicClient(await findDbClient(req.params.clientId)) });
  } catch (error) { return next(error); }
});

router.post('/:clientId/reject', protectRoute, async (req, res, next) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!canApprove(userRoles)) {
      return res.status(403).json({ message: 'You are not authorized to reject this project change.' });
    }

    const pool = getPool();
    if (!pool) {
      const index = appState.clients.findIndex((client) => client.clientId === req.params.clientId);
      if (index < 0) return res.status(404).json({ message: 'Pending client change not found.' });
      const client = appState.clients[index];
      if (!canApproveForProject(req.user, client)) {
        return res.status(403).json({ message: 'You are not authorized to reject this project change.' });
      }
      appState.clients[index] = {
        ...client,
        approvalStatus: 'approved',
        pendingPayload: null,
        pendingCreate: false,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      await notifySubmitterOfDecision(client.pendingPayload, req.params.clientId, 'reject', req.user);
      createAuditEntry(req.user.email, 'Client Change Rejected', 'pending', req.params.clientId);
      return res.json({ rejected: true });
    }

    const pending = await getPool().query('SELECT id,pending_payload FROM clients WHERE client_id=$1 AND approval_status=$2', [req.params.clientId, 'pending']);
    const pendingRecord = pending.rows[0];
    if (!pendingRecord) return res.status(404).json({ message: 'Pending client change not found.' });

    const currentClient = await findDbClient(req.params.clientId);
    if (!currentClient || !canApproveForProject(req.user, currentClient)) {
      return res.status(403).json({ message: 'You are not authorized to reject this project change.' });
    }

    const pendingPayload = parsePendingPayload(pendingRecord?.pending_payload);
    const result = await getPool().query(`DELETE FROM clients WHERE client_id=$1 AND approval_status='pending' AND pending_create=1 RETURNING client_id`, [req.params.clientId]);
    if (!result.rows[0]) {
      const update = await getPool().query(`UPDATE clients SET pending_payload=NULL,approval_status='approved',updated_at=CURRENT_TIMESTAMP WHERE client_id=$1 AND approval_status='pending' RETURNING client_id`, [req.params.clientId]);
      if (!update.rows[0]) return res.status(404).json({ message: 'Pending client change not found.' });
    }
    await notifySubmitterOfDecision(pendingPayload, req.params.clientId, 'reject', req.user);
    createAuditEntry(req.user.email, 'Client Change Rejected', 'pending', req.params.clientId);
    return res.json({ rejected: true });
  } catch (error) { return next(error); }
});

router.delete('/:clientId', protectRoute, requireRole('Admin'), async (req, res, next) => { try { const pool = getPool(); if (!pool) { const index = appState.clients.findIndex((client) => client.clientId === req.params.clientId); if (index < 0) return res.status(404).json({ message: 'Client not found.' }); appState.clients.splice(index,1); return res.json({ deleted:true, client:req.params.clientId }); } const result = await pool.query('DELETE FROM clients WHERE client_id=$1 RETURNING client_id',[req.params.clientId]); if (!result.rows[0]) return res.status(404).json({ message:'Client not found.' }); return res.json({ deleted:true, client:result.rows[0].client_id }); } catch (error) { return next(error); } });

export default router;

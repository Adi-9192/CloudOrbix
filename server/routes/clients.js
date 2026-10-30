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
import {
  mandatoryDocumentsRequiredMessage,
  missingMandatoryProjectDocuments,
  requiresMandatoryProjectDocuments,
} from '../lib/mandatory-project-documents.js';
import { MANDATORY_DOCUMENTS } from '../../shared/project-documents.js';
import { protectRoute, requireRole } from '../middleware/auth.js';
import { resolveNewProjectId } from '../../shared/project-id.js';
import { normalizeProjectName } from '../../shared/project-name.js';
import { normalizeProjectStatus } from '../../shared/project-status.js';

const router = express.Router();
const supportedCurrencies = new Set(['INR', 'AED', 'AUD', 'CAD', 'CHF', 'DKK', 'EUR', 'GBP', 'NOK', 'SEK', 'SGD', 'USD']);
let accessRequestTableReady;
let serviceCategoryColumnReady;
const publicClient = (client) => ({ ...client, id: client.id, name: client.clientName, status: client.currentStatus, lastUpdated: client.updatedAt });
const hasActualEndDate = (value) => Boolean(String(value || '').trim());
const completedWithoutActualEndDate = (status, actualEndDate) =>
  normalizeProjectStatus(status) === 'Completed' && !hasActualEndDate(actualEndDate);
const actualEndDateFromUpdate = (payload, existingClient) => {
  if (Object.hasOwn(payload, 'actualEndDate')) return payload.actualEndDate;
  if (Object.hasOwn(payload, 'actualOffboardDate')) return payload.actualOffboardDate;
  return existingClient.actualEndDate || existingClient.actualOffboardDate;
};

async function projectNameConflict(pool, name, excludingClientId = null) {
  const normalizedName = normalizeProjectName(name);
  if (!normalizedName) return false;
  if (!pool) {
    return appState.clients.some((client) =>
      client.clientId !== excludingClientId &&
      [client.clientName, client.pendingPayload?.clientName].some(
        (candidate) => normalizeProjectName(candidate) === normalizedName,
      ),
    );
  }
  const result = await pool.query(`
    SELECT TOP (1) client_id
    FROM clients
    WHERE ($2 IS NULL OR client_id <> $2)
      AND (
        LOWER(LTRIM(RTRIM(client_name))) = LOWER(LTRIM(RTRIM($1)))
        OR LOWER(LTRIM(RTRIM(CASE WHEN ISJSON(pending_payload) = 1 THEN JSON_VALUE(pending_payload, '$.clientName') END))) = LOWER(LTRIM(RTRIM($1)))
      )
  `, [normalizedName, excludingClientId]);
  return result.rows.length > 0;
}

async function getMissingMandatoryDocuments(pool, clientDbId) {
  if (!pool) return missingMandatoryProjectDocuments([]);

  const documentIds = MANDATORY_DOCUMENTS.map(({ id }) => id);
  const placeholders = documentIds.map((_, index) => `$${index + 2}`).join(',');
  const result = await pool.query(
    `SELECT DISTINCT document_type
     FROM project_documents
     WHERE client_id=$1 AND document_type IN (${placeholders})`,
    [clientDbId, ...documentIds],
  );
  return missingMandatoryProjectDocuments(
    result.rows.map((row) => row.document_type),
  );
}

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
const columns = `c.id,c.client_id,c.client_name,c.account_manager,c.region,c.industry,c.revenue,c.currency_code,c.current_status,c.remarks,c.created_at,c.updated_at,c.planned_onboard_date,c.actual_onboard_date,c.planned_offboard_date,c.actual_offboard_date,c.contract_start_date,c.contract_end_date,c.year,c.completion,c.hyperscaler,c.project_type,c.service_category,c.project_brief,c.project_overview,c.in_scope,c.out_of_scope,c.assumption,c.project_manager,c.isow,c.project_billing_code,c.voumetric,c.estimated_start_date,c.estimated_end_date,c.actual_start_date,c.actual_end_date,c.approval_status,c.pending_payload,c.pending_create,c.rfp_project_id,COALESCE((SELECT STRING_AGG(s2.name, ',') FROM client_services cs2 JOIN services s2 ON s2.id=cs2.service_id WHERE cs2.client_id=c.id),'') services`;
const mapRow = (row) => ({ id: row.id, clientId: row.client_id, clientName: row.client_name, accountManager: row.account_manager, region: row.region, industry: row.industry, revenue: Number(row.revenue || 0), currencyCode: row.currency_code || 'INR', currentStatus: row.current_status, remarks: row.remarks, createdAt: row.created_at?.toISOString?.().slice(0,10) || row.created_at, updatedAt: row.updated_at?.toISOString?.().slice(0,10) || row.updated_at, plannedOnboardDate: row.planned_onboard_date, actualOnboardDate: row.actual_onboard_date, plannedOffboardDate: row.planned_offboard_date, actualOffboardDate: row.actual_offboard_date, contractStartDate: row.contract_start_date, contractEndDate: row.contract_end_date, year: row.year, completion: Number(row.completion || 0), hyperscaler: row.hyperscaler, projectType: row.project_type, serviceCategory: row.service_category, projectBrief: row.project_brief, projectOverview: row.project_overview || '', inScope: row.in_scope || '', outOfScope: row.out_of_scope || '', assumption: row.assumption || '', projectManager: row.project_manager, isow: row.isow, projectBillingCode: row.project_billing_code, rfpProjectId: row.rfp_project_id, resources: [], voumetric: row.voumetric, estimatedStartDate: row.estimated_start_date, estimatedEndDate: row.estimated_end_date, actualStartDate: row.actual_start_date, actualEndDate: row.actual_end_date, approvalStatus: row.approval_status || 'approved', pendingCreate: Boolean(row.pending_create), pendingPayload: parsePendingPayload(row.pending_payload), services: row.services || [] });

async function validateRfpProjectLink(pool, rfpProjectId, clientName) {
  if (rfpProjectId === null || rfpProjectId === undefined || rfpProjectId === '') return null;
  const id = Number(rfpProjectId);
  if (!Number.isInteger(id) || id < 1) {
    throw Object.assign(new Error('The linked RFP estimate is invalid.'), { status: 400 });
  }
  const result = await pool.query(
    'SELECT project_name, project_status FROM rfp_projects WHERE id = $1',
    [id],
  );
  const rfp = result.rows[0];
  if (!rfp || normalizeProjectName(rfp.project_name) !== normalizeProjectName(clientName)) {
    throw Object.assign(new Error('The linked RFP estimate does not match this project.'), { status: 400 });
  }
  if (rfp.project_status !== 'Project Initiated') {
    throw Object.assign(new Error('Only an initiated RFP estimate can be moved to a project.'), { status: 409 });
  }
  return id;
}

async function completeRfpProject(pool, rfpProjectId) {
  if (!rfpProjectId) return;
  await pool.query(
    `UPDATE rfp_projects SET project_status = 'Completed', updated_at = SYSUTCDATETIME()
     WHERE id = $1 AND project_status = 'Project Initiated'`,
    [rfpProjectId],
  );
}
async function mapDbClients(pool, rows) {
  const clients = rows.map(mapRow);
  if (!clients.length) return clients;

  const placeholders = clients.map((_, index) => `$${index + 1}`).join(',');
  const resources = await pool.query(
    `SELECT client_id,resource_name,fte,role_for_project,infrastructure_access FROM project_resources WHERE client_id IN (${placeholders}) ORDER BY id`,
    clients.map((client) => client.id),
  );
  const resourcesByClient = new Map();
  for (const resource of resources.rows) {
    const allocations = resourcesByClient.get(resource.client_id) || [];
    allocations.push({
      resourceName: resource.resource_name,
      fte: resource.fte === null ? null : Number(resource.fte),
      roleForProject: resource.role_for_project || '',
      infrastructureAccess: Boolean(resource.infrastructure_access),
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
    const roleForProject = String(resource.roleForProject || '').trim();
    await pool.query(
      'INSERT INTO project_resources(client_id,resource_name,fte,role_for_project,infrastructure_access) VALUES(@p1,@p2,@p3,@p4,@p5)',
      [
        clientDbId,
        resourceName,
        resource.fte === '' ? null : resource.fte,
        roleForProject || null,
        Boolean(resource.infrastructureAccess),
      ],
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
    if (body.currencyCode && !supportedCurrencies.has(String(body.currencyCode).toUpperCase())) {
      return res.status(400).json({ message: 'Select a supported project currency.' });
    }
    body.currencyCode = String(body.currencyCode || 'INR').toUpperCase();
    const metricError = validateProjectMetrics(body);
    if (metricError) return res.status(400).json({ message: metricError });
    const canManage = canManageProject(req.user?.roles || []);
    const pool = getPool();
    if (await projectNameConflict(pool, body.clientName)) {
      return res.status(409).json({ message: 'A project with this name already exists. Enter a unique project name.' });
    }
    if (completedWithoutActualEndDate(body.currentStatus, body.actualEndDate || body.actualOffboardDate)) {
      return res.status(400).json({ message: 'Actual End Date is required to mark a project as completed.' });
    }
    if (requiresMandatoryProjectDocuments(body.currentStatus)) {
      const missingDocuments = missingMandatoryProjectDocuments([]);
      return res.status(400).json({
        message: mandatoryDocumentsRequiredMessage(missingDocuments),
        missingDocuments,
      });
    }
    await ensureServiceCategoryColumn(pool);
    const rfpProjectId = pool
      ? await validateRfpProjectLink(pool, body.rfpProjectId, body.clientName)
      : null;
    const now = new Date();
    const period = { month: now.getMonth() + 1, year: now.getFullYear() };
    if (!pool) {
      const clientId = resolveNewProjectId(
        body.clientId,
        appState.clients.map((client) => client.clientId),
        period,
      );
      const requester = canManage ? null : getSubmittedBy(req.user);
      const client = { id: Date.now(), clientId, clientName: body.clientName, accountManager: body.accountManager, projectManager: body.projectManager || body.accountManager, serviceCategory: body.serviceCategory || null, region: body.region || 'North America', industry: body.industry || 'Technology', revenue: Number(body.revenue || 0), currencyCode: body.currencyCode || 'INR', projectOverview: body.projectOverview || '', inScope: body.inScope || '', outOfScope: body.outOfScope || '', assumption: body.assumption || '', projectBrief: body.projectBrief || '', currentStatus: body.currentStatus || 'Pending Onboarding', services: body.services || [], createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), plannedOnboardDate: body.plannedOnboardDate || null, actualOnboardDate: body.actualOnboardDate || null, plannedOffboardDate: body.plannedOffboardDate || null, actualOffboardDate: body.actualOffboardDate || null, actualEndDate: body.actualEndDate || body.actualOffboardDate || null, contractStartDate: body.contractStartDate || null, contractEndDate: body.contractEndDate || null, projectBillingCode: body.projectBillingCode || null, rfpProjectId, resources: body.resources || [], voumetric: body.voumetric === null || body.voumetric === undefined ? null : Number(body.voumetric), remarks: body.remarks || '', approvalStatus: canManage ? 'approved' : 'pending', pendingPayload: requester ? { ...body, ...requester } : null, pendingCreate: !canManage };
      appState.clients.unshift(client);
      if (requester) await notifyAdminsOfRequest(client.clientId, client.clientName, requester);
      createAuditEntry(req.user.email, canManage ? 'Client Created' : 'Client Submitted for Approval', '—', client.clientName);
      return res.status(canManage ? 201 : 202).json({ pending: !canManage, client: publicClient(client) });
    }
    const pendingPayload = canManage ? null : JSON.stringify({ ...body, ...getSubmittedBy(req.user) });
    const insertSql = `INSERT INTO clients(client_id,client_name,account_manager,region,industry,revenue,current_status,remarks,planned_onboard_date,actual_onboard_date,planned_offboard_date,actual_offboard_date,contract_start_date,contract_end_date,year,completion,hyperscaler,project_type,project_brief,project_manager,isow,estimated_start_date,estimated_end_date,actual_start_date,actual_end_date,approval_status,pending_payload,pending_create,project_billing_code,resources,fte,voumetric,service_category,rfp_project_id,currency_code,project_overview,in_scope,out_of_scope,assumption) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NULL,NULL,$30,$31,$32,$33,$34,$35,$36,$37) RETURNING id`;
    const insertValues = (clientId) => [clientId,body.clientName,body.accountManager,body.region || 'North America',body.industry || 'Technology',Number(body.revenue || 0),body.currentStatus || 'Onboarded',body.remarks || '',body.plannedOnboardDate || null,body.actualOnboardDate || null,body.plannedOffboardDate || null,body.actualOffboardDate || null,body.contractStartDate || null,body.contractEndDate || null,body.year || period.year,Number(body.completion || 0),body.hyperscaler || null,body.projectType || null,body.projectBrief || null,body.projectManager || body.accountManager || null,body.isow || null,body.estimatedStartDate || body.plannedOnboardDate || null,body.estimatedEndDate || body.plannedOffboardDate || null,body.actualStartDate || body.actualOnboardDate || null,body.actualEndDate || body.actualOffboardDate || null,canManage ? 'approved' : 'pending',pendingPayload,!canManage,body.projectBillingCode || null,body.voumetric === null || body.voumetric === undefined ? null : Number(body.voumetric),body.serviceCategory || null,rfpProjectId,body.currencyCode || 'INR',body.projectOverview || null,body.inScope || null,body.outOfScope || null,body.assumption || null];
    let clientId = body.clientId;
    let result;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await pool.query('SELECT client_id FROM clients');
      clientId = resolveNewProjectId(
        attempt === 0 ? body.clientId : null,
        existing.rows.map((row) => row.client_id),
        period,
      );
      try {
        result = await pool.query(insertSql, insertValues(clientId));
        break;
      } catch (error) {
        const duplicateKey = error.number === 2627 || error.number === 2601 || error.code === '23505';
        if (!duplicateKey || attempt === 4) throw error;
        clientId = null;
      }
    }
    await saveProjectResources(pool, result.rows[0].id, body.resources || []);
    await saveServices(pool, result.rows[0].id, body.services);
    if (canManage) await completeRfpProject(pool, rfpProjectId);
    if (!canManage) await notifyAdminsOfRequest(clientId, body.clientName, getSubmittedBy(req.user));
    createAuditEntry(req.user.email, canManage ? 'Client Created' : 'Client Submitted for Approval', '—', body.clientName);
    return res.status(canManage ? 201 : 202).json({ pending: !canManage, client: publicClient(await findDbClient(clientId)) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === '23505' || error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ message: 'Unable to allocate a unique Project ID. Please try again.' });
    }
    return next(error);
  }
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
    if (body.currencyCode && !supportedCurrencies.has(String(body.currencyCode).toUpperCase())) {
      return res.status(400).json({ message: 'Select a supported project currency.' });
    }
    if (body.currencyCode) body.currencyCode = String(body.currencyCode).toUpperCase();
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
          message: 'Project not found.',
        });
      }
    } else {
      existingClient = await findDbClient(
        req.params.clientId
      );

      if (!existingClient) {
        return res.status(404).json({
          message: 'Project not found.',
        });
      }
    }

    if (!canAccessProject(req.user, existingClient)) {
      return res.status(403).json({
        message: 'You are not authorized to update this project. Request access from an administrator.',
      });
    }

    const nextStatus = body.currentStatus ?? existingClient.currentStatus;
    const nextActualEndDate = actualEndDateFromUpdate(body, existingClient);
    if (completedWithoutActualEndDate(nextStatus, nextActualEndDate)) {
      return res.status(400).json({ message: 'Actual End Date is required to mark a project as completed.' });
    }
    if (await projectNameConflict(pool, body.clientName ?? existingClient.clientName, req.params.clientId)) {
      return res.status(409).json({ message: 'A project with this name already exists. Enter a unique project name.' });
    }

    if (
      requiresMandatoryProjectDocuments(
        body.currentStatus ?? existingClient.currentStatus,
      )
    ) {
      const missingDocuments = await getMissingMandatoryDocuments(
        pool,
        existingClient.id,
      );
      if (missingDocuments.length) {
        return res.status(400).json({
          message: mandatoryDocumentsRequiredMessage(missingDocuments),
          missingDocuments,
        });
      }
    }

    const canManage = canManageProject(req.user?.roles || []);
    if (!pool) {
      const index = appState.clients.findIndex((client) => client.clientId === req.params.clientId);
      if (index < 0) return res.status(404).json({ message: 'Project not found.' });
      if (canManage) {
        appState.clients[index] = {
          ...appState.clients[index],
          ...body,
          updatedAt: new Date().toISOString().slice(0, 10),
          approvalStatus: 'approved',
          pendingPayload: null,
          pendingCreate: false,
        };
        await createAuditEntry(req.user.email, 'Client Updated', '—', req.params.clientId);
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
      await createAuditEntry(req.user.email, 'Client Change Submitted for Approval', '—', req.params.clientId);
      return res.status(202).json({ pending: true, client: publicClient(appState.clients[index]) });
    }

    if (!canManage) {
      const pendingPayload = JSON.stringify({ ...body, ...getSubmittedBy(req.user) });
      await pool.query(
        `UPDATE clients SET pending_payload=$1, pending_create=0, approval_status='pending', updated_at=CURRENT_TIMESTAMP WHERE client_id=$2`,
        [pendingPayload, req.params.clientId],
      );
      await notifyAdminsOfRequest(req.params.clientId, existingClient.clientName, getSubmittedBy(req.user));
      await createAuditEntry(req.user.email, 'Client Change Submitted for Approval', '—', req.params.clientId);
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
         service_category=$27,
         currency_code=$28,
         project_overview=$29,
         in_scope=$30,
         out_of_scope=$31,
         assumption=$32
       WHERE client_id=$33
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
        body.currencyCode || existingClient.currencyCode || 'INR',
        body.projectOverview === undefined ? existingClient.projectOverview || null : body.projectOverview,
        body.inScope === undefined ? existingClient.inScope || null : body.inScope,
        body.outOfScope === undefined ? existingClient.outOfScope || null : body.outOfScope,
        body.assumption === undefined ? existingClient.assumption || null : body.assumption,
        req.params.clientId,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        message: 'Project not found.',
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

    await createAuditEntry(
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
      if (index < 0) return res.status(404).json({ message: 'Pending project change not found.' });
      const client = appState.clients[index];
      if (!canApproveForProject(req.user, client)) {
        return res.status(403).json({ message: 'You are not authorized to approve this project change.' });
      }
      const payload = client.pendingPayload || {};
      const approvedStatus = payload.currentStatus ?? client.currentStatus;
      const approvedEndDate = actualEndDateFromUpdate(payload, client);
      if (completedWithoutActualEndDate(approvedStatus, approvedEndDate)) {
        return res.status(400).json({ message: 'Actual End Date is required to mark a project as completed.' });
      }
      if (await projectNameConflict(pool, payload.clientName ?? client.clientName, req.params.clientId)) {
        return res.status(409).json({ message: 'A project with this name already exists. Enter a unique project name.' });
      }
        if (requiresMandatoryProjectDocuments(payload.currentStatus ?? client.currentStatus)) {
          const missingDocuments = missingMandatoryProjectDocuments([]);
          if (missingDocuments.length) {
            return res.status(400).json({
              message: mandatoryDocumentsRequiredMessage(missingDocuments),
              missingDocuments,
            });
          }
        }
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
      await createAuditEntry(req.user.email, 'Client Change Approved', 'pending', req.params.clientId);
      return res.json({ client: publicClient(approvedClient) });
    }

    const pending = await pool.query('SELECT id,client_id,pending_payload FROM clients WHERE client_id=$1 AND approval_status=$2', [req.params.clientId, 'pending']);
    const record = pending.rows[0];
    if (!record) return res.status(404).json({ message: 'Pending project change not found.' });

    const currentClient = await findDbClient(req.params.clientId);
    if (!currentClient || !canApproveForProject(req.user, currentClient)) {
      return res.status(403).json({ message: 'You are not authorized to approve this project change.' });
    }

    const payload = parsePendingPayload(record.pending_payload) || {};
    let linkedRfpDetails;
    if (Number.isInteger(Number(payload.rfpProjectId)) && Number(payload.rfpProjectId) > 0) {
      linkedRfpDetails = (await pool.query(
        `SELECT p.currency_code,p.project_overview,p.in_scope,p.out_of_scope,p.assumption,
          s.selected_currency_total
         FROM rfp_projects p
         LEFT JOIN rfp_cost_summary s ON s.project_id=p.id
         WHERE p.id=$1`,
        [Number(payload.rfpProjectId)],
      )).rows[0];
    }
    const approvedStatus = payload.currentStatus ?? currentClient.currentStatus;
    const approvedEndDate = actualEndDateFromUpdate(payload, currentClient);
    if (completedWithoutActualEndDate(approvedStatus, approvedEndDate)) {
      return res.status(400).json({ message: 'Actual End Date is required to mark a project as completed.' });
    }
    if (await projectNameConflict(pool, payload.clientName ?? currentClient.clientName, req.params.clientId)) {
      return res.status(409).json({ message: 'A project with this name already exists. Enter a unique project name.' });
    }
    const metricError = validateProjectMetrics(payload);
    if (metricError) return res.status(400).json({ message: metricError });
    if (
      requiresMandatoryProjectDocuments(
        payload.currentStatus ?? currentClient.currentStatus,
      )
    ) {
      const missingDocuments = await getMissingMandatoryDocuments(
        pool,
        record.id,
      );
      if (missingDocuments.length) {
        return res.status(400).json({
          message: mandatoryDocumentsRequiredMessage(missingDocuments),
          missingDocuments,
        });
      }
    }
    const result = await pool.query(
      `UPDATE clients SET client_name=COALESCE($1,client_name),account_manager=COALESCE($2,account_manager),region=COALESCE($3,region),industry=COALESCE($4,industry),revenue=COALESCE($5,revenue),current_status=COALESCE($6,current_status),remarks=COALESCE($7,remarks),planned_onboard_date=$8,actual_onboard_date=$9,planned_offboard_date=$10,actual_offboard_date=$11,contract_start_date=$12,contract_end_date=$13,year=$14,completion=$15,hyperscaler=$16,project_type=$17,project_brief=$18,project_manager=$19,isow=$20,estimated_start_date=$21,estimated_end_date=$22,actual_start_date=$23,actual_end_date=$24,project_billing_code=$25,voumetric=$26,service_category=$27,currency_code=$28,project_overview=$29,in_scope=$30,out_of_scope=$31,assumption=$32,pending_payload=NULL,approval_status='approved',updated_at=CURRENT_TIMESTAMP WHERE id=$33 RETURNING id`,
      [payload.clientName,payload.accountManager,payload.region,payload.industry,linkedRfpDetails?.selected_currency_total ?? (payload.revenue === undefined ? null : Number(payload.revenue)),payload.currentStatus,payload.remarks,payload.plannedOnboardDate || null,payload.actualOnboardDate || null,payload.plannedOffboardDate || null,payload.actualOffboardDate || null,payload.contractStartDate || null,payload.contractEndDate || null,payload.year || new Date().getFullYear(),payload.completion === undefined ? 0 : Number(payload.completion),payload.hyperscaler || null,payload.projectType || null,payload.projectBrief || null,payload.projectManager || payload.accountManager || null,payload.isow || null,payload.estimatedStartDate || null,payload.estimatedEndDate || null,payload.actualStartDate || null,payload.actualEndDate || null,payload.projectBillingCode || null,payload.voumetric === null || payload.voumetric === undefined ? null : Number(payload.voumetric),payload.serviceCategory || null,linkedRfpDetails?.currency_code || payload.currencyCode || currentClient.currencyCode || 'INR',linkedRfpDetails?.project_overview ?? (payload.projectOverview === undefined ? currentClient.projectOverview || null : payload.projectOverview),linkedRfpDetails?.in_scope ?? (payload.inScope === undefined ? currentClient.inScope || null : payload.inScope),linkedRfpDetails?.out_of_scope ?? (payload.outOfScope === undefined ? currentClient.outOfScope || null : payload.outOfScope),linkedRfpDetails?.assumption ?? (payload.assumption === undefined ? currentClient.assumption || null : payload.assumption),record.id],
    );
    if (Array.isArray(payload.resources)) {
      await saveProjectResources(pool, record.id, payload.resources);
    }
    if (Array.isArray(payload.services)) await saveServices(pool, record.id, payload.services);
    await completeRfpProject(pool, payload.rfpProjectId);
    await notifySubmitterOfDecision(payload, req.params.clientId, 'approve', req.user);
    await createAuditEntry(req.user.email, 'Client Change Approved', 'pending', req.params.clientId);
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
      if (index < 0) return res.status(404).json({ message: 'Pending project change not found.' });
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
      await createAuditEntry(req.user.email, 'Client Change Rejected', 'pending', req.params.clientId);
      return res.json({ rejected: true });
    }

    const pending = await getPool().query('SELECT id,pending_payload FROM clients WHERE client_id=$1 AND approval_status=$2', [req.params.clientId, 'pending']);
    const pendingRecord = pending.rows[0];
    if (!pendingRecord) return res.status(404).json({ message: 'Pending project change not found.' });

    const currentClient = await findDbClient(req.params.clientId);
    if (!currentClient || !canApproveForProject(req.user, currentClient)) {
      return res.status(403).json({ message: 'You are not authorized to reject this project change.' });
    }

    const pendingPayload = parsePendingPayload(pendingRecord?.pending_payload);
    const result = await getPool().query(`DELETE FROM clients WHERE client_id=$1 AND approval_status='pending' AND pending_create=1 RETURNING client_id`, [req.params.clientId]);
    if (!result.rows[0]) {
      const update = await getPool().query(`UPDATE clients SET pending_payload=NULL,approval_status='approved',updated_at=CURRENT_TIMESTAMP WHERE client_id=$1 AND approval_status='pending' RETURNING client_id`, [req.params.clientId]);
      if (!update.rows[0]) return res.status(404).json({ message: 'Pending project change not found.' });
    }
    await notifySubmitterOfDecision(pendingPayload, req.params.clientId, 'reject', req.user);
    await createAuditEntry(req.user.email, 'Client Change Rejected', 'pending', req.params.clientId);
    return res.json({ rejected: true });
  } catch (error) { return next(error); }
});

router.delete('/:clientId', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) {
      const index = appState.clients.findIndex((client) => client.clientId === req.params.clientId);
      if (index < 0) return res.status(404).json({ message: 'Project not found.' });
      const [deletedClient] = appState.clients.splice(index, 1);
      await createAuditEntry(
        req.user.email,
        'Client Deleted',
        deletedClient.clientName,
        deletedClient.clientId,
      );
      return res.json({ deleted: true, client: deletedClient.clientId });
    }

    const result = await pool.query(
      'DELETE FROM clients WHERE client_id=$1 RETURNING client_id,client_name',
      [req.params.clientId],
    );
    const deletedClient = result.rows[0];
    if (!deletedClient) return res.status(404).json({ message: 'Project not found.' });

    await createAuditEntry(
      req.user.email,
      'Client Deleted',
      deletedClient.client_name,
      deletedClient.client_id,
    );
    return res.json({ deleted: true, client: deletedClient.client_id });
  } catch (error) {
    return next(error);
  }
});

export default router;

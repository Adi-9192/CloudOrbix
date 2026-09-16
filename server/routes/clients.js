import express from 'express';
import { appState, createAuditEntry, getPool } from '../db.js';
import { protectRoute, requireRole } from '../middleware/auth.js';

const router = express.Router();
const publicClient = (client) => ({ ...client, id: client.id, name: client.clientName, status: client.currentStatus, lastUpdated: client.updatedAt });
const columns = `c.id,c.client_id,c.client_name,c.account_manager,c.region,c.industry,c.revenue,c.current_status,c.remarks,c.created_at,c.updated_at,c.planned_onboard_date,c.actual_onboard_date,c.planned_offboard_date,c.actual_offboard_date,c.contract_start_date,c.contract_end_date,c.year,c.completion,c.hyperscaler,c.project_type,c.project_brief,c.project_manager,c.isow,c.estimated_start_date,c.estimated_end_date,c.actual_start_date,c.actual_end_date,c.approval_status,c.pending_payload,c.pending_create,COALESCE(array_agg(s.name) FILTER (WHERE s.name IS NOT NULL),'{}') services`;
const mapRow = (row) => ({ id: row.id, clientId: row.client_id, clientName: row.client_name, accountManager: row.account_manager, region: row.region, industry: row.industry, revenue: Number(row.revenue || 0), currentStatus: row.current_status, remarks: row.remarks, createdAt: row.created_at?.toISOString?.().slice(0,10) || row.created_at, updatedAt: row.updated_at?.toISOString?.().slice(0,10) || row.updated_at, plannedOnboardDate: row.planned_onboard_date, actualOnboardDate: row.actual_onboard_date, plannedOffboardDate: row.planned_offboard_date, actualOffboardDate: row.actual_offboard_date, contractStartDate: row.contract_start_date, contractEndDate: row.contract_end_date, year: row.year, completion: Number(row.completion || 0), hyperscaler: row.hyperscaler, projectType: row.project_type, projectBrief: row.project_brief, projectManager: row.project_manager, isow: row.isow, estimatedStartDate: row.estimated_start_date, estimatedEndDate: row.estimated_end_date, actualStartDate: row.actual_start_date, actualEndDate: row.actual_end_date, approvalStatus: row.approval_status || 'approved', pendingPayload: row.pending_payload, services: row.services || [] });
async function findDbClient(clientId) { const result = await getPool().query(`SELECT ${columns} FROM clients c LEFT JOIN client_services cs ON cs.client_id=c.id LEFT JOIN services s ON s.id=cs.service_id WHERE c.client_id=$1 GROUP BY c.id`, [clientId]); return result.rows[0] && mapRow(result.rows[0]); }
async function saveServices(pool, clientDbId, services = []) { await pool.query('DELETE FROM client_services WHERE client_id=$1', [clientDbId]); for (const name of services) { const result = await pool.query('INSERT INTO services(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id', [name]); await pool.query('INSERT INTO client_services(client_id,service_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [clientDbId, result.rows[0].id]); } }
router.get('/', protectRoute, async (req, res, next) => { try { const pool = getPool(); if (!pool) return res.json({ clients: appState.clients.map(publicClient) }); const result = await pool.query(`SELECT ${columns} FROM clients c LEFT JOIN client_services cs ON cs.client_id=c.id LEFT JOIN services s ON s.id=cs.service_id WHERE COALESCE(c.approval_status,'approved')='approved' GROUP BY c.id ORDER BY c.id DESC`); return res.json({ clients: result.rows.map((row) => publicClient(mapRow(row))) }); } catch (error) { return next(error); } });

router.get('/approvals', protectRoute, requireRole('Admin'), async (req, res, next) => { try { const result = await getPool().query(`SELECT ${columns} FROM clients c LEFT JOIN client_services cs ON cs.client_id=c.id LEFT JOIN services s ON s.id=cs.service_id WHERE c.approval_status='pending' GROUP BY c.id ORDER BY c.updated_at DESC`); return res.json({ clients: result.rows.map(mapRow) }); } catch (error) { return next(error); } });

router.post('/', protectRoute, async (req, res, next) => {
  const body = req.body || {}; if (!body.clientId || !body.clientName || !body.accountManager) return res.status(400).json({ message: 'Client ID, name, and account manager are required.' });
  try {
    const isAdmin = req.user?.roles?.includes('Admin');
    const pool = getPool();
    if (!pool) { if (appState.clients.some((client) => client.clientId === body.clientId)) return res.status(409).json({ message: 'Client ID already exists.' }); const client = { id: Date.now(), clientId: body.clientId, clientName: body.clientName, accountManager: body.accountManager, region: body.region || 'North America', industry: body.industry || 'Technology', revenue: Number(body.revenue || 0), currentStatus: body.currentStatus || 'Pending Onboarding', services: body.services || [], createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), plannedOnboardDate: body.plannedOnboardDate || null, actualOnboardDate: body.actualOnboardDate || null, plannedOffboardDate: body.plannedOffboardDate || null, actualOffboardDate: body.actualOffboardDate || null, contractStartDate: body.contractStartDate || null, contractEndDate: body.contractEndDate || null, remarks: body.remarks || '' }; appState.clients.unshift(client); createAuditEntry(req.user.email,'Client Created','—',client.clientName); return res.status(201).json({ client: publicClient(client) }); }
    const result = await pool.query(`INSERT INTO clients(client_id,client_name,account_manager,region,industry,revenue,current_status,remarks,planned_onboard_date,actual_onboard_date,planned_offboard_date,actual_offboard_date,contract_start_date,contract_end_date,year,completion,hyperscaler,project_type,project_brief,project_manager,isow,estimated_start_date,estimated_end_date,actual_start_date,actual_end_date,approval_status,pending_payload,pending_create) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING id`, [body.clientId,body.clientName,body.accountManager,body.region || 'North America',body.industry || 'Technology',Number(body.revenue || 0),body.currentStatus || 'Onboarded',body.remarks || '',body.plannedOnboardDate || null,body.actualOnboardDate || null,body.plannedOffboardDate || null,body.actualOffboardDate || null,body.contractStartDate || null,body.contractEndDate || null,body.year || new Date().getFullYear(),Number(body.completion || 0),body.hyperscaler || null,body.projectType || null,body.projectBrief || null,body.projectManager || body.accountManager || null,body.isow || null,body.estimatedStartDate || body.plannedOnboardDate || null,body.estimatedEndDate || body.plannedOffboardDate || null,body.actualStartDate || body.actualOnboardDate || null,body.actualEndDate || body.actualOffboardDate || null,isAdmin ? 'approved' : 'pending',isAdmin ? null : JSON.stringify(body),!isAdmin]);
    await saveServices(pool, result.rows[0].id, body.services); createAuditEntry(req.user.email, isAdmin ? 'Client Created' : 'Client Submitted for Approval', '—', body.clientName); return res.status(isAdmin ? 201 : 202).json({ pending: !isAdmin, client: publicClient(await findDbClient(body.clientId)) });
  } catch (error) { return error.code === '23505' ? res.status(409).json({ message: 'Client ID already exists.' }) : next(error); }
});

router.put('/:clientId', protectRoute, async (req, res, next) => {
  const body = req.body || {};

  try {
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

    const userRoles = req.user?.roles || [];

    const currentUserName =
      `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim();
    const currentUserEmail = req.user?.email || '';

    const projectManagers = String(existingClient.projectManager || '')
      .split(/\s*,\s*/)
      .filter(Boolean);
    const canEdit =
      userRoles.includes('Admin') ||
      userRoles.includes('Operations Team') ||
      existingClient.accountManager === currentUserName ||
      projectManagers.includes(currentUserName) ||
      projectManagers.includes(currentUserEmail);

    if (!canEdit) {
      return res.status(403).json({
        message: 'You are not authorized to edit this client.',
      });
    }

    const isAdmin = userRoles.includes('Admin');
    if (!isAdmin) {
      await pool.query(
        `UPDATE clients SET pending_payload=$1, pending_create=FALSE, approval_status='pending', updated_at=CURRENT_TIMESTAMP WHERE client_id=$2`,
        [JSON.stringify(body), req.params.clientId],
      );
      createAuditEntry(req.user.email, 'Client Change Submitted for Approval', '—', req.params.clientId);
      return res.status(202).json({ pending: true, client: publicClient(existingClient) });
    }

    if (!pool) {
      const index = appState.clients.findIndex(
        (client) =>
          client.clientId === req.params.clientId
      );

      if (index < 0) {
        return res.status(404).json({
          message: 'Client not found.',
        });
      }

      appState.clients[index] = {
        ...appState.clients[index],
        ...body,
        updatedAt: new Date()
          .toISOString()
          .slice(0, 10),
      };

      return res.json({
        client: publicClient(
          appState.clients[index]
        ),
      });
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
         updated_at=CURRENT_TIMESTAMP
       WHERE client_id=$25
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
        req.params.clientId,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        message: 'Client not found.',
      });
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

router.post('/:clientId/approve', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ message: 'Approvals require the database.' });
    const pending = await pool.query('SELECT id,pending_payload FROM clients WHERE client_id=$1 AND approval_status=$2', [req.params.clientId, 'pending']);
    const record = pending.rows[0];
    if (!record) return res.status(404).json({ message: 'Pending client change not found.' });
    const payload = record.pending_payload || {};
    const result = await pool.query(
      `UPDATE clients SET client_name=COALESCE($1,client_name),account_manager=COALESCE($2,account_manager),region=COALESCE($3,region),industry=COALESCE($4,industry),revenue=COALESCE($5,revenue),current_status=COALESCE($6,current_status),remarks=COALESCE($7,remarks),planned_onboard_date=$8,actual_onboard_date=$9,planned_offboard_date=$10,actual_offboard_date=$11,contract_start_date=$12,contract_end_date=$13,year=$14,completion=$15,hyperscaler=$16,project_type=$17,project_brief=$18,project_manager=$19,isow=$20,estimated_start_date=$21,estimated_end_date=$22,actual_start_date=$23,actual_end_date=$24,pending_payload=NULL,approval_status='approved',updated_at=CURRENT_TIMESTAMP WHERE id=$25 RETURNING id`,
      [payload.clientName,payload.accountManager,payload.region,payload.industry,payload.revenue === undefined ? null : Number(payload.revenue),payload.currentStatus,payload.remarks,payload.plannedOnboardDate || null,payload.actualOnboardDate || null,payload.plannedOffboardDate || null,payload.actualOffboardDate || null,payload.contractStartDate || null,payload.contractEndDate || null,payload.year || new Date().getFullYear(),payload.completion === undefined ? 0 : Number(payload.completion),payload.hyperscaler || null,payload.projectType || null,payload.projectBrief || null,payload.projectManager || payload.accountManager || null,payload.isow || null,payload.estimatedStartDate || null,payload.estimatedEndDate || null,payload.actualStartDate || null,payload.actualEndDate || null,record.id],
    );
    if (Array.isArray(payload.services)) await saveServices(pool, record.id, payload.services);
    createAuditEntry(req.user.email, 'Client Change Approved', 'pending', req.params.clientId);
    return res.json({ client: publicClient(await findDbClient(req.params.clientId)) });
  } catch (error) { return next(error); }
});

router.post('/:clientId/reject', protectRoute, requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await getPool().query(`DELETE FROM clients WHERE client_id=$1 AND approval_status='pending' AND pending_create=TRUE RETURNING client_id`, [req.params.clientId]);
    if (!result.rows[0]) {
      const update = await getPool().query(`UPDATE clients SET pending_payload=NULL,approval_status='approved',updated_at=CURRENT_TIMESTAMP WHERE client_id=$1 AND approval_status='pending' RETURNING client_id`, [req.params.clientId]);
      if (!update.rows[0]) return res.status(404).json({ message: 'Pending client change not found.' });
    }
    createAuditEntry(req.user.email, 'Client Change Rejected', 'pending', req.params.clientId);
    return res.json({ rejected: true });
  } catch (error) { return next(error); }
});

router.delete('/:clientId', protectRoute, requireRole('Admin'), async (req, res, next) => { try { const pool = getPool(); if (!pool) { const index = appState.clients.findIndex((client) => client.clientId === req.params.clientId); if (index < 0) return res.status(404).json({ message: 'Client not found.' }); appState.clients.splice(index,1); return res.json({ deleted:true, client:req.params.clientId }); } const result = await pool.query('DELETE FROM clients WHERE client_id=$1 RETURNING client_id',[req.params.clientId]); if (!result.rows[0]) return res.status(404).json({ message:'Client not found.' }); return res.json({ deleted:true, client:result.rows[0].client_id }); } catch (error) { return next(error); } });

export default router;

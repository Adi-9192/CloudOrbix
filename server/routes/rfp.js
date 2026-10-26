import express from 'express';
import ExcelJS from 'exceljs';
import { createNotification, getPool } from '../db.js';
import { protectRoute, requireRole } from '../middleware/auth.js';
import { buildPeriods, periodAllocationKey } from '../lib/rfp-periods.js';
import { normalizeProjectName } from '../../shared/project-name.js';

const router = express.Router();
const resourceTypes = ['Long Term', 'Standard', 'Moderate', 'Experts'];
const currencies = ['INR', 'AED', 'AUD', 'CAD', 'CHF', 'DKK', 'EUR', 'GBP', 'NOK', 'SEK', 'SGD', 'USD'];

router.use(protectRoute);

const isAdmin = (req) => req.user?.roles?.includes('Admin');

function requireDatabase(res) {
  const pool = getPool();
  if (!pool) res.status(503).json({ message: 'Database is not configured.' });
  return pool;
}

function monthDate(value) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? `${value}-01` : null;
}

async function ensureUniqueRfpName(pool, accountName, existingId = null, excludedRequestId = null) {
  const normalizedName = normalizeProjectName(accountName);
  const projectMatches = await pool.query(`
    SELECT TOP (1) id
    FROM rfp_projects
    WHERE LOWER(LTRIM(RTRIM(project_name))) = LOWER(LTRIM(RTRIM($1)))
      AND ($2 IS NULL OR id <> $2)
  `, [normalizedName, existingId]);
  if (projectMatches.rows.length) {
    throw Object.assign(new Error('An RFP estimate with this name already exists. Enter a unique project name.'), { status: 409 });
  }

  const pendingMatches = await pool.query(`
    SELECT TOP (1) id
    FROM rfp_approval_requests
    WHERE status = 'pending'
      AND request_type IN ('create', 'update')
      AND ($2 IS NULL OR project_id IS NULL OR project_id <> $2)
      AND ($3 IS NULL OR id <> $3)
      AND LOWER(LTRIM(RTRIM(CASE WHEN ISJSON(payload) = 1 THEN JSON_VALUE(payload, '$.accountName') END))) = LOWER(LTRIM(RTRIM($1)))
  `, [normalizedName, existingId, excludedRequestId]);
  if (pendingMatches.rows.length) {
    throw Object.assign(new Error('An RFP estimate with this name already exists or is awaiting approval. Enter a unique project name.'), { status: 409 });
  }
}

function validateProject(body, requireCompleteEffort = true) {
  const accountName = String(body?.accountName || body?.projectName || '').trim();
  const clientName = accountName;
  const year = Number(body?.year);
  const currency = String(body?.currency || 'INR').toUpperCase();
  const requestedDate = String(body?.requestedDate || new Date().toISOString().slice(0, 10));
  const durationMonths = Number(body?.durationMonths ?? 0);
  const durationDays = Number(body?.durationDays ?? 0);
  const periods = buildPeriods(requestedDate, durationMonths, durationDays);
  const projectType = String(body?.projectType || '');
  const projectStatus = String(body?.projectStatus || 'Tentative');
  const requestFromBy = String(body?.requestFromBy || '').trim();
  const requestorEmail = String(body?.requestorEmail || '').trim();
  const region = String(body?.region || '').trim();
  const cloud = String(body?.cloud || '').toLowerCase();
  const projectOverview = String(body?.projectOverview || '').trim();
  const assumption = String(body?.assumption || '').trim();
  const outOfScope = String(body?.outOfScope || '').trim();
  const inScope = String(body?.inScope || '').trim();
  const allowance = Number(body?.allowancePercent ?? 0);
  const workingDays = Number(body?.workingDaysPerMonth ?? 22);
  const resources = Array.isArray(body?.resources)
    ? body.resources.flatMap((resource) => {
        const allocations = resource?.allocations || {};
        const legacyDaily = !resource?.planType &&
          durationDays > 0 &&
          Number(resource?.dailyManDays ?? 0) > 0 &&
          Number(allocations.days ?? 0) > 0;
        if (legacyDaily) {
          return [
            {
              ...resource,
              planType: 'monthly',
              dailyManDays: 0,
              allocations: Object.fromEntries(
                Object.entries(allocations).filter(([key]) => key !== 'days'),
              ),
            },
            {
              ...resource,
              planType: 'daily',
              allocations: { days: allocations.days },
            },
          ];
        }
        const planType = resource?.planType === 'daily' ? 'daily' : 'monthly';
        return [{
          ...resource,
          planType,
          dailyManDays: planType === 'daily' && durationDays > 0
            ? resource?.dailyManDays ?? 0
            : 0,
        }];
      })
    : [];

  if (!accountName) return { error: 'Account name is required.' };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'Select a valid estimation year.' };
  if (!currencies.includes(currency)) return { error: 'Select a supported currency.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(Date.parse(`${requestedDate}T00:00:00Z`))) return { error: 'Enter a valid requested date.' };
  if (!Number.isInteger(durationMonths) || durationMonths < 0 || durationMonths > 120 || !Number.isInteger(durationDays) || durationDays < 0 || durationDays > 365 || durationMonths + (durationDays > 0 ? 1 : 0) === 0) return { error: 'Duration must include at least one month or 1 to 365 days.' };
  if (projectType && !['Std', 'Non Std'].includes(projectType)) return { error: 'Select Std or Non Std project type.' };
  if (!['Tentative', 'Completed', 'Project Initiated', 'Cancelled', 'In Discussion', 'Firm'].includes(projectStatus)) return { error: 'Select a valid project status.' };
  if (requestorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestorEmail)) return { error: 'Enter a valid requestor email address.' };
  if (cloud && !['aws', 'azure', 'gcp', 'multi cloud'].includes(cloud)) return { error: 'Select AWS, Azure, GCP, or Multi Cloud.' };
  if (!Number.isFinite(allowance) || allowance < 0 || allowance > 100) return { error: 'Allowance must be between 0 and 100 percent.' };
  if (!Number.isFinite(workingDays) || workingDays <= 0 || workingDays > 31) return { error: 'Working days per month must be greater than 0 and no more than 31.' };
  if (!resources.length) return { error: 'Add at least one resource row.' };

  for (const resource of resources) {
    if (!String(resource?.name || '').trim() || !String(resource?.grade || '').trim()) return { error: 'Every resource needs a name and grade.' };
    if (!resourceTypes.includes(resource.resourceType)) return { error: 'Select a valid resource type for every row.' };
    if (periods.some((period) => {
      const fte = Number(resource.allocations?.[period.key] ?? 0);
      return !Number.isFinite(fte) || fte < 0 || fte > 999.99 || Math.abs(fte * 100 - Math.round(fte * 100)) > 1e-7;
    })) {
      return { error: 'Resource allocation must be between 0 and 999.99 with up to two decimal places.' };
    }
    if (!['monthly', 'daily'].includes(resource.planType)) return { error: 'Select a valid resource plan for every row.' };
    const dailyManDays = Number(resource.dailyManDays ?? 0);
    if (!Number.isFinite(dailyManDays) || dailyManDays < 0 || dailyManDays > durationDays || Math.abs(dailyManDays * 100 - Math.round(dailyManDays * 100)) > 1e-7) {
      return { error: 'Daily man-days must be between 0 and the project duration with up to two decimal places.' };
    }
  }
  if (requireCompleteEffort) {
    for (let index = 0; index < durationMonths; index += 1) {
      if (!resources.some((resource) => resource.planType === 'monthly' && Number(resource.allocations?.[`month-${index + 1}`] ?? 0) > 0)) {
        return { error: 'Enter resource allocations for every project month.' };
      }
    }
    if (durationDays > 0 && !resources.some((resource) => resource.planType === 'daily' && Number(resource.dailyManDays ?? 0) > 0 && Number(resource.allocations?.days ?? 0) > 0)) {
      return { error: 'Complete the daily plan with man-days and FTE effort.' };
    }
  }
  return { value: { accountName, clientName, year, currency, requestedDate, durationMonths, durationDays, periods, projectType, projectStatus, requestFromBy, requestorEmail, region, cloud, projectOverview, assumption, outOfScope, inScope, allowance, workingDays, resources } };
}

async function saveResourceVersion(pool, year, userId, rows) {
  const values = [year, userId];
  const statements = rows.map((row) => {
    const offset = values.length + 1;
    values.push(String(row.grade).trim(), row.resourceType, Number(row.dailyRate));
    return `INSERT INTO resource_rate_cards (version_id, grade, resource_type, daily_rate) VALUES (@versionId, $${offset}, $${offset + 1}, $${offset + 2});`;
  });
  const result = await pool.query(`
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @versionId INT = (SELECT id FROM resource_rate_card_versions WHERE [year] = $1);
      IF @versionId IS NULL
      BEGIN
        INSERT INTO resource_rate_card_versions ([year], created_by, updated_by) VALUES ($1, $2, $2);
        SET @versionId = CAST(SCOPE_IDENTITY() AS INT);
      END
      ELSE UPDATE resource_rate_card_versions SET updated_by = $2, updated_at = SYSUTCDATETIME() WHERE id = @versionId;
      DELETE FROM resource_rate_cards WHERE version_id = @versionId;
      ${statements.join('\n')}
      COMMIT TRANSACTION;
      SELECT @versionId AS id;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
  `, values);
  return result.rows[0];
}

async function saveCurrencyVersion(pool, year, userId, rows) {
  const values = [year, userId];
  const statements = rows.map((row) => {
    const offset = values.length + 1;
    values.push(`${row.currency}/INR`, Number(row.rateToInr));
    return `INSERT INTO currency_exchange_rates (version_id, currency_pair, rate_to_inr) VALUES (@versionId, $${offset}, $${offset + 1});`;
  });
  const result = await pool.query(`
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @versionId INT = (SELECT id FROM currency_exchange_rate_versions WHERE [year] = $1);
      IF @versionId IS NULL
      BEGIN
        INSERT INTO currency_exchange_rate_versions ([year], created_by, updated_by) VALUES ($1, $2, $2);
        SET @versionId = CAST(SCOPE_IDENTITY() AS INT);
      END
      ELSE UPDATE currency_exchange_rate_versions SET updated_by = $2, updated_at = SYSUTCDATETIME() WHERE id = @versionId;
      DELETE FROM currency_exchange_rates WHERE version_id = @versionId;
      ${statements.join('\n')}
      COMMIT TRANSACTION;
      SELECT @versionId AS id;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
  `, values);
  return result.rows[0];
}

router.get('/rates', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const [resourceVersions, resourceRates, currencyVersions, exchangeRates] = await Promise.all([
      pool.query('SELECT v.id, v.[year], v.created_at, v.updated_at, u.email AS updated_by FROM resource_rate_card_versions v LEFT JOIN users u ON u.id = v.updated_by ORDER BY v.[year] DESC'),
      pool.query('SELECT v.[year], r.grade, r.resource_type, r.daily_rate FROM resource_rate_cards r JOIN resource_rate_card_versions v ON v.id = r.version_id ORDER BY v.[year] DESC, r.grade, r.resource_type'),
      pool.query('SELECT v.id, v.[year], v.created_at, v.updated_at, u.email AS updated_by FROM currency_exchange_rate_versions v LEFT JOIN users u ON u.id = v.updated_by ORDER BY v.[year] DESC'),
      pool.query('SELECT v.[year], r.currency_pair, r.rate_to_inr FROM currency_exchange_rates r JOIN currency_exchange_rate_versions v ON v.id = r.version_id ORDER BY v.[year] DESC, r.currency_pair'),
    ]);
    return res.json({
      resourceVersions: resourceVersions.rows,
      resourceRates: resourceRates.rows,
      currencyVersions: currencyVersions.rows,
      exchangeRates: exchangeRates.rows,
      resourceTypes,
      currencies,
    });
  } catch (error) { return next(error); }
});

router.get('/rates/options/:year', async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const year = Number(req.params.year);
    const currency = String(req.query.currency || 'INR').toUpperCase();
    if (!currencies.includes(currency)) return res.status(400).json({ message: 'Select a supported currency.' });
    const [gradesResult, yearsResult] = await Promise.all([
      pool.query('SELECT DISTINCT r.grade FROM resource_rate_cards r JOIN resource_rate_card_versions v ON v.id = r.version_id WHERE v.[year] = $1 ORDER BY r.grade', [year]),
      pool.query(`
        SELECT DISTINCT v.[year] AS year
        FROM resource_rate_card_versions v
        WHERE EXISTS (SELECT 1 FROM resource_rate_cards r WHERE r.version_id = v.id)
          AND ($2 = 'INR' OR EXISTS (
            SELECT 1
            FROM currency_exchange_rate_versions cv
            JOIN currency_exchange_rates cr ON cr.version_id = cv.id
            WHERE cv.[year] = v.[year] AND cr.currency_pair = $2 + '/INR'
          ))
        ORDER BY v.[year] DESC
      `, [year, currency]),
    ]);
    return res.json({
      grades: gradesResult.rows.map((row) => row.grade),
      years: yearsResult.rows.map((row) => Number(row.year)),
      resourceTypes,
      currencies,
    });
  } catch (error) { return next(error); }
});

router.post('/rates/resource/:year', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const year = Number(req.params.year);
    const rows = Array.isArray(req.body?.rates) ? req.body.rates : [];
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !rows.length) return res.status(400).json({ message: 'A valid year and at least one rate are required.' });
    const seen = new Set();
    for (const row of rows) {
      const key = `${String(row.grade || '').trim()}|${row.resourceType}`;
      if (!String(row.grade || '').trim() || !resourceTypes.includes(row.resourceType) || row.dailyRate === '' || row.dailyRate === null || row.dailyRate === undefined || !Number.isFinite(Number(row.dailyRate)) || Number(row.dailyRate) < 0 || seen.has(key)) {
        return res.status(400).json({ message: 'Rate rows must have unique grades, valid resource types, and non-negative daily rates.' });
      }
      seen.add(key);
    }
    await saveResourceVersion(pool, year, req.user.id, rows);
    return res.json({ saved: true, year });
  } catch (error) {
    return next(error);
  }
});

router.post('/rates/resource/:year/clone', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const targetYear = Number(req.params.year);
    const sourceYear = Number(req.body?.sourceYear);
    if (!Number.isInteger(targetYear) || !Number.isInteger(sourceYear) || targetYear < 2000 || targetYear > 2100 || sourceYear < 2000 || sourceYear > 2100) return res.status(400).json({ message: 'Select valid source and target years.' });
    const source = await pool.query('SELECT grade, resource_type, daily_rate FROM resource_rate_cards r JOIN resource_rate_card_versions v ON v.id = r.version_id WHERE v.[year] = $1', [sourceYear]);
    if (!source.rows.length) return res.status(404).json({ message: 'Source resource rate version was not found.' });
    req.body.rates = source.rows.map((row) => ({ grade: row.grade, resourceType: row.resource_type, dailyRate: row.daily_rate }));
    req.params.year = String(targetYear);
    await saveResourceVersion(pool, targetYear, req.user.id, req.body.rates);
    return res.json({ saved: true, year: targetYear, clonedFrom: sourceYear });
  } catch (error) { return next(error); }
});

router.post('/rates/currency/:year', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const year = Number(req.params.year);
    const rows = Array.isArray(req.body?.rates) ? req.body.rates : [];
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !rows.length) return res.status(400).json({ message: 'A valid year and at least one currency rate are required.' });
    const seen = new Set();
    for (const row of rows) {
      if (!currencies.includes(row.currency) || row.currency === 'INR' || row.rateToInr === '' || row.rateToInr === null || row.rateToInr === undefined || !Number.isFinite(Number(row.rateToInr)) || Number(row.rateToInr) <= 0 || seen.has(row.currency)) return res.status(400).json({ message: 'Currency rates must be positive, unique, and use supported currencies.' });
      seen.add(row.currency);
    }
    await saveCurrencyVersion(pool, year, req.user.id, rows);
    return res.json({ saved: true, year });
  } catch (error) {
    return next(error);
  }
});

router.post('/rates/currency/:year/clone', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const year = Number(req.params.year);
    const sourceYear = Number(req.body?.sourceYear);
    if (!Number.isInteger(year) || !Number.isInteger(sourceYear) || year < 2000 || year > 2100 || sourceYear < 2000 || sourceYear > 2100) return res.status(400).json({ message: 'Select valid source and target years.' });
    const source = await pool.query('SELECT r.currency_pair, r.rate_to_inr FROM currency_exchange_rates r JOIN currency_exchange_rate_versions v ON v.id = r.version_id WHERE v.[year] = $1', [sourceYear]);
    if (!source.rows.length) return res.status(404).json({ message: 'Source currency rate version was not found.' });
    await saveCurrencyVersion(pool, year, req.user.id, source.rows.map((row) => ({ currency: row.currency_pair.split('/')[0], rateToInr: row.rate_to_inr })));
    return res.json({ saved: true, year });
  } catch (error) { return next(error); }
});

router.get('/projects', async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const result = await pool.query('SELECT p.id, p.project_name, p.client_name, p.[year], p.currency_code, p.status, p.project_status, p.initiated_at, p.requested_date, p.region, p.project_type, p.cloud, p.request_from_by, p.requestor_email, p.duration_months, p.duration_days, p.project_overview, p.assumption, p.out_of_scope, p.in_scope, p.updated_at, s.grand_total_inr FROM rfp_projects p LEFT JOIN rfp_cost_summary s ON s.project_id = p.id ORDER BY p.updated_at DESC');
    return res.json({ projects: result.rows });
  } catch (error) { return next(error); }
});

router.post('/calculate', async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  const validation = validateProject(req.body, false);
  if (validation.error) return res.status(400).json({ message: validation.error });
  const data = validation.value;
  try {
    const [rateResult, exchangeResult] = await Promise.all([
      pool.query('SELECT r.grade, r.resource_type, r.daily_rate FROM resource_rate_cards r JOIN resource_rate_card_versions v ON v.id = r.version_id WHERE v.[year] = $1', [data.year]),
      data.currency === 'INR' ? Promise.resolve({ rows: [{ rate_to_inr: 1 }] }) : pool.query('SELECT r.rate_to_inr FROM currency_exchange_rates r JOIN currency_exchange_rate_versions v ON v.id = r.version_id WHERE v.[year] = $1 AND r.currency_pair = $2', [data.year, `${data.currency}/INR`]),
    ]);
    const rateMap = new Map(rateResult.rows.map((row) => [`${row.grade}|${row.resource_type}`, Number(row.daily_rate)]));
    const resourceCosts = data.resources.map((resource, index) => {
      const rate = rateMap.get(`${String(resource.grade).trim()}|${resource.resourceType}`);
      let total = 0;
      if (rate !== undefined && resource.planType === 'monthly') {
        for (const period of data.periods) {
          if (data.durationMonths > 0 && period.key.startsWith('month-')) total += rate * data.workingDays * Number(resource.allocations?.[period.key] ?? 0);
        }
      } else if (rate !== undefined && resource.planType === 'daily') {
        total += rate * Number(resource.dailyManDays ?? 0) * Number(resource.allocations?.days ?? 0);
      }
      return { id: resource.id ?? String(index), total, missingRate: Boolean(resource.grade && rate === undefined) };
    });
    const baseCost = resourceCosts.reduce((sum, row) => sum + row.total, 0);
    const allowanceCost = baseCost * data.allowance / 100;
    const grandTotal = baseCost + allowanceCost;
    const exchangeRate = Number(exchangeResult.rows[0]?.rate_to_inr || 0);
    return res.json({ resourceCosts, baseCost, allowanceCost, grandTotal, exchangeRate, selectedTotal: exchangeRate ? grandTotal / exchangeRate : 0 });
  } catch (error) { return next(error); }
});

router.get('/approvals', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const result = await pool.query(`SELECT ar.id, ar.request_type, ar.project_id, ar.payload, ar.created_at, p.project_name, u.email AS requester_email, u.first_name, u.last_name FROM rfp_approval_requests ar LEFT JOIN rfp_projects p ON p.id = ar.project_id JOIN users u ON u.id = ar.requester_id WHERE ar.status = 'pending' ORDER BY ar.created_at DESC`);
    return res.json({ requests: result.rows.map((row) => ({ ...row, payload: row.payload ? JSON.parse(row.payload) : null, requester_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.requester_email })) });
  } catch (error) { return next(error); }
});

router.post('/approvals/:id/decision', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  const decision = req.body?.decision;
  if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Decision must be approve or reject.' });
  try {
    const result = await pool.query(`SELECT ar.*, u.email AS requester_email FROM rfp_approval_requests ar JOIN users u ON u.id = ar.requester_id WHERE ar.id = $1 AND ar.status = 'pending'`, [Number(req.params.id)]);
    const request = result.rows[0];
    if (!request) return res.status(404).json({ message: 'Pending RFP approval request was not found.' });
    let applied = null;
    if (decision === 'approve') {
      if (request.request_type === 'delete') {
        const deleted = await pool.query('DELETE FROM rfp_projects OUTPUT DELETED.id AS id WHERE id = $1', [request.project_id]);
        if (!deleted.rowCount) return res.status(404).json({ message: 'Estimate was not found.' });
      } else {
        const payload = typeof request.payload === 'string' ? JSON.parse(request.payload) : request.payload;
        const validation = validateProject(payload);
        if (validation.error) return res.status(400).json({ message: validation.error });
        applied = await persistProject(pool, req.user.id, validation.value, 'Submitted', request.request_type === 'update' ? request.project_id : null, request.id);
      }
    }
    const updated = await pool.query(`UPDATE rfp_approval_requests SET status = $1, decided_at = SYSUTCDATETIME(), decided_by = $2, project_id = COALESCE(project_id, $4) OUTPUT INSERTED.id AS id WHERE id = $3 AND status = 'pending'`, [decision === 'approve' ? 'approved' : 'rejected', req.user.id, request.id, applied?.id || null]);
    if (!updated.rowCount) return res.status(409).json({ message: 'This RFP request has already been decided.' });
    await createNotification(request.requester_email, 'approval', `RFP request ${decision === 'approve' ? 'approved' : 'rejected'}`, `Your RFP ${request.request_type} request was ${decision === 'approve' ? 'approved' : 'rejected'} by ${req.user.email}.`, { action: `rfp_${decision}`, requestId: String(request.id) });
    return res.json({ requestId: request.id, decision, result: applied });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
});

router.delete('/projects/:id', async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const id = Number(req.params.id);
    const projectResult = await pool.query('SELECT id, project_name FROM rfp_projects WHERE id = $1', [id]);
    const project = projectResult.rows[0];
    if (!project) return res.status(404).json({ message: 'Estimate was not found.' });
    if (isAdmin(req)) {
      await pool.query('DELETE FROM rfp_projects WHERE id = $1', [id]);
      return res.json({ deleted: true, id });
    }
    const pending = await pool.query(`SELECT id FROM rfp_approval_requests WHERE project_id = $1 AND request_type = 'delete' AND status = 'pending'`, [id]);
    if (pending.rows.length) return res.status(409).json({ message: 'A delete request for this estimate is already pending.' });
    const saved = await pool.query(`INSERT INTO rfp_approval_requests (request_type, project_id, payload, requester_id) OUTPUT INSERTED.id AS id VALUES ('delete', $1, $2, $3)`, [id, JSON.stringify({ projectName: project.project_name }), req.user.id]);
    await notifyRfpAdmins(saved.rows[0].id, 'delete', project.project_name, req.user);
    return res.status(202).json({ pending: true, requestId: saved.rows[0].id, message: 'Delete request submitted for administrator approval.' });
  } catch (error) { return next(error); }
});

router.delete('/rates/resource/:year', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const year = Number(req.params.year);
    const used = await pool.query('SELECT TOP 1 id FROM rfp_projects WHERE [year] = $1', [year]);
    if (used.rows.length) return res.status(409).json({ message: `The ${year} rate version is in use by saved estimates and cannot be deleted.` });
    await pool.query('DELETE FROM resource_rate_card_versions WHERE [year] = $1', [year]);
    return res.json({ deleted: true, year });
  } catch (error) { return next(error); }
});

router.delete('/rates/currency/:year', requireRole('Admin'), async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const year = Number(req.params.year);
    const used = await pool.query('SELECT TOP 1 id FROM rfp_projects WHERE [year] = $1 AND currency_code <> \'INR\'', [year]);
    if (used.rows.length) return res.status(409).json({ message: `The ${year} exchange version is in use by saved estimates and cannot be deleted.` });
    await pool.query('DELETE FROM currency_exchange_rate_versions WHERE [year] = $1', [year]);
    return res.json({ deleted: true, year });
  } catch (error) { return next(error); }
});

router.get('/projects/:id', async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const id = Number(req.params.id);
    const project = await pool.query('SELECT p.*, s.base_cost_inr, s.allowance_cost_inr, s.grand_total_inr, s.selected_currency_total, s.exchange_rate FROM rfp_projects p LEFT JOIN rfp_cost_summary s ON s.project_id = p.id WHERE p.id = $1', [id]);
    if (!project.rows[0]) return res.status(404).json({ message: 'Estimate was not found.' });
    const resources = await pool.query('SELECT id, resource_name, grade, resource_type, resource_plan_type, daily_man_days, sort_order FROM rfp_resources WHERE project_id = $1 ORDER BY sort_order, id', [id]);
    const allocations = await pool.query('SELECT a.resource_id, CONVERT(char(7), a.allocation_month, 126) AS month, a.fte FROM rfp_resource_monthly_allocations a JOIN rfp_resources r ON r.id = a.resource_id WHERE r.project_id = $1', [id]);
    const allocationMap = new Map();
    const requestedDate = project.rows[0].requested_date;
    const durationMonths = Number(project.rows[0].duration_months || 0);
    const durationDays = Number(project.rows[0].duration_days || 0);
    allocations.rows.forEach((row) => {
      const rowAllocations = allocationMap.get(row.resource_id) || {};
      const key = periodAllocationKey(row.month, requestedDate, durationMonths, durationDays);
      if (key) rowAllocations[key] = Number(row.fte);
      allocationMap.set(row.resource_id, rowAllocations);
    });
    return res.json({ project: project.rows[0], resources: resources.rows.map((row) => ({ id: row.id, planType: String(row.resource_plan_type || 'Monthly').toLowerCase(), name: row.resource_name, grade: row.grade, resourceType: row.resource_type, dailyManDays: Number(row.daily_man_days || 0), allocations: allocationMap.get(row.id) || {} })) });
  } catch (error) { return next(error); }
});

async function persistProject(pool, userId, data, status, existingId = null, excludedRequestId = null) {
  await ensureUniqueRfpName(pool, data.accountName, existingId, excludedRequestId);
  const rateResult = await pool.query('SELECT r.grade, r.resource_type, r.daily_rate FROM resource_rate_cards r JOIN resource_rate_card_versions v ON v.id = r.version_id WHERE v.[year] = $1', [data.year]);
  if (!rateResult.rows.length) throw Object.assign(new Error(`No resource rate card exists for ${data.year}. Add rates in Resource Rate Card first.`), { status: 400 });
  const rateMap = new Map(rateResult.rows.map((row) => [`${row.grade}|${row.resource_type}`, Number(row.daily_rate)]));
  let baseCost = 0;
  for (const resource of data.resources) {
    const rate = rateMap.get(`${String(resource.grade).trim()}|${resource.resourceType}`);
    if (rate === undefined) throw Object.assign(new Error(`No ${resource.resourceType} rate exists for grade ${resource.grade} in ${data.year}.`), { status: 400 });
    for (const period of data.periods) {
      if (resource.planType === 'monthly' && data.durationMonths > 0 && period.key.startsWith('month-')) baseCost += rate * data.workingDays * Number(resource.allocations?.[period.key] ?? 0);
      if (resource.planType === 'daily' && period.key === 'days') baseCost += rate * Number(resource.dailyManDays ?? 0) * Number(resource.allocations?.days ?? 0);
      }
  }
  const allowanceCost = baseCost * data.allowance / 100;
  const exchangeResult = data.currency === 'INR' ? { rows: [{ rate_to_inr: 1 }] } : await pool.query('SELECT r.rate_to_inr FROM currency_exchange_rates r JOIN currency_exchange_rate_versions v ON v.id = r.version_id WHERE v.[year] = $1 AND r.currency_pair = $2', [data.year, `${data.currency}/INR`]);
  const exchangeRate = Number(exchangeResult.rows[0]?.rate_to_inr);
  if (!exchangeRate) throw Object.assign(new Error(`No ${data.currency}/INR exchange rate exists for ${data.year}.`), { status: 400 });
  const grandTotal = baseCost + allowanceCost;
  const currencyTotal = grandTotal / exchangeRate;
  const startMonth = data.periods[0].month;
  const endMonth = data.periods[data.periods.length - 1].month;
  const initiatedAt = data.projectStatus === 'Project Initiated' ? new Date() : null;
  const values = [data.accountName, data.clientName, data.year, data.currency, monthDate(startMonth), monthDate(endMonth), data.allowance, data.workingDays, false, '', status, userId, data.projectType || null, data.projectStatus, data.requestFromBy || null, data.requestorEmail || null, data.requestedDate, data.region || null, data.cloud || null, data.projectOverview || null, data.assumption || null, data.outOfScope || null, data.inScope || null, data.durationMonths, data.durationDays, initiatedAt];
  const sql = [];
  if (existingId) {
    values.push(existingId);
    sql.push('UPDATE rfp_projects SET project_name = $1, client_name = $2, [year] = $3, currency_code = $4, start_month = $5, end_month = $6, allowance_percent = $7, working_days_per_month = $8, end_month_half_month = $9, notes = $10, status = $11, updated_by = $12, project_type = $13, project_status = $14, request_from_by = $15, requestor_email = $16, requested_date = $17, region = $18, cloud = $19, project_overview = $20, assumption = $21, out_of_scope = $22, in_scope = $23, duration_months = $24, duration_days = $25, initiated_at = CASE WHEN $14 = N\'Project Initiated\' AND (project_status <> N\'Project Initiated\' OR initiated_at IS NULL) THEN COALESCE(initiated_at, $26) ELSE initiated_at END, updated_at = SYSUTCDATETIME() WHERE id = $27; IF @@ROWCOUNT = 0 THROW 50001, \'Estimate not found\', 1; DELETE FROM rfp_resources WHERE project_id = $27;');
  } else {
    sql.push('DECLARE @newProjectId INT; INSERT INTO rfp_projects (project_name, client_name, [year], currency_code, start_month, end_month, allowance_percent, working_days_per_month, end_month_half_month, notes, status, created_by, updated_by, project_type, project_status, request_from_by, requestor_email, requested_date, region, cloud, project_overview, assumption, out_of_scope, in_scope, duration_months, duration_days, initiated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26); SET @newProjectId = CAST(SCOPE_IDENTITY() AS INT);');
  }
  const projectRef = existingId ? '$27' : '@newProjectId';
  let allocationParameters = values.length + 1;
  for (let index = 0; index < data.resources.length; index += 1) {
    const resource = data.resources[index];
    const resourceValues = [String(resource.name).trim(), String(resource.grade).trim(), resource.resourceType, resource.planType, Number(resource.dailyManDays ?? 0), index];
    sql.push(`DECLARE @resourceId${index} INT; INSERT INTO rfp_resources (project_id, resource_name, grade, resource_type, resource_plan_type, daily_man_days, sort_order) VALUES (${projectRef}, $${allocationParameters}, $${allocationParameters + 1}, $${allocationParameters + 2}, $${allocationParameters + 3}, $${allocationParameters + 4}, $${allocationParameters + 5}); SET @resourceId${index} = CAST(SCOPE_IDENTITY() AS INT);`);
    values.push(...resourceValues);
    allocationParameters += resourceValues.length;
    for (const period of data.periods) {
      if (
        (resource.planType === 'monthly' && (!data.durationMonths || !period.key.startsWith('month-'))) ||
        (resource.planType === 'daily' && period.key !== 'days')
      ) continue;
      const fte = Number(resource.allocations?.[period.key] ?? 0);
      if (fte === 0) continue;
      sql.push(`INSERT INTO rfp_resource_monthly_allocations (resource_id, allocation_month, fte) VALUES (@resourceId${index}, $${allocationParameters}, $${allocationParameters + 1});`);
      values.push(monthDate(period.month), fte);
      allocationParameters += 2;
    }
  }
  sql.push(`MERGE rfp_cost_summary AS target USING (SELECT ${projectRef} AS project_id) AS source ON target.project_id = source.project_id WHEN MATCHED THEN UPDATE SET base_cost_inr = $${allocationParameters}, allowance_cost_inr = $${allocationParameters + 1}, grand_total_inr = $${allocationParameters + 2}, selected_currency_total = $${allocationParameters + 3}, exchange_rate = $${allocationParameters + 4}, updated_at = SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT (project_id, base_cost_inr, allowance_cost_inr, grand_total_inr, selected_currency_total, exchange_rate) VALUES (source.project_id, $${allocationParameters}, $${allocationParameters + 1}, $${allocationParameters + 2}, $${allocationParameters + 3}, $${allocationParameters + 4});`);
  sql.push(`UPDATE clients SET revenue = $${allocationParameters + 2}, updated_at = SYSUTCDATETIME() WHERE rfp_project_id = ${projectRef};`);
  values.push(baseCost, allowanceCost, grandTotal, currencyTotal, exchangeRate);
  sql.push(existingId ? 'SELECT $27 AS id;' : 'SELECT @newProjectId AS id;');
  const batch = `BEGIN TRY BEGIN TRANSACTION; ${sql.join('\n')} COMMIT TRANSACTION; END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION; THROW; END CATCH;`;
  const result = await pool.query(batch, values);
  return { id: existingId || result.rows[0]?.id, status, initiatedAt, summary: { baseCostInr: baseCost, allowanceCostInr: allowanceCost, grandTotalInr: grandTotal, selectedCurrencyTotal: currencyTotal, exchangeRate } };
}

async function notifyRfpAdmins(requestId, requestType, projectName, requester) {
  const pool = getPool();
  const recipients = pool ? (await pool.query('SELECT DISTINCT u.email FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.name = $1 AND u.is_active = 1', ['Admin'])).rows.map((row) => row.email) : [];
  const requesterName = `${requester.firstName || ''} ${requester.lastName || ''}`.trim() || requester.email;
  await Promise.all(recipients.map((email) => createNotification(email, 'approval', 'RFP approval requested', `${requesterName} requested ${requestType} approval for ${projectName}.`, { action: 'rfp_approval', requestId: String(requestId) })));
}

async function saveProject(req, res, next, existingId = null) {
  const pool = requireDatabase(res);
  if (!pool) return;
  const validation = validateProject(req.body);
  if (validation.error) return res.status(400).json({ message: validation.error });
  const data = validation.value;
  try {
    await ensureUniqueRfpName(pool, data.accountName, existingId);
    if (!isAdmin(req)) {
      if (existingId) {
        const existing = await pool.query('SELECT id FROM rfp_projects WHERE id = $1', [existingId]);
        if (!existing.rows[0]) return res.status(404).json({ message: 'Estimate was not found.' });
        const pending = await pool.query(`SELECT id FROM rfp_approval_requests WHERE project_id = $1 AND request_type IN ('update', 'delete') AND status = 'pending'`, [existingId]);
        if (pending.rows.length) return res.status(409).json({ message: 'A change or delete request for this estimate is already pending.' });
      }
      const requestType = existingId ? 'update' : 'create';
      const saved = await pool.query('INSERT INTO rfp_approval_requests (request_type, project_id, payload, requester_id) OUTPUT INSERTED.id AS id VALUES ($1, $2, $3, $4)', [requestType, existingId, JSON.stringify(req.body), req.user.id]);
      await notifyRfpAdmins(saved.rows[0].id, requestType, data.accountName, req.user);
      return res.status(202).json({ pending: true, requestId: saved.rows[0].id, message: 'Estimate submitted for administrator approval.' });
    }
    const result = await persistProject(pool, req.user.id, data, 'Submitted', existingId);
    return res.status(existingId ? 200 : 201).json({ saved: true, ...result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
}

router.post('/projects', (req, res, next) => saveProject(req, res, next));
router.put('/projects/:id', (req, res, next) => saveProject(req, res, next, Number(req.params.id)));

router.post('/projects/:id/duplicate', async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const project = await pool.query('SELECT * FROM rfp_projects WHERE id = $1', [Number(req.params.id)]);
    if (!project.rows[0]) return res.status(404).json({ message: 'Estimate was not found.' });
    const resources = await pool.query('SELECT id, resource_name, grade, resource_type, resource_plan_type, daily_man_days FROM rfp_resources WHERE project_id = $1 ORDER BY sort_order, id', [Number(req.params.id)]);
    const allocations = await pool.query('SELECT a.resource_id, CONVERT(char(7), a.allocation_month, 126) AS month, a.fte FROM rfp_resource_monthly_allocations a JOIN rfp_resources r ON r.id = a.resource_id WHERE r.project_id = $1', [Number(req.params.id)]);
    const source = project.rows[0];
    const durationMonths = Number(source.duration_months || 0);
    const durationDays = Number(source.duration_days || 0);
    const mappedResources = resources.rows.map((resource) => ({
      name: resource.resource_name,
      grade: resource.grade,
      resourceType: resource.resource_type,
      planType: String(resource.resource_plan_type || 'Monthly').toLowerCase(),
      dailyManDays: Number(resource.daily_man_days || 0),
      allocations: Object.fromEntries(allocations.rows.filter((item) => item.resource_id === resource.id).flatMap((item) => {
        const key = periodAllocationKey(item.month, source.requested_date, durationMonths, durationDays);
        return key ? [[key, Number(item.fte)]] : [];
      })),
    }));
    const body = {
      accountName: `${source.project_name} (Copy)`,
      year: source.year,
      currency: source.currency_code,
      projectType: source.project_type,
      projectStatus: source.project_status,
      requestFromBy: source.request_from_by,
      requestorEmail: source.requestor_email,
      requestedDate: new Date(source.requested_date).toISOString().slice(0, 10),
      region: source.region,
      cloud: source.cloud,
      projectOverview: source.project_overview,
      assumption: source.assumption,
      outOfScope: source.out_of_scope,
      inScope: source.in_scope,
      durationMonths,
      durationDays,
      allowancePercent: source.allowance_percent,
      workingDaysPerMonth: source.working_days_per_month,
      resources: mappedResources,
    };
    req.body = body;
    return saveProject(req, res, next);
  } catch (error) { return next(error); }
});

router.get('/projects/:id/export.xlsx', async (req, res, next) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const projectResponse = await pool.query('SELECT * FROM rfp_projects WHERE id = $1', [Number(req.params.id)]);
    if (!projectResponse.rows[0]) return res.status(404).json({ message: 'Estimate was not found.' });
    const project = projectResponse.rows[0];
    const resourcesResponse = await pool.query('SELECT r.id, r.resource_name, r.grade, r.resource_type, r.resource_plan_type, r.daily_man_days, rr.daily_rate FROM rfp_resources r LEFT JOIN resource_rate_card_versions v ON v.[year] = $1 LEFT JOIN resource_rate_cards rr ON rr.version_id = v.id AND rr.grade = r.grade AND rr.resource_type = r.resource_type WHERE r.project_id = $2 ORDER BY r.sort_order, r.id', [project.year, Number(req.params.id)]);
    const allocationsResponse = await pool.query('SELECT a.resource_id, CONVERT(char(7), a.allocation_month, 126) AS month, a.fte FROM rfp_resource_monthly_allocations a JOIN rfp_resources r ON r.id = a.resource_id WHERE r.project_id = $1', [Number(req.params.id)]);
    const periods = buildPeriods(project.requested_date, Number(project.duration_months || 0), Number(project.duration_days || 0));
    const allocations = new Map();
    allocationsResponse.rows.forEach((row) => {
      const item = allocations.get(row.resource_id) || {};
      const key = periodAllocationKey(row.month, project.requested_date, Number(project.duration_months || 0), Number(project.duration_days || 0));
      if (key) item[key] = Number(row.fte);
      allocations.set(row.resource_id, item);
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('RFP Estimate', { views: [{ state: 'frozen', xSplit: 4, ySplit: 1 }] });
    sheet.addRow(['Account Name', project.project_name]);
    sheet.addRow(['Request From/By', project.request_from_by || '']);
    sheet.addRow(['Year', project.year, 'Currency', project.currency_code]);
    sheet.addRow(['Project Status', project.project_status, 'Requested Date', new Date(project.requested_date).toISOString().slice(0, 10)]);
    sheet.addRow([]);
    const monthlyPeriods = Number(project.duration_months || 0) > 0
      ? periods.filter((period) => period.key.startsWith('month-'))
      : [];
    sheet.addRow(['Resource Plan', 'Resource Name', 'Grade', 'Resource Type', ...monthlyPeriods.map((period) => period.label), ...(Number(project.duration_days || 0) > 0 ? ['Man Days', 'FTE Effort', 'Total Daily Effort (Man Days)'] : []), 'Total Cost (INR)']);
    let baseCost = 0;
    const totalFte = Object.fromEntries(monthlyPeriods.map((period) => [period.key, 0]));
    let totalDailyEffort = 0;
    for (const resource of resourcesResponse.rows) {
      const rowAllocations = allocations.get(resource.id) || {};
      const isDaily = String(resource.resource_plan_type || 'Monthly').toLowerCase() === 'daily';
      const monthlyCosts = isDaily ? [] : monthlyPeriods.map((period) => Number(resource.daily_rate || 0) * Number(project.working_days_per_month) * Number(rowAllocations[period.key] || 0));
      const dailyEffort = isDaily ? Number(resource.daily_man_days || 0) * Number(rowAllocations.days || 0) : 0;
      const rowCost = monthlyCosts.reduce((sum, cost) => sum + cost, 0) + Number(resource.daily_rate || 0) * dailyEffort;
      baseCost += rowCost;
      if (!isDaily) monthlyPeriods.forEach((period) => { totalFte[period.key] += Number(rowAllocations[period.key] || 0); });
      totalDailyEffort += dailyEffort;
      sheet.addRow([isDaily ? 'Daily' : 'Monthly', resource.resource_name, resource.grade, resource.resource_type, ...monthlyPeriods.map((period) => isDaily ? 0 : rowAllocations[period.key] || 0), ...(Number(project.duration_days || 0) > 0 ? [isDaily ? Number(resource.daily_man_days || 0) : 0, isDaily ? Number(rowAllocations.days || 0) : 0, dailyEffort] : []), rowCost]);
    }
    const allowanceCost = baseCost * Number(project.allowance_percent) / 100;
    const grandTotal = baseCost + allowanceCost;
    const fteRow = sheet.addRow(['Total FTE', '', '', '', ...monthlyPeriods.map((period) => totalFte[period.key]), ...(Number(project.duration_days || 0) > 0 ? ['', '', totalDailyEffort] : []), grandTotal]);
    fteRow.font = { bold: true };
    const exportExchange = project.currency_code === 'INR' ? 1 : Number((await pool.query('SELECT r.rate_to_inr FROM currency_exchange_rates r JOIN currency_exchange_rate_versions v ON v.id = r.version_id WHERE v.[year] = $1 AND r.currency_pair = $2', [project.year, `${project.currency_code}/INR`])).rows[0]?.rate_to_inr || 0);
    sheet.addRow([]);
    sheet.addRow(['Base Resource Cost (INR)', baseCost]);
    sheet.addRow([`Allowance (${project.allowance_percent}%) (INR)`, allowanceCost]);
    sheet.addRow(['Grand Total (INR)', grandTotal]);
    sheet.addRow([`${project.currency_code} Total`, exportExchange ? grandTotal / exportExchange : 'Exchange rate not configured']);
    sheet.columns.forEach((column, index) => { column.width = index < 4 ? 22 : 14; });
    sheet.getRow(6).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173F35' } };
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rfp-estimate-${project.id}.xlsx"`);
    return res.send(buffer);
  } catch (error) { return next(error); }
});

export default router;
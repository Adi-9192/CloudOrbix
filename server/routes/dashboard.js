import express from 'express';
import { appState, getPool } from '../db.js';
import {
  calculateDashboardProjectBreakdown,
  calculateDashboardSummary,
} from '../lib/dashboard-metrics.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();
const colors = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];
const approvedClients = "COALESCE(approval_status, 'approved') = 'approved'";
const projectBreakdownColumns = {
  status: 'current_status',
  region: 'region',
  hyperscaler: 'hyperscaler',
  projectType: 'project_type',
};
const rfpBreakdownColumns = {
  status: 'project_status',
  projectType: 'project_type',
  region: 'region',
};

function getPeriodExpressions(period) {
  const expressions = {
    Weekly: {
      start: (date) => `DATEADD(day, -(DATEDIFF(day, '19000101', CAST(${date} AS date)) % 7), CAST(${date} AS date))`,
      label: "CONCAT('Week of ', FORMAT(period_start, 'dd MMM yyyy'))",
    },
    Monthly: {
      start: (date) => `DATEFROMPARTS(YEAR(${date}), MONTH(${date}), 1)`,
      label: "FORMAT(period_start, 'MMM yyyy')",
    },
    Quarterly: {
      start: (date) => `DATEFROMPARTS(YEAR(${date}), ((DATEPART(QUARTER, ${date}) - 1) * 3) + 1, 1)`,
      label: "CONCAT('Q', DATEPART(QUARTER, period_start), ' ', YEAR(period_start))",
    },
    Yearly: {
      start: (date) => `DATEFROMPARTS(YEAR(${date}), 1, 1)`,
      label: "FORMAT(period_start, 'yyyy')",
    },
  };
  return expressions[period];
}

router.get('/', protectRoute, async (req, res, next) => {
  try {
    const period = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'].includes(req.query.period)
      ? req.query.period
      : 'Monthly';
    const yearParam = String(req.query.year ?? 'all').trim().toLowerCase();
    if (yearParam !== 'all' && !/^\d{4}$/.test(yearParam)) {
      return res.status(400).json({ message: 'Project year must be a four-digit year or "all".' });
    }
    const selectedYear = yearParam === 'all' ? null : Number(yearParam);
    const groupBy = String(req.query.groupBy || 'status');
    const groupColumn = projectBreakdownColumns[groupBy];
    if (!groupColumn) {
      return res.status(400).json({ message: 'Unsupported project breakdown field.' });
    }
    const rfpGroupBy = String(req.query.rfpGroupBy || 'status');
    const rfpGroupColumn = rfpBreakdownColumns[rfpGroupBy];
    if (!rfpGroupColumn) {
      return res.status(400).json({ message: 'Unsupported RFP breakdown field.' });
    }
    const periodExpressions = getPeriodExpressions(period);
    const pool = getPool();

    if (!pool) {
      const approved = appState.clients.filter(
        (client) => String(client.approvalStatus || 'approved').toLowerCase() === 'approved',
      );
      const availableYears = [...new Set(approved.map((client) => Number(client.year)).filter(Number.isInteger))].sort((a, b) => b - a);
      const clients = selectedYear === null
        ? approved
        : approved.filter((client) => Number(client.year) === selectedYear);
      const clientKeys = new Set(clients.flatMap((client) => [client.id, client.clientId].filter((id) => id !== undefined && id !== null).map(String)));
      const risks = selectedYear === null
        ? appState.risks || []
        : (appState.risks || []).filter((risk) => clientKeys.has(String(risk.clientId ?? risk.client_id)));
      const summary = calculateDashboardSummary(clients, risks);
      const projectBreakdown = calculateDashboardProjectBreakdown(clients, groupBy);
      const services = appState.services.map((service) => ({
        name: service.name,
        clients: clients.filter((client) => client.services?.includes(service.name)).length,
        revenue: 0,
      }));
      const regions = [...new Set(clients.map((item) => item.region || 'Unknown'))].map((region, index) => {
        const regionClients = clients.filter((client) => (client.region || 'Unknown') === region);
        return {
          region,
          clients: regionClients.length,
          revenue: regionClients.reduce((sum, client) => sum + Number(client.revenue || 0), 0) / 1000000,
          color: colors[index % colors.length],
        };
      });
      return res.json({
        summary,
        availableYears,
        projectBreakdown,
        onboardingTrend: [{
          month: period,
          onboarded: clients.filter((client) => client.actualOnboardDate || client.plannedOnboardDate).length,
          offboarded: clients.filter((client) => client.actualOffboardDate || client.plannedOffboardDate).length,
        }],
        revenueTrend: [{ month: period, revenue: summary.totalRevenue / 1000000 }],
        serviceAdoption: services,
        regionData: regions,
        upcomingActivities: [],
        rfpBreakdown: [],
      });
    }

    const [summaryResult, onboardingResult, revenueResult, servicesResult, risksResult, upcomingResult, regionResult, yearsResult, projectBreakdownResult, rfpBreakdownResult] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) AS total_clients,
          CAST(COUNT(CASE WHEN LOWER(LTRIM(RTRIM(current_status))) IN ('on-track','on track','in progress','onboarded') THEN 1 END) AS int) AS active_clients,
          CAST(COUNT(CASE WHEN LOWER(LTRIM(RTRIM(current_status))) = 'completed'
            OR (completion >= 100 AND LOWER(LTRIM(RTRIM(current_status))) NOT IN ('cancelled','canceled','offboarded')) THEN 1 END) AS int) AS completed_projects,
          CAST(COUNT(CASE WHEN LOWER(LTRIM(RTRIM(current_status))) NOT IN ('completed','cancelled','canceled','offboarded')
            AND COALESCE(completion,0) < 100 THEN 1 END) AS int) AS active_projects,
          CAST(COUNT(CASE WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(current_status)), ' ', ''), '-', ''), '(', ''), ')', '')) = 'delayedexternal' THEN 1 END) AS int) AS delayed_projects_external,
          CAST(COUNT(CASE WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(current_status)), ' ', ''), '-', ''), '(', ''), ')', '')) = 'delayedinternal' THEN 1 END) AS int) AS delayed_projects_internal,
          CAST(COALESCE(SUM(revenue), 0) AS numeric(18,2)) AS total_revenue,
          CAST(COALESCE(AVG(revenue), 0) AS numeric(18,2)) AS average_revenue,
          CAST(COALESCE(AVG(completion), 0) AS numeric(18,2)) AS average_completion
        FROM clients WHERE ${approvedClients} AND ($1 IS NULL OR [year] = $1)
      `, [selectedYear]),
      pool.query(`
        WITH project_dates AS (
          SELECT COALESCE(actual_onboard_date, planned_onboard_date) AS onboard_date,
            COALESCE(actual_offboard_date, planned_offboard_date) AS offboard_date
          FROM clients WHERE ${approvedClients} AND ($1 IS NULL OR [year] = $1)
        ),
        movements AS (
          SELECT ${periodExpressions.start('onboard_date')} AS period_start,
            COUNT(*) AS onboarded, CAST(0 AS int) AS offboarded
          FROM project_dates WHERE onboard_date IS NOT NULL
          GROUP BY ${periodExpressions.start('onboard_date')}
          UNION ALL
          SELECT ${periodExpressions.start('offboard_date')} AS period_start,
            CAST(0 AS int) AS onboarded, COUNT(*) AS offboarded
          FROM project_dates WHERE offboard_date IS NOT NULL
          GROUP BY ${periodExpressions.start('offboard_date')}
        ),
        grouped AS (
          SELECT period_start, SUM(onboarded) AS onboarded, SUM(offboarded) AS offboarded
          FROM movements GROUP BY period_start
        )
        SELECT TOP (12) ${periodExpressions.label} AS month,
          CAST(onboarded AS int) AS onboarded, CAST(offboarded AS int) AS offboarded
        FROM grouped ORDER BY period_start DESC
      `, [selectedYear]),
      pool.query(`
        WITH revenue_by_period AS (
          SELECT ${periodExpressions.start('COALESCE(actual_start_date, estimated_start_date, CAST(created_at AS date))')} AS period_start,
            SUM(revenue) AS revenue
          FROM clients WHERE ${approvedClients} AND ($1 IS NULL OR [year] = $1)
          GROUP BY ${periodExpressions.start('COALESCE(actual_start_date, estimated_start_date, CAST(created_at AS date))')}
        )
        SELECT TOP (12) ${periodExpressions.label} AS month,
          CAST(ROUND(COALESCE(revenue,0) / 1000000, 2) AS numeric(18,2)) AS revenue
        FROM revenue_by_period ORDER BY period_start DESC
      `, [selectedYear]),
      pool.query(`
        SELECT s.name, CAST(COUNT(DISTINCT c.id) AS int) AS clients,
          CAST(ROUND(COALESCE(SUM(c.revenue),0) / 1000000, 2) AS numeric(18,2)) AS revenue
        FROM services s
        LEFT JOIN client_services cs ON cs.service_id=s.id
        LEFT JOIN clients c ON c.id=cs.client_id AND COALESCE(c.approval_status, 'approved') = 'approved'
          AND ($1 IS NULL OR c.[year] = $1)
        GROUP BY s.id, s.name ORDER BY clients DESC
      `, [selectedYear]),
      pool.query(`
        SELECT CAST(COUNT(*) AS int) AS total_risks,
          CAST(COUNT(CASE WHEN LOWER(r.status) NOT IN ('completed','cancelled','canceled') THEN 1 END) AS int) AS open_risks,
          CAST(COUNT(CASE WHEN r.level='High' AND LOWER(r.status) NOT IN ('completed','cancelled','canceled') THEN 1 END) AS int) AS high_risks
        FROM project_risks r
        JOIN clients c ON c.id=r.client_id AND ${approvedClients}
        WHERE ($1 IS NULL OR c.[year] = $1)
      `, [selectedYear]),
      pool.query(`
        SELECT client_id AS client, client_name,
          COALESCE(estimated_start_date, planned_onboard_date) AS date, project_manager AS manager,
          'onboarding' AS type, CAST(0 AS bit) AS priority
        FROM clients WHERE ${approvedClients} AND ($1 IS NULL OR [year] = $1)
          AND COALESCE(estimated_start_date, planned_onboard_date) >= CAST(GETDATE() AS date)
        UNION ALL
        SELECT client_id, client_name, COALESCE(estimated_end_date, planned_offboard_date),
          project_manager, 'offboarding', CAST(0 AS bit)
        FROM clients WHERE ${approvedClients} AND ($1 IS NULL OR [year] = $1)
          AND COALESCE(estimated_end_date, planned_offboard_date) >= CAST(GETDATE() AS date)
        UNION ALL
        SELECT c.client_id, c.client_name, t.expected_end_date, t.assigned_to, 'delay', CAST(1 AS bit)
        FROM project_tasks t JOIN clients c ON c.id=t.client_id AND ${approvedClients}
        WHERE (LOWER(t.status) IN ('delayed','blocked')
          OR (t.expected_end_date < CAST(GETDATE() AS date) AND t.progress < 100))
          AND t.expected_end_date IS NOT NULL
          AND ($1 IS NULL OR c.[year] = $1)
        ORDER BY date OFFSET 0 ROWS FETCH NEXT 8 ROWS ONLY
      `, [selectedYear]),
      pool.query(`
        SELECT region, CAST(COUNT(*) AS int) AS clients,
          CAST(ROUND(COALESCE(SUM(revenue),0) / 1000000, 2) AS numeric(18,2)) AS revenue
        FROM clients WHERE ${approvedClients} AND ($1 IS NULL OR [year] = $1)
        GROUP BY region ORDER BY clients DESC
      `, [selectedYear]),
      pool.query(`
        SELECT DISTINCT [year] AS year
        FROM clients WHERE ${approvedClients} AND [year] IS NOT NULL
        ORDER BY [year] DESC
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(LTRIM(RTRIM(${groupColumn})), ''), 'Unspecified') AS name,
          CAST(COUNT(*) AS int) AS value
        FROM clients
        WHERE ${approvedClients} AND ($1 IS NULL OR [year] = $1)
        GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(${groupColumn})), ''), 'Unspecified')
        ORDER BY value DESC, name
      `, [selectedYear]),
      pool.query(`
        SELECT COALESCE(NULLIF(LTRIM(RTRIM(p.${rfpGroupColumn})), ''), 'Unspecified') AS name,
          CAST(COUNT(*) AS int) AS value,
          CAST(COALESCE(SUM(s.grand_total_inr), 0) AS numeric(18,2)) AS revenue_inr
        FROM rfp_projects p
        LEFT JOIN rfp_cost_summary s ON s.project_id = p.id
        WHERE ($1 IS NULL OR p.[year] = $1)
        GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(p.${rfpGroupColumn})), ''), 'Unspecified')
        ORDER BY value DESC, name
      `, [selectedYear]),
    ]);

    const summary = summaryResult.rows[0];
    const risks = risksResult.rows[0];
    return res.json({
      summary: {
        totalClients: Number(summary.total_clients),
        activeClients: Number(summary.active_clients),
        totalRevenue: Number(summary.total_revenue),
        averageRevenue: Number(summary.average_revenue),
        activeProjects: Number(summary.active_projects),
        completedProjects: Number(summary.completed_projects),
        delayedProjectsExternal: Number(summary.delayed_projects_external),
        delayedProjectsInternal: Number(summary.delayed_projects_internal),
        totalRisks: Number(risks.total_risks),
        openRisks: Number(risks.open_risks),
        highRisks: Number(risks.high_risks),
        averageCompletion: Number(summary.average_completion),
        azureClients: Number(servicesResult.rows.find((item) => item.name === 'Azure')?.clients || 0),
        awsClients: Number(servicesResult.rows.find((item) => item.name === 'AWS')?.clients || 0),
      },
      availableYears: yearsResult.rows.map((item) => Number(item.year)).filter(Number.isInteger),
      projectBreakdown: projectBreakdownResult.rows.map((item) => ({
        name: item.name,
        value: Number(item.value),
      })),
      onboardingTrend: onboardingResult.rows.reverse(),
      revenueTrend: revenueResult.rows.reverse(),
      serviceAdoption: servicesResult.rows,
      regionData: regionResult.rows.map((item, index) => ({ ...item, color: colors[index % colors.length] })),
      upcomingActivities: upcomingResult.rows,
      rfpBreakdown: rfpBreakdownResult.rows.map((item) => ({
        name: item.name,
        value: Number(item.value),
        revenueInr: Number(item.revenue_inr),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

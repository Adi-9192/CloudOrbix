import express from 'express';
import { appState, getPool } from '../db.js';
import { calculateDashboardSummary } from '../lib/dashboard-metrics.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();
const colors = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];
const approvedClients = "COALESCE(approval_status, 'approved') = 'approved'";

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
    const periodExpressions = getPeriodExpressions(period);
    const pool = getPool();

    if (!pool) {
      const clients = appState.clients.filter(
        (client) => String(client.approvalStatus || 'approved').toLowerCase() === 'approved',
      );
      const summary = calculateDashboardSummary(clients);
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
        onboardingTrend: [{
          month: period,
          onboarded: clients.filter((client) => client.actualOnboardDate || client.plannedOnboardDate).length,
          offboarded: clients.filter((client) => client.actualOffboardDate || client.plannedOffboardDate).length,
        }],
        revenueTrend: [{ month: period, revenue: summary.totalRevenue / 1000000 }],
        serviceAdoption: services,
        regionData: regions,
        upcomingActivities: [],
      });
    }

    const [summaryResult, onboardingResult, revenueResult, servicesResult, risksResult, upcomingResult, regionResult] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) AS total_clients,
          CAST(COUNT(CASE WHEN LOWER(LTRIM(RTRIM(current_status))) IN ('on-track','on track','in progress','onboarded') THEN 1 END) AS int) AS active_clients,
          CAST(COUNT(CASE WHEN LOWER(LTRIM(RTRIM(current_status))) = 'completed'
            OR (completion >= 100 AND LOWER(LTRIM(RTRIM(current_status))) NOT IN ('cancelled','canceled','offboarded')) THEN 1 END) AS int) AS completed_projects,
          CAST(COUNT(CASE WHEN LOWER(LTRIM(RTRIM(current_status))) NOT IN ('completed','cancelled','canceled','offboarded')
            AND COALESCE(completion,0) < 100 THEN 1 END) AS int) AS active_projects,
          CAST(COUNT(CASE WHEN LOWER(LTRIM(RTRIM(current_status))) = 'blocked'
            OR LOWER(LTRIM(RTRIM(current_status))) LIKE 'delayed%' THEN 1 END) AS int) AS delayed_projects,
          CAST(COALESCE(SUM(revenue), 0) AS numeric(18,2)) AS total_revenue,
          CAST(COALESCE(AVG(revenue), 0) AS numeric(18,2)) AS average_revenue,
          CAST(COALESCE(AVG(completion), 0) AS numeric(18,2)) AS average_completion
        FROM clients WHERE ${approvedClients}
      `),
      pool.query(`
        WITH project_dates AS (
          SELECT COALESCE(actual_onboard_date, planned_onboard_date) AS onboard_date,
            COALESCE(actual_offboard_date, planned_offboard_date) AS offboard_date
          FROM clients WHERE ${approvedClients}
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
      `),
      pool.query(`
        WITH revenue_by_period AS (
          SELECT ${periodExpressions.start('COALESCE(actual_start_date, estimated_start_date, CAST(created_at AS date))')} AS period_start,
            SUM(revenue) AS revenue
          FROM clients WHERE ${approvedClients}
          GROUP BY ${periodExpressions.start('COALESCE(actual_start_date, estimated_start_date, CAST(created_at AS date))')}
        )
        SELECT TOP (12) ${periodExpressions.label} AS month,
          CAST(ROUND(COALESCE(revenue,0) / 1000000, 2) AS numeric(18,2)) AS revenue
        FROM revenue_by_period ORDER BY period_start DESC
      `),
      pool.query(`
        SELECT s.name, CAST(COUNT(DISTINCT c.id) AS int) AS clients,
          CAST(ROUND(COALESCE(SUM(c.revenue),0) / 1000000, 2) AS numeric(18,2)) AS revenue
        FROM services s
        LEFT JOIN client_services cs ON cs.service_id=s.id
        LEFT JOIN clients c ON c.id=cs.client_id AND ${approvedClients}
        GROUP BY s.id, s.name ORDER BY clients DESC
      `),
      pool.query(`
        SELECT CAST(COUNT(CASE WHEN LOWER(r.status) NOT IN ('completed','cancelled','canceled') THEN 1 END) AS int) AS open_risks,
          CAST(COUNT(CASE WHEN r.level='High' AND LOWER(r.status) NOT IN ('completed','cancelled','canceled') THEN 1 END) AS int) AS high_risks
        FROM project_risks r
        JOIN clients c ON c.id=r.client_id AND ${approvedClients}
      `),
      pool.query(`
        SELECT client_id AS client, client_name,
          COALESCE(estimated_start_date, planned_onboard_date) AS date, project_manager AS manager,
          'onboarding' AS type, CAST(0 AS bit) AS priority
        FROM clients WHERE ${approvedClients}
          AND COALESCE(estimated_start_date, planned_onboard_date) >= CAST(GETDATE() AS date)
        UNION ALL
        SELECT client_id, client_name, COALESCE(estimated_end_date, planned_offboard_date),
          project_manager, 'offboarding', CAST(0 AS bit)
        FROM clients WHERE ${approvedClients}
          AND COALESCE(estimated_end_date, planned_offboard_date) >= CAST(GETDATE() AS date)
        UNION ALL
        SELECT c.client_id, c.client_name, t.expected_end_date, t.assigned_to, 'delay', CAST(1 AS bit)
        FROM project_tasks t JOIN clients c ON c.id=t.client_id AND ${approvedClients}
        WHERE (LOWER(t.status) IN ('delayed','blocked')
          OR (t.expected_end_date < CAST(GETDATE() AS date) AND t.progress < 100))
          AND t.expected_end_date IS NOT NULL
        ORDER BY date OFFSET 0 ROWS FETCH NEXT 8 ROWS ONLY
      `),
      pool.query(`
        SELECT region, CAST(COUNT(*) AS int) AS clients,
          CAST(ROUND(COALESCE(SUM(revenue),0) / 1000000, 2) AS numeric(18,2)) AS revenue
        FROM clients WHERE ${approvedClients}
        GROUP BY region ORDER BY clients DESC
      `),
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
        delayedProjects: Number(summary.delayed_projects),
        openRisks: Number(risks.open_risks),
        highRisks: Number(risks.high_risks),
        averageCompletion: Number(summary.average_completion),
        azureClients: Number(servicesResult.rows.find((item) => item.name === 'Azure')?.clients || 0),
        awsClients: Number(servicesResult.rows.find((item) => item.name === 'AWS')?.clients || 0),
      },
      onboardingTrend: onboardingResult.rows.reverse(),
      revenueTrend: revenueResult.rows.reverse(),
      serviceAdoption: servicesResult.rows,
      regionData: regionResult.rows.map((item, index) => ({ ...item, color: colors[index % colors.length] })),
      upcomingActivities: upcomingResult.rows,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

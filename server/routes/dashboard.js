import express from 'express';
import { appState, getPool } from '../db.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();
const colors = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

router.get('/', protectRoute, async (req, res, next) => {
  try {
    const period = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'].includes(req.query.period) ? req.query.period : 'Monthly';
    const dateFormat = period === 'Weekly' ? 'IYYY-"W"IW' : period === 'Quarterly' ? '"Q"Q YYYY' : period === 'Yearly' ? 'YYYY' : 'Mon';
    const pool = getPool();
    if (!pool) {
      const clients = appState.clients;
      const totalRevenue = clients.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
      const services = appState.services.map((service) => ({ name: service.name, clients: clients.filter((client) => client.services?.includes(service.name)).length, revenue: 0 }));
      const regions = [...new Set(clients.map((item) => item.region || 'Unknown'))].map((region, index) => ({ region, clients: clients.filter((item) => item.region === region).length, revenue: clients.filter((item) => item.region === region).reduce((sum, item) => sum + Number(item.revenue || 0), 0) / 1000000, color: colors[index % colors.length] }));
      return res.json({ summary: { totalClients: clients.length, activeClients: clients.filter((item) => ['On-track', 'In Progress', 'Onboarded'].includes(item.currentStatus)).length, totalRevenue, averageRevenue: totalRevenue / Math.max(clients.length, 1), activeProjects: clients.filter((item) => !['Completed', 'Offboarded'].includes(item.currentStatus)).length, completedProjects: clients.filter((item) => item.currentStatus === 'Completed').length, delayedProjects: 0, openRisks: 0, highRisks: 0, averageCompletion: clients.reduce((sum, item) => sum + Number(item.completion || 0), 0) / Math.max(clients.length, 1) }, onboardingTrend: [{ month: 'Clients', onboarded: clients.filter((item) => item.actualOnboardDate).length, offboarded: clients.filter((item) => item.actualOffboardDate).length }], revenueTrend: [{ month: 'Total', revenue: totalRevenue / 1000000 }], serviceAdoption: services, regionData: regions, upcomingActivities: [] });
    }
    const [summaryResult, onboardingResult, revenueResult, servicesResult, risksResult, upcomingResult, regionResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total_clients, CAST(COUNT(CASE WHEN current_status IN ('On-track','In Progress','Onboarded') THEN 1 END) AS int) AS active_clients, CAST(COUNT(CASE WHEN current_status = 'Completed' OR completion >= 100 THEN 1 END) AS int) AS completed_projects, CAST(COUNT(CASE WHEN current_status IN ('On-track','In Progress','Onboarded','Pending Onboarding') THEN 1 END) AS int) AS active_projects, CAST(COUNT(CASE WHEN LOWER(current_status) IN ('delayed','blocked') OR (estimated_end_date < CAST(GETDATE() AS date) AND completion < 100) THEN 1 END) AS int) AS delayed_projects, CAST(COALESCE(SUM(revenue), 0) AS numeric(18,2)) AS total_revenue, CAST(COALESCE(AVG(revenue), 0) AS numeric(18,2)) AS average_revenue, CAST(COALESCE(AVG(completion), 0) AS numeric(18,2)) AS average_completion FROM clients WHERE COALESCE(approval_status,'approved')='approved'`),
      pool.query(`SELECT FORMAT(COALESCE(actual_onboard_date, planned_onboard_date), 'MMM') AS month, CAST(COUNT(*) AS int) AS onboarded FROM clients WHERE COALESCE(actual_onboard_date, planned_onboard_date) IS NOT NULL AND COALESCE(approval_status,'approved')='approved' GROUP BY FORMAT(COALESCE(actual_onboard_date, planned_onboard_date), 'MMM') ORDER BY MIN(COALESCE(actual_onboard_date, planned_onboard_date))`),
      pool.query(`SELECT FORMAT(COALESCE(actual_start_date, estimated_start_date, CAST(created_at AS date)), 'MMM') AS month, CAST(ROUND(COALESCE(SUM(revenue),0) / 1000000, 2) AS numeric(18,2)) AS revenue FROM clients GROUP BY FORMAT(COALESCE(actual_start_date, estimated_start_date, CAST(created_at AS date)), 'MMM') ORDER BY MIN(COALESCE(actual_start_date, estimated_start_date, CAST(created_at AS date)))`),
      pool.query(`SELECT s.name, CAST(COUNT(DISTINCT cs.client_id) AS int) clients, CAST(ROUND(COALESCE(SUM(c.revenue),0) / 1000000, 2) AS numeric(18,2)) revenue FROM services s LEFT JOIN client_services cs ON cs.service_id=s.id LEFT JOIN clients c ON c.id=cs.client_id AND COALESCE(c.approval_status,'approved')='approved' GROUP BY s.id, s.name ORDER BY clients DESC`),
      pool.query(`SELECT CAST(COUNT(CASE WHEN r.level='High' AND r.status='Open' THEN 1 END) AS int) AS high_risks, CAST(COUNT(CASE WHEN r.status='Open' THEN 1 END) AS int) AS open_risks FROM project_risks r`),
      pool.query(`SELECT client_id AS client, client_name, COALESCE(estimated_start_date, planned_onboard_date) AS date, project_manager AS manager, 'onboarding' AS type, CAST(0 AS bit) AS priority FROM clients WHERE COALESCE(estimated_start_date, planned_onboard_date) >= CAST(GETDATE() AS date) UNION ALL SELECT client_id, client_name, COALESCE(estimated_end_date, planned_offboard_date), project_manager, 'offboarding', CAST(0 AS bit) FROM clients WHERE COALESCE(estimated_end_date, planned_offboard_date) >= CAST(GETDATE() AS date) UNION ALL SELECT c.client_id, c.client_name, t.expected_end_date, t.assigned_to, 'delay', CAST(1 AS bit) FROM project_tasks t JOIN clients c ON c.id=t.client_id WHERE (LOWER(t.status) IN ('delayed','blocked') OR (t.expected_end_date < CAST(GETDATE() AS date) AND t.progress < 100)) AND t.expected_end_date IS NOT NULL ORDER BY date OFFSET 0 ROWS FETCH NEXT 8 ROWS ONLY`),
      pool.query(`SELECT region, CAST(COUNT(*) AS int) AS clients, CAST(ROUND(COALESCE(SUM(revenue),0) / 1000000, 2) AS numeric(18,2)) AS revenue FROM clients WHERE COALESCE(approval_status,'approved')='approved' GROUP BY region ORDER BY clients DESC`),
    ]);
    const summary = summaryResult.rows[0];
    const risks = risksResult.rows[0];
    return res.json({ summary: { totalClients: summary.total_clients, activeClients: summary.active_clients, totalRevenue: Number(summary.total_revenue), averageRevenue: Number(summary.average_revenue), activeProjects: summary.active_projects, completedProjects: summary.completed_projects, delayedProjects: summary.delayed_projects, openRisks: risks.open_risks, highRisks: risks.high_risks, averageCompletion: Number(summary.average_completion), azureClients: servicesResult.rows.find((item) => item.name === 'Azure')?.clients || 0, awsClients: servicesResult.rows.find((item) => item.name === 'AWS')?.clients || 0 }, onboardingTrend: onboardingResult.rows, revenueTrend: revenueResult.rows, serviceAdoption: servicesResult.rows, regionData: regionResult.rows.map((item, index) => ({ ...item, color: colors[index % colors.length] })), upcomingActivities: upcomingResult.rows });
  } catch (error) { return next(error); }
});

export default router;

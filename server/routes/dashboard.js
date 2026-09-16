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
      pool.query(`SELECT COUNT(*)::int total_clients, COUNT(*) FILTER (
  WHERE current_status IN (
    'On-track',
    'In Progress',
    'Onboarded'
  )
)::int active_clients, COUNT(*) FILTER (WHERE current_status='Completed' OR completion >= 100)::int completed_projects, COUNT(*) FILTER (WHERE current_status IN ('On-track','In Progress','Onboarded','Pending Onboarding'))::int active_projects, COUNT(*) FILTER (WHERE LOWER(current_status) IN ('delayed','blocked') OR (estimated_end_date < CURRENT_DATE AND completion < 100))::int delayed_projects, COALESCE(SUM(revenue),0)::numeric total_revenue, ROUND(COALESCE(AVG(revenue),0)::numeric,2) average_revenue, ROUND(COALESCE(AVG(completion),0)::numeric,2) average_completion FROM clients WHERE COALESCE(approval_status,'approved')='approved'`),
      pool.query(`SELECT TO_CHAR(COALESCE(actual_onboard_date, planned_onboard_date), '${dateFormat}') AS "month", COUNT(*)::int AS onboarded FROM clients WHERE COALESCE(actual_onboard_date, planned_onboard_date) IS NOT NULL AND COALESCE(approval_status,'approved')='approved' GROUP BY 1 ORDER BY MIN(COALESCE(actual_onboard_date, planned_onboard_date))`),
      pool.query(`SELECT TO_CHAR(COALESCE(actual_start_date, estimated_start_date, created_at::date), '${dateFormat}') AS "month", ROUND(SUM(revenue)::numeric / 1000000, 2) AS revenue FROM clients GROUP BY 1 ORDER BY MIN(COALESCE(actual_start_date, estimated_start_date, created_at::date))`),
      pool.query(`SELECT s.name, COUNT(DISTINCT cs.client_id)::int clients, ROUND(COALESCE(SUM(c.revenue),0)::numeric / 1000000, 2) revenue FROM services s LEFT JOIN client_services cs ON cs.service_id=s.id LEFT JOIN clients c ON c.id=cs.client_id AND COALESCE(c.approval_status,'approved')='approved' GROUP BY s.id,s.name ORDER BY clients DESC`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE r.level='High' AND r.status='Open')::int high_risks, COUNT(*) FILTER (WHERE r.status='Open')::int open_risks FROM project_risks r`),
      pool.query(`SELECT client_id client, client_name, COALESCE(estimated_start_date, planned_onboard_date) date, project_manager manager, 'onboarding' type, false priority FROM clients WHERE COALESCE(estimated_start_date, planned_onboard_date) >= CURRENT_DATE UNION ALL SELECT client_id, client_name, COALESCE(estimated_end_date, planned_offboard_date), project_manager, 'offboarding', false FROM clients WHERE COALESCE(estimated_end_date, planned_offboard_date) >= CURRENT_DATE UNION ALL SELECT c.client_id, c.client_name, t.expected_end_date, t.assigned_to, 'delay', true FROM project_tasks t JOIN clients c ON c.id=t.client_id WHERE (LOWER(t.status) IN ('delayed','blocked') OR (t.expected_end_date < CURRENT_DATE AND t.progress < 100)) AND t.expected_end_date IS NOT NULL ORDER BY date LIMIT 8`),
      pool.query(`SELECT region, COUNT(*)::int clients, ROUND(SUM(revenue)::numeric / 1000000, 2) revenue FROM clients WHERE COALESCE(approval_status,'approved')='approved' GROUP BY region ORDER BY clients DESC`),
    ]);
    const summary = summaryResult.rows[0];
    const risks = risksResult.rows[0];
    return res.json({ summary: { totalClients: summary.total_clients, activeClients: summary.active_clients, totalRevenue: Number(summary.total_revenue), averageRevenue: Number(summary.average_revenue), activeProjects: summary.active_projects, completedProjects: summary.completed_projects, delayedProjects: summary.delayed_projects, openRisks: risks.open_risks, highRisks: risks.high_risks, averageCompletion: Number(summary.average_completion), azureClients: servicesResult.rows.find((item) => item.name === 'Azure')?.clients || 0, awsClients: servicesResult.rows.find((item) => item.name === 'AWS')?.clients || 0 }, onboardingTrend: onboardingResult.rows, revenueTrend: revenueResult.rows, serviceAdoption: servicesResult.rows, regionData: regionResult.rows.map((item, index) => ({ ...item, color: colors[index % colors.length] })), upcomingActivities: upcomingResult.rows });
  } catch (error) { return next(error); }
});

export default router;

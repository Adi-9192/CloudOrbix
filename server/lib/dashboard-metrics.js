import { normalizeProjectStatus } from '../../shared/project-status.js';

const normalizedStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

const delayedCategory = (value) =>
  normalizedStatus(value).replace(/[^a-z]/g, '').match(/^delayed(external|internal)$/)?.[1];

const projectBreakdownFields = {
  status: (client) => client.current_status ?? client.currentStatus,
  region: (client) => client.region,
  hyperscaler: (client) => client.hyperscaler,
  projectType: (client) => client.project_type ?? client.projectType,
};

export function calculateDashboardProjectBreakdown(clients = [], groupBy = 'status') {
  const getValue = projectBreakdownFields[groupBy];
  if (!getValue) throw new RangeError(`Unsupported project breakdown: ${groupBy}`);

  const counts = new Map();
  for (const client of clients) {
    if (String(client.approval_status ?? client.approvalStatus ?? 'approved').toLowerCase() !== 'approved') {
      continue;
    }
    const rawLabel = String(getValue(client) ?? '').trim();
    const label = rawLabel
      ? groupBy === 'status'
        ? normalizeProjectStatus(rawLabel)
        : rawLabel
      : 'Unspecified';
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export function calculateDashboardSummary(clients = [], risks = []) {
  const approved = clients.filter(
    (client) => String(client.approval_status || 'approved').toLowerCase() === 'approved',
  );
  const totalRevenue = approved.reduce(
    (sum, client) => sum + Number(client.revenue || 0),
    0,
  );
  const completedProjects = approved.filter((client) => {
    const status = normalizedStatus(client.current_status ?? client.currentStatus);
    return status === 'completed' ||
      (Number(client.completion || 0) >= 100 && !['cancelled', 'canceled', 'offboarded'].includes(status));
  }).length;
  const activeProjects = approved.filter((client) => {
    const status = normalizedStatus(client.current_status ?? client.currentStatus);
    return !['completed', 'cancelled', 'canceled', 'offboarded'].includes(status) &&
      Number(client.completion || 0) < 100;
  }).length;
  const activeRisks = risks.filter((risk) => {
    const status = normalizedStatus(risk.status);
    return !['completed', 'cancelled', 'canceled'].includes(status);
  });
  const delayedProjects = approved.reduce(
    (counts, client) => {
      const category = delayedCategory(client.current_status ?? client.currentStatus);
      if (category === 'external') counts.external += 1;
      if (category === 'internal') counts.internal += 1;
      return counts;
    },
    { external: 0, internal: 0 },
  );

  return {
    totalClients: approved.length,
    activeClients: approved.filter((client) =>
      ['on-track', 'in-progress', 'onboarded'].includes(
        normalizedStatus(client.current_status ?? client.currentStatus),
      ),
    ).length,
    totalRevenue,
    averageRevenue: approved.length ? totalRevenue / approved.length : 0,
    activeProjects,
    completedProjects,
    delayedProjectsExternal: delayedProjects.external,
    delayedProjectsInternal: delayedProjects.internal,
    totalRisks: risks.length,
    openRisks: activeRisks.length,
    highRisks: activeRisks.filter((risk) => normalizedStatus(risk.level) === 'high').length,
    averageCompletion: approved.length
      ? approved.reduce((sum, client) => sum + Number(client.completion || 0), 0) / approved.length
      : 0,
  };
}

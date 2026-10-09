const normalizedStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

const isDelayedStatus = (value) =>
  normalizedStatus(value) === 'blocked' ||
  normalizedStatus(value).startsWith('delayed');

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
    delayedProjects: approved.filter((client) =>
      isDelayedStatus(client.current_status ?? client.currentStatus),
    ).length,
    openRisks: activeRisks.length,
    highRisks: activeRisks.filter((risk) => normalizedStatus(risk.level) === 'high').length,
    averageCompletion: approved.length
      ? approved.reduce((sum, client) => sum + Number(client.completion || 0), 0) / approved.length
      : 0,
  };
}

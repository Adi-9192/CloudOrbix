export function calculateKpis(clients = [], risks = []) {
  const approved = clients.filter((client) => (client.approval_status || 'approved') === 'approved');
  const totalRevenue = approved.reduce((sum, client) => sum + Number(client.revenue || 0), 0);
  const completedProjects = approved.filter((client) => client.current_status === 'Completed' || Number(client.completion || 0) >= 100).length;
  const activeProjects = approved.filter((client) => !['Completed', 'Offboarded'].includes(client.current_status)).length;
  const openRisks = risks.filter((risk) => risk.status === 'Open');
  return {
    totalClients: approved.length,
    activeClients: approved.filter((client) => ['On-track', 'In Progress', 'Onboarded'].includes(client.current_status)).length,
    totalRevenue,
    activeProjects,
    completedProjects,
    openRisks: openRisks.length,
    averageCompletion: approved.length ? approved.reduce((sum, client) => sum + Number(client.completion || 0), 0) / approved.length : 0,
  };
}

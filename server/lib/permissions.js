export const hasAnyRole = (roles = [], allowedRoles = []) => allowedRoles.some((role) => roles.includes(role));
export const canManageProject = (roles = []) => hasAnyRole(roles, ['Admin', 'Operations Team']);
const normalizeProjectAssignees = (value) =>
  String(value || '')
    .split(/[,;/|]+/)
    .map((name) => name.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean);
export const isAssignedProjectManager = (user = {}, project = {}) => {
  const userName = `${user.firstName || ''} ${user.lastName || ''}`
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const userEmail = String(user.email || '').trim().toLowerCase();
  const identities = new Set([userName, userEmail].filter(Boolean));
  const assignees = [
    ...normalizeProjectAssignees(project.accountManager),
    ...normalizeProjectAssignees(project.projectManager),
  ];
  return assignees.some((assignee) => identities.has(assignee));
};
export const canAccessProject = (user = {}, project = {}) =>
  canManageProject(user.roles || []) ||
  (user.roles?.includes('Manager') && isAssignedProjectManager(user, project));
export const canApprove = (roles = []) => roles.includes('Admin');
export const canDelete = (roles = []) => roles.includes('Admin');

const normalizeRoles = (roles = []) => {
  const values = Array.isArray(roles) ? roles : [roles];
  return values
    .flatMap((role) => String(role ?? '').split(','))
    .map((role) => role.trim())
    .filter(Boolean);
};

export const hasAnyRole = (roles = [], allowedRoles = []) => {
  const userRoles = normalizeRoles(roles);
  const permittedRoles = normalizeRoles(allowedRoles);

  if (!userRoles.length || !permittedRoles.length) {
    return false;
  }

  return permittedRoles.some((role) => userRoles.includes(role));
};

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

export const canAccessProject = (user = {}, project = {}) => {
  const roles = normalizeRoles(user.roles || []);

  return canManageProject(roles) ||
    (roles.includes('Manager') && isAssignedProjectManager(user, project));
};

export const canApprove = (roles = []) => hasAnyRole(roles, ['Admin']);
export const canDelete = (roles = []) => hasAnyRole(roles, ['Admin']);

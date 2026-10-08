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

export const canApprove = (roles = []) => hasAnyRole(roles, ['Admin']);
export const canDelete = (roles = []) => hasAnyRole(roles, ['Admin']);

export const canManageProject = (roles = []) => hasAnyRole(roles, [
  'Admin',
  'Manager',
  'Operations Team',
  'Account Manager',
  'Project Manager',
  'Service Manager',
  'Delivery Manager',
]);

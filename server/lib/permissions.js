export const hasAnyRole = (roles = [], allowedRoles = []) => allowedRoles.some((role) => roles.includes(role));
export const canApprove = (roles = []) => roles.includes('Admin');
export const canDelete = (roles = []) => roles.includes('Admin');

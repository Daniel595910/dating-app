export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_agent' | 'analyst';

export interface Permission {
  id: string;
  label: string;
  description: string;
  category: 'users' | 'content' | 'system' | 'financial';
  sensitive?: boolean;
}

export const PERMISSIONS: Record<string, Permission> = {
  // Users
  USER_VIEW: { id: 'USER_VIEW', label: 'View Users', description: 'View user profiles and details', category: 'users' },
  USER_EDIT: { id: 'USER_EDIT', label: 'Edit Users', description: 'Edit user profiles', category: 'users' },
  USER_BAN: { id: 'USER_BAN', label: 'Ban Users', description: 'Ban and unban users', category: 'users', sensitive: true },
  USER_VERIFY: { id: 'USER_VERIFY', label: 'Verify Users', description: 'Approve user verification', category: 'users' },
  USER_DELETE: { id: 'USER_DELETE', label: 'Delete Users', description: 'Permanently delete users', category: 'users', sensitive: true },
  USER_ROLE: { id: 'USER_ROLE', label: 'Manage Roles', description: 'Assign admin roles', category: 'users', sensitive: true },

  // Content
  CONTENT_VIEW: { id: 'CONTENT_VIEW', label: 'View Content', description: 'View posts and comments', category: 'content' },
  CONTENT_MODERATE: { id: 'CONTENT_MODERATE', label: 'Moderate Content', description: 'Hide/delete content', category: 'content' },
  CONTENT_DELETE: { id: 'CONTENT_DELETE', label: 'Delete Content', description: 'Permanently delete content', category: 'content', sensitive: true },

  // Communities
  COMMUNITY_VIEW: { id: 'COMMUNITY_VIEW', label: 'View Communities', description: 'View communities', category: 'content' },
  COMMUNITY_EDIT: { id: 'COMMUNITY_EDIT', label: 'Edit Communities', description: 'Edit community details', category: 'content' },
  COMMUNITY_DELETE: { id: 'COMMUNITY_DELETE', label: 'Delete Communities', description: 'Delete communities', category: 'content', sensitive: true },

  // Financial
  VIP_VIEW: { id: 'VIP_VIEW', label: 'View VIP', description: 'View VIP users and transactions', category: 'financial' },
  VIP_MANAGE: { id: 'VIP_MANAGE', label: 'Manage VIP', description: 'Manage VIP plans and points', category: 'financial' },
  VIP_REFUND: { id: 'VIP_REFUND', label: 'Issue Refunds', description: 'Process refunds', category: 'financial', sensitive: true },

  // System
  ANALYTICS_VIEW: { id: 'ANALYTICS_VIEW', label: 'View Analytics', description: 'View analytics', category: 'system' },
  SETTINGS_VIEW: { id: 'SETTINGS_VIEW', label: 'View Settings', description: 'View system settings', category: 'system' },
  SETTINGS_EDIT: { id: 'SETTINGS_EDIT', label: 'Edit Settings', description: 'Modify system settings', category: 'system', sensitive: true },
  AUDIT_VIEW: { id: 'AUDIT_VIEW', label: 'View Audit Log', description: 'View admin activity log', category: 'system' },
  ADMIN_MANAGE: { id: 'ADMIN_MANAGE', label: 'Manage Admins', description: 'Create/edit admin accounts', category: 'system', sensitive: true },
};

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: Object.keys(PERMISSIONS),
  admin: [
    'USER_VIEW', 'USER_EDIT', 'USER_BAN', 'USER_VERIFY',
    'CONTENT_VIEW', 'CONTENT_MODERATE', 'CONTENT_DELETE',
    'COMMUNITY_VIEW', 'COMMUNITY_EDIT', 'COMMUNITY_DELETE',
    'VIP_VIEW', 'VIP_MANAGE',
    'ANALYTICS_VIEW', 'SETTINGS_VIEW', 'SETTINGS_EDIT', 'AUDIT_VIEW',
  ],
  moderator: [
    'USER_VIEW', 'USER_BAN',
    'CONTENT_VIEW', 'CONTENT_MODERATE', 'CONTENT_DELETE',
    'COMMUNITY_VIEW', 'COMMUNITY_EDIT',
  ],
  support_agent: [
    'USER_VIEW', 'USER_EDIT', 'USER_VERIFY',
    'CONTENT_VIEW',
    'COMMUNITY_VIEW',
  ],
  analyst: [
    'USER_VIEW',
    'CONTENT_VIEW',
    'ANALYTICS_VIEW',
  ],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  support_agent: 'Support Agent',
  analyst: 'Analyst',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'error',
  admin: 'warning',
  moderator: 'info',
  support_agent: 'success',
  analyst: 'default',
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: AdminRole, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: AdminRole, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsByCategory(role: AdminRole): Record<string, Permission[]> {
  const permissions = ROLE_PERMISSIONS[role] || [];
  const grouped: Record<string, Permission[]> = {};

  Object.values(PERMISSIONS).forEach((p) => {
    if (permissions.includes(p.id)) {
      const cat = p.category ?? 'system';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
  });

  return grouped;
}

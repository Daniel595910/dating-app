export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_agent' | 'analyst';

export interface Permission {
  id: string;
  label: string;
  description: string;
}

export const PERMISSIONS: Record < string, Permission > = {
  USER_MANAGEMENT: {
    id: 'USER_MANAGEMENT',
    label: 'User Management',
    description: 'View and manage users',
  },
  CONTENT_MODERATION: {
    id: 'CONTENT_MODERATION',
    label: 'Content Moderation',
    description: 'Moderate posts and comments',
  },
  COMMUNITY_MANAGEMENT: {
    id: 'COMMUNITY_MANAGEMENT',
    label: 'Community Management',
    description: 'Manage communities',
  },
  MATCH_MANAGEMENT: {
    id: 'MATCH_MANAGEMENT',
    label: 'Match Management',
    description: 'View and manage matches',
  },
  VIP_MANAGEMENT: {
    id: 'VIP_MANAGEMENT',
    label: 'VIP Management',
    description: 'Manage VIP accounts and plans',
  },
  ANALYTICS_VIEW: {
    id: 'ANALYTICS_VIEW',
    label: 'Analytics',
    description: 'View analytics and reports',
  },
  SETTINGS_MANAGEMENT: {
    id: 'SETTINGS_MANAGEMENT',
    label: 'Settings',
    description: 'Manage system settings',
  },
};

export const ROLE_PERMISSIONS: Record < AdminRole, string[] > = {
  super_admin: Object.keys(PERMISSIONS),
  admin: Object.keys(PERMISSIONS),
  moderator: ['CONTENT_MODERATION', 'USER_MANAGEMENT'],
  support_agent: ['USER_MANAGEMENT'],
  analyst: ['ANALYTICS_VIEW'],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
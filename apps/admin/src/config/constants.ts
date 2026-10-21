export const APP_NAME = 'Spensive Admin';
export const APP_VERSION = '1.0.0';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  USERS: '/users',
  USER_DETAIL: '/users/:id',
  COMMUNITIES: '/communities',
  MODERATION: '/moderation',
  MATCHES: '/matches',
  VIP: '/vip',
  REPORTS: '/reports',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  AUDIT_LOG: '/audit-log',
} as const;

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT_AGENT: 'support_agent',
  ANALYST: 'analyst',
} as const;

export const STATUS_COLORS = {
  active: 'success',
  pending: 'warning',
  suspended: 'error',
  banned: 'error',
  verified: 'success',
  rejected: 'error',
  resolved: 'success',
  dismissed: 'default',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const SENSITIVE_ACTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

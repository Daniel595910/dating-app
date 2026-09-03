/**
 * Admin Types
 * Administrative operations and dashboard
 */

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_agent' | 'analyst';

export type AdminPermission = 
  | 'user_management'
  | 'content_moderation'
  | 'community_management'
  | 'match_management'
  | 'vip_management'
  | 'analytics_view'
  | 'settings_management'
  | 'report_management'
  | 'notification_management'
  | 'audit_log_view';

export interface AdminUser {
  id: string;
  userId: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalMatches: number;
  matchesToday: number;
  totalPosts: number;
  postsToday: number;
  totalReports: number;
  pendingReports: number;
  totalRevenue: number;
  revenueToday: number;
  verificationQueue: number;
  onlineUsers: number;
}

export interface AdminActivity {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AdminSettings {
  id: string;
  key: string;
  value: Record<string, any>;
  description: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}
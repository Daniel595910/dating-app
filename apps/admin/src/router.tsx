import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { ModerationPage } from './pages/ModerationPage';
import { MatchesPage } from './pages/MatchesPage';
import { VipPage } from './pages/VipPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SafetyPage } from './pages/SafetyPage';
import { CommentsPage } from './pages/CommentsPage';
import { DiscoverVideosPage } from './pages/DiscoverVideosPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { AdminGuard } from './components/layout/AdminGuard';

export const AdminRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<AdminGuard><DashboardPage /></AdminGuard>} />
      <Route path="/users" element={<AdminGuard requiredPermissions={['USER_VIEW']}><UsersPage /></AdminGuard>} />
      <Route path="/users/:id" element={<AdminGuard requiredPermissions={['USER_VIEW']}><UserDetailPage /></AdminGuard>} />
      <Route path="/communities" element={<AdminGuard requiredPermissions={['COMMUNITY_VIEW']}><CommunitiesPage /></AdminGuard>} />
      <Route path="/moderation" element={<AdminGuard requiredPermissions={['CONTENT_VIEW']}><ModerationPage /></AdminGuard>} />
      <Route path="/reports" element={<AdminGuard requiredPermissions={['CONTENT_VIEW']}><ReportsPage /></AdminGuard>} />
      <Route path="/matches" element={<AdminGuard><MatchesPage /></AdminGuard>} />
      <Route path="/connections" element={<AdminGuard requiredPermissions={['USER_VIEW']}><ConnectionsPage /></AdminGuard>} />
      <Route path="/vip" element={<AdminGuard requiredPermissions={['VIP_VIEW']}><VipPage /></AdminGuard>} />
      <Route path="/analytics" element={<AdminGuard requiredPermissions={['ANALYTICS_VIEW']}><AnalyticsPage /></AdminGuard>} />
      <Route path="/audit-log" element={<AdminGuard requiredPermissions={['AUDIT_VIEW']}><AuditLogPage /></AdminGuard>} />
      <Route path="/admin-users" element={<AdminGuard requiredPermissions={['ADMIN_MANAGE']}><AdminUsersPage /></AdminGuard>} />
      <Route path="/notifications" element={<AdminGuard requiredPermissions={['SETTINGS_VIEW']}><NotificationsPage /></AdminGuard>} />
      <Route path="/safety" element={<AdminGuard requiredPermissions={['USER_VIEW']}><SafetyPage /></AdminGuard>} />
      <Route path="/comments" element={<AdminGuard requiredPermissions={['CONTENT_VIEW']}><CommentsPage /></AdminGuard>} />
      <Route path="/discover-videos" element={<AdminGuard requiredPermissions={['CONTENT_VIEW']}><DiscoverVideosPage /></AdminGuard>} />
      <Route path="/settings" element={<AdminGuard requiredPermissions={['SETTINGS_VIEW']}><SettingsPage /></AdminGuard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};






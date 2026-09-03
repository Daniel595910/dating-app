import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { ModerationPage } from './pages/ModerationPage';
import { MatchesPage } from './pages/MatchesPage';
import { VipPage } from './pages/VipPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminGuard } from './components/layout/AdminGuard';

export const AdminRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <AdminGuard>
            <DashboardPage />
          </AdminGuard>
        }
      />
      <Route
        path="/users"
        element={
          <AdminGuard>
            <UsersPage />
          </AdminGuard>
        }
      />
      <Route
        path="/communities"
        element={
          <AdminGuard>
            <CommunitiesPage />
          </AdminGuard>
        }
      />
      <Route
        path="/moderation"
        element={
          <AdminGuard>
            <ModerationPage />
          </AdminGuard>
        }
      />
      <Route
        path="/matches"
        element={
          <AdminGuard>
            <MatchesPage />
          </AdminGuard>
        }
      />
      <Route
        path="/vip"
        element={
          <AdminGuard>
            <VipPage />
          </AdminGuard>
        }
      />
      <Route
        path="/reports"
        element={
          <AdminGuard>
            <ReportsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/analytics"
        element={
          <AdminGuard>
            <AnalyticsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminGuard>
            <SettingsPage />
          </AdminGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
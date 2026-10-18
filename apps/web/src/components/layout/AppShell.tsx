import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/constants';
import { NotificationPromptBanner } from '@/features/notifications/components/NotificationPromptBanner';
import { pushNotificationService } from '@/features/notifications/services/push-notification.service';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { useSettings } from '@/hooks/useSettings';
import { MaintenancePage } from '@/pages/MaintenancePage';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useAuthStore();

  // Maintenance mode — blocks ALL users when enabled (toggle in admin /settings)
  const maintenanceEnabled = useSettings((s) => s.settings['general.maintenance_enabled']) === true;

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Silent boot-time push subscribe: if permission is already granted
  // but no active subscription exists (e.g. cache cleared), re-establish it.
  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    pushNotificationService.subscribeUser(user.id).catch(() => {
      // Silent failure — banner will prompt if needed
    });
  }, [user]);

  useEffect(() => {
    const publicRoutes = [
      ROUTES.LOGIN,
      ROUTES.REGISTER,
      ROUTES.VERIFY_PHONE,
      ROUTES.KYC,
      ROUTES.LOCATION,
      ROUTES.COMMUNITY_ASSIGN,
      '/confirm-email',
      ROUTES.WELCOME,
      ROUTES.FORGOT_PASSWORD,
      ROUTES.RESET_PASSWORD,
      '/auth/callback',
      '/auth/new-device',
      '/register/complete'
    ];

    const isPublicRoute = publicRoutes.includes(location.pathname as any);

    if (!loading && !isPublicRoute && !user) {
      navigate(ROUTES.WELCOME, { replace: true });
    }

    if (!loading && user && (location.pathname === ROUTES.WELCOME || location.pathname === ROUTES.LOGIN || location.pathname === ROUTES.REGISTER)) {
      navigate(ROUTES.COMMUNITY, { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Block all users when maintenance mode is enabled
  if (maintenanceEnabled) {
    return <MaintenancePage />;
  }

  return (
    <>
      {user && !user.email_confirmed_at ? (
        <EmailVerificationBanner />
      ) : user ? (
        <NotificationPromptBanner />
      ) : null}
      {children}
    </>
  );
};

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/constants';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useAuthStore();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const publicRoutes = [
      ROUTES.LOGIN,
      ROUTES.REGISTER,
      ROUTES.VERIFY_PHONE,
      ROUTES.KYC,
      ROUTES.LOCATION,
      ROUTES.COMMUNITY_ASSIGN,
      '/confirm-email'
    ];

    const isPublicRoute = publicRoutes.includes(location.pathname as any);

    if (!loading && !isPublicRoute && !user) {
      navigate(ROUTES.LOGIN, { replace: true });
    }

    if (!loading && user && (location.pathname === ROUTES.LOGIN || location.pathname === ROUTES.REGISTER)) {
      navigate(ROUTES.COMMUNITY, { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return <>{children}</>;
};

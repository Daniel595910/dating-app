/**
 * ProtectedRoute Component
 * Guards routes that require authentication.
 * Optimized for instant perceived load times based on the route.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/constants';
import { CommunitySkeleton } from '../../features/community/components/CommunitySkeleton';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  
  if (loading) {
    // Show the full feed skeleton if they are headed to the community feed.
    // Otherwise, show a generic loading screen.
    if (location.pathname === '/' || location.pathname.startsWith('/community')) {
      return <CommunitySkeleton />;
    }
    return <LoadingScreen message="Loading..." />;
  }
  
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  
  return <>{children}</>;
};
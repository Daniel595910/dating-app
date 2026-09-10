import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabase.client';
import { User } from '@supabase/supabase-js';
import { hasPermission as checkPermission, AdminRole } from '@/config/permissions';
import { SESSION_TIMEOUT_MS } from '@/config/constants';

export type { AdminRole };

export interface AdminUser {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: AdminRole;
  isAdmin: boolean;
}

interface UseAdminAuthResult {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AdminRole | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const ADMIN_ROLES: AdminRole[] = ['super_admin', 'admin', 'moderator', 'support_agent', 'analyst'];

export function useAdminAuth(): UseAdminAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastActivityRef = useRef(Date.now());
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAdminUser = async (authUser: User): Promise<AdminUser | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, role, is_admin')
        .eq('user_id', authUser.id)
        .single();

      if (profileError || !profile) {
        console.error('Failed to load profile:', profileError);
        return null;
      }

      const role = (profile.role || 'user') as AdminRole;
      const isAdmin = profile.is_admin || ADMIN_ROLES.includes(role);

      return {
        id: profile.id,
        userId: profile.user_id,
        email: authUser.email || '',
        displayName: profile.display_name || 'Admin',
        avatarUrl: profile.avatar_url,
        role,
        isAdmin,
      };
    } catch (err) {
      console.error('Error loading admin user:', err);
      return null;
    }
  };

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setUser(null);
        setAdminUser(null);
        setLoading(false);
        return;
      }

      setUser(authUser);
      const admin = await loadAdminUser(authUser);
      setAdminUser(admin);

      if (!admin || !admin.isAdmin) {
        setError('Access denied. Admin privileges required.');
      }
    } catch (err: any) {
      console.error('Auth check failed:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Session timeout
  const resetSessionTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    sessionTimeoutRef.current = setTimeout(async () => {
      console.warn('Session timeout - signing out');
      await supabase.auth.signOut();
      window.location.href = '/login?reason=session_timeout';
    }, SESSION_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadAdminUser(session.user).then(setAdminUser);
        resetSessionTimer();
      } else {
        setUser(null);
        setAdminUser(null);
      }
    });

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetSessionTimer();

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetSessionTimer();

    return () => {
      subscription.unsubscribe();
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, [checkAuth, resetSessionTimer]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        return { success: false, error: loginError.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login failed' };
      }

      const admin = await loadAdminUser(data.user);

      if (!admin || !admin.isAdmin) {
        await supabase.auth.signOut();
        return { success: false, error: 'Access denied. Admin privileges required.' };
      }

      setUser(data.user);
      setAdminUser(admin);
      resetSessionTimer();
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    await supabase.auth.signOut();
    setUser(null);
    setAdminUser(null);
    setError(null);
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!adminUser) return false;
      return checkPermission(adminUser.role, permission);
    },
    [adminUser]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!adminUser) return false;
      return permissions.some((p) => checkPermission(adminUser.role, p));
    },
    [adminUser]
  );

  return {
    user,
    adminUser,
    loading,
    error,
    isAdmin: adminUser?.isAdmin || false,
    isSuperAdmin: adminUser?.role === 'super_admin',
    role: adminUser?.role || null,
    signIn,
    signOut,
    refresh: checkAuth,
    hasPermission,
    hasAnyPermission,
  };
}

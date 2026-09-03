/**
 * useAuth Hook
 * Authentication state management
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '@/services/auth.service';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise < void > ;
  register: (email: string, password: string) => Promise < void > ;
  logout: () => Promise < void > ;
  refreshUser: () => Promise < void > ;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState < User | null > (null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to get user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    refreshUser();
    
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
    };
  }, [refreshUser]);
  
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    const { user: loggedInUser, error: loginError } = await authService.login({
      email,
      password,
    });
    
    if (loginError) {
      setError(loginError);
      setLoading(false);
      throw new Error(loginError);
    }
    
    setUser(loggedInUser);
    setLoading(false);
  }, []);
  
  const register = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    const { user: registeredUser, error: registerError } = await authService.register({
      email,
      password,
    });
    
    if (registerError) {
      setError(registerError);
      setLoading(false);
      throw new Error(registerError);
    }
    
    setUser(registeredUser);
    setLoading(false);
  }, []);
  
  const logout = useCallback(async () => {
    setLoading(true);
    await authService.logout();
    setUser(null);
    setLoading(false);
  }, []);
  
  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser,
  };
}
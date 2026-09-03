import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { User } from '@supabase/supabase-js';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC < AdminGuardProps > = ({ children }) => {
  const [user, setUser] = useState < User | null > (null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Check if user has admin role
        const { data: userRecord } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const adminRoles = ['admin', 'super_admin', 'moderator'];
        setIsAdmin(adminRoles.includes(userRecord?.role || ''));
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Checking access...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>Access denied. Admin privileges required.</div>;
  }
  
  return <>{children}</>;
};
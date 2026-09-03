/**
 * Auth Service
 * Handles authentication operations
 */

import { supabase } from '@/config/supabase.client';
import { User } from '@supabase/supabase-js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  phone ? : string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

class AuthService {
  async login({ email, password }: LoginCredentials): Promise < AuthResponse > {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return {
        user: data.user,
        error: null,
      };
    } catch (error: any) {
      return {
        user: null,
        error: error.message || 'Failed to login',
      };
    }
  }
  
  async register({ email, password, phone }: RegisterCredentials): Promise < AuthResponse > {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        phone,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      return {
        user: data.user,
        error: null,
      };
    } catch (error: any) {
      return {
        user: null,
        error: error.message || 'Failed to register',
      };
    }
  }
  
  async logout(): Promise < void > {
    await supabase.auth.signOut();
  }
  
  async getCurrentUser(): Promise < User | null > {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }
  
  async resetPassword(email: string): Promise < { error: string | null } > {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to send reset email' };
    }
  }
  
  async updatePassword(newPassword: string): Promise < { error: string | null } > {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to update password' };
    }
  }
  
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }
}

export const authService = new AuthService();
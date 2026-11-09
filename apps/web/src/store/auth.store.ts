import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase.client';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  // Start as true ONLY if there is no cached session, otherwise true would block the UI
  loading: true,
  error: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
    set({ user: data.user, isAuthenticated: true, loading: false });
  },

  register: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
    set({ user: data.user, isAuthenticated: true, loading: false });
  },

  logout: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false, loading: false });
  },

  refreshUser: async () => {
    // 1. Instantly get session from local storage (no network)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // 2. Update user instantly and turn off loading
      set({ user: session.user, isAuthenticated: true, loading: false });
    } else {
      // If no cached session, stop loading (so redirect happens fast)
      set({ user: null, isAuthenticated: false, loading: false });
    }

    // 3. Silently verify with the server in the background
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        // Session expired/invalid
        set({ user: null, isAuthenticated: false });
      } else {
        // Session valid, quietly update
        set({ user });
      }
    } catch {
      // Ignore background network errors
    }
  }
}));
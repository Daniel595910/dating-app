import { create } from 'zustand';
import { supabase } from '@/config/supabase.client';

interface SettingsState {
  settings: Record<string, any>;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  get: (key: string, fallback?: any) => any;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,
  loaded: false,

  load: async () => {
    if (get().loading || get().loaded) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');
      if (error) {
        console.error('Failed to load platform settings:', error);
        set({ loading: false, loaded: true });
        return;
      }
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        if (row.key) map[row.key] = row.value;
      });
      set({ settings: map, loading: false, loaded: true });
    } catch (err) {
      console.error('Failed to load platform settings:', err);
      set({ loading: false, loaded: true });
    }
  },

  get: (key: string, fallback: any = undefined) => {
    const s = get().settings;
    return s[key] !== undefined && s[key] !== null ? s[key] : fallback;
  },
}));

// Convenience selectors — call from components after useSettings.getState().load()
export const getAppName = () => useSettings.getState().get('general.app_name', 'Dating App');
export const getAppTagline = () => useSettings.getState().get('general.tagline', '');
export const getFaviconUrl = () => useSettings.getState().get('general.favicon_url', null);
export const getLogoUrl = () => useSettings.getState().get('general.logo_url', null);
export const getSupportEmail = () => useSettings.getState().get('general.support_email', '');
export const isMaintenanceMode = () => useSettings.getState().get('general.maintenance_enabled', false) === true;
export const getMaintenanceMessage = () => useSettings.getState().get('general.maintenance_message', 'We are performing scheduled maintenance. Please check back shortly.');
export const getMaintenanceEndsAt = () => useSettings.getState().get('general.maintenance_ends_at', null);

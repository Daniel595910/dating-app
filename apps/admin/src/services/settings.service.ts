import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface Setting {
  id: string;
  key: string;
  value: any;
  category: string;
  label: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface SettingUpdate {
  key: string;
  value: any;
}

class SettingsService {
  private cache = new Map<string, Setting>();
  private lastFetch = 0;
  private cacheTTL = 30 * 1000; // 30 seconds

  async getAll(forceRefresh = false): Promise<Setting[]> {
    const now = Date.now();
    if (!forceRefresh && this.cache.size > 0 && now - this.lastFetch < this.cacheTTL) {
      return Array.from(this.cache.values());
    }

    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Failed to fetch settings:', error);
      throw new Error(error.message);
    }

    const settings = (data || []) as Setting[];
    this.cache.clear();
    settings.forEach((s) => this.cache.set(s.key, s));
    this.lastFetch = now;

    return settings;
  }

  async getGroupedByCategory(): Promise<Record<string, Setting[]>> {
    const settings = await this.getAll();
    const grouped: Record<string, Setting[]> = {};

    settings.forEach((s) => {
      const cat = s.category ?? 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });

    return grouped;
  }

  async update(key: string, value: any): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('platform_settings')
      .update({
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key);

    if (error) throw new Error(error.message);

    // Invalidate cache
    this.cache.delete(key);
    this.lastFetch = 0;

    await auditService.logAction({
      action: 'update_setting',
      resourceType: 'setting',
      resourceId: key,
      changes: { key, value },
    });

    return true;
  }

  async updateMany(updates: SettingUpdate[]): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    for (const update of updates) {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          value: update.value,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('key', update.key);

      if (error) throw new Error(error.message);
    }

    this.cache.clear();
    this.lastFetch = 0;

    await auditService.logAction({
      action: 'update_settings_bulk',
      resourceType: 'setting',
      changes: { count: updates.length },
    });

    return true;
  }

  // Convenience method for feature flags
  async isFeatureEnabled(key: string): Promise<boolean> {
    try {
      const setting = this.cache.get(key);
      if (setting) return setting.value === true;

      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      return data?.value === true;
    } catch {
      return false;
    }
  }
}

export const settingsService = new SettingsService();

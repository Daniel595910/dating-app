import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type NotificationType =
  | 'match'
  | 'message'
  | 'like'
  | 'comment'
  | 'mention'
  | 'system'
  | 'verification'
  | 'vip'
  | 'report'
  | 'community';

export interface NotificationTypeSetting {
  type: NotificationType;
  enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  custom_title_template: string | null;
  custom_body_template: string | null;
  custom_icon_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface NotificationGlobalSettings {
  id: number;
  push_master_enabled: boolean;
  app_icon_url: string | null;
  app_name: string;
  default_avatar_url: string | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  rate_limit_per_hour: number;
  updated_at: string;
  updated_by: string | null;
}

class NotificationSettingsService {
  /**
   * Fetch all per-type settings. If a type row is missing, it returns
   * defaults (enabled: true, push: true) so the UI shows sane state.
   */
  async getTypeSettings(): Promise<NotificationTypeSetting[]> {
    const { data, error } = await supabase
      .from('notification_type_settings')
      .select('*')
      .order('type');

    if (error) {
      console.error('Failed to load type settings:', error);
      return [];
    }

    return (data || []) as NotificationTypeSetting[];
  }

  /**
   * Update one notification type. Upserts so missing rows get created.
   */
  async updateTypeSetting(
    type: NotificationType,
    updates: Partial<Omit<NotificationTypeSetting, 'type' | 'updated_at' | 'updated_by'>>
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      type,
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    };

    const { error } = await supabase
      .from('notification_type_settings')
      .upsert(payload, { onConflict: 'type' });

    if (error) {
      console.error('Failed to update type setting:', error);
      throw new Error(error.message);
    }

    await auditService.logAction({
      action: 'update_notification_type_setting',
      resourceType: 'notification_type_setting',
      resourceId: type,
      changes: updates,
    });

    return true;
  }

  /**
   * Global settings — single row with id=1. Ensures it exists.
   */
  async getGlobalSettings(): Promise<NotificationGlobalSettings | null> {
    const { data, error } = await supabase
      .from('notification_global_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('Failed to load global settings:', error);
      return null;
    }

    if (!data) {
      const { data: created } = await supabase
        .from('notification_global_settings')
        .insert({ id: 1 })
        .select()
        .single();
      return (created as NotificationGlobalSettings) || null;
    }

    return data as NotificationGlobalSettings;
  }

  async updateGlobalSettings(
    updates: Partial<Omit<NotificationGlobalSettings, 'id' | 'updated_at' | 'updated_by'>>
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    };

    const { error } = await supabase
      .from('notification_global_settings')
      .update(payload)
      .eq('id', 1);

    if (error) {
      console.error('Failed to update global settings:', error);
      throw new Error(error.message);
    }

    await auditService.logAction({
      action: 'update_notification_global_settings',
      resourceType: 'notification_global_settings',
      resourceId: '1',
      changes: updates,
    });

    return true;
  }

  /**
   * Upload a new app icon for notifications.
   * Stores in public `media` bucket under `notification-icons/`
   * and returns the public URL.
   */
  async uploadAppIcon(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `notification-icons/app-icon-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.error('Failed to upload app icon:', uploadError);
      throw new Error(uploadError.message);
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
    return urlData.publicUrl;
  }

  /**
   * Upload a default avatar fallback for notifications.
   */
  async uploadDefaultAvatar(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `notification-icons/default-avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.error('Failed to upload default avatar:', uploadError);
      throw new Error(uploadError.message);
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
    return urlData.publicUrl;
  }
}

export const notificationSettingsService = new NotificationSettingsService();

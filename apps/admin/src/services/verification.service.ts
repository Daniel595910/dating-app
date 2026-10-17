import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export interface VerificationUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: VerificationStatus;
  method: string;
  selfie_url: string | null;
  id_document_url: string | null;
  id_document_type: string | null;
  country_code: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  user?: VerificationUser;
}

export interface VerificationStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  totalApproved: number;
}

class VerificationService {
  /**
   * Fetch profiles for the given user_ids and return a Map for merging.
   * No FK exists between identity_verifications and profiles (both point at auth.users),
   * so we merge on the client.
   */
  private async fetchProfiles(userIds: string[]): Promise<Map<string, VerificationUser>> {
    const unique = Array.from(new Set(userIds)).filter(Boolean);
    if (unique.length === 0) return new Map();

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', unique);

    if (error || !data) {
      console.error('fetchProfiles failed:', error);
      return new Map();
    }

    return new Map(
      (data as VerificationUser[]).map((p) => [p.user_id, p])
    );
  }

  private mergeUser(
    rows: VerificationRequest[],
    profileMap: Map<string, VerificationUser>
  ): VerificationRequest[] {
    return rows.map((row) => ({
      ...row,
      user: profileMap.get(row.user_id),
    }));
  }

  async listPending(filters: { limit?: number; offset?: number } = {}): Promise<{
    items: VerificationRequest[];
    total: number;
    hasMore: boolean;
  }> {
    const { limit = 20, offset = 0 } = filters;

    const { data, error, count } = await supabase
      .from('identity_verifications')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('listPending failed:', error);
      return { items: [], total: 0, hasMore: false };
    }

    const rows = (data ?? []) as VerificationRequest[];
    const profileMap = await this.fetchProfiles(rows.map((r) => r.user_id));
    const items = this.mergeUser(rows, profileMap);
    const total = count ?? items.length;

    return { items, total, hasMore: offset + items.length < total };
  }

  async listByStatus(
    status: VerificationStatus | 'all',
    filters: { limit?: number; offset?: number } = {}
  ): Promise<{ items: VerificationRequest[]; total: number; hasMore: boolean }> {
    const { limit = 20, offset = 0 } = filters;

    let query = supabase
      .from('identity_verifications')
      .select('*', { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('listByStatus failed:', error);
      return { items: [], total: 0, hasMore: false };
    }

    const rows = (data ?? []) as VerificationRequest[];
    const profileMap = await this.fetchProfiles(rows.map((r) => r.user_id));
    const items = this.mergeUser(rows, profileMap);
    const total = count ?? items.length;

    return { items, total, hasMore: offset + items.length < total };
  }

  async getById(id: string): Promise<VerificationRequest | null> {
    const { data, error } = await supabase
      .from('identity_verifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as VerificationRequest;
    const profileMap = await this.fetchProfiles([row.user_id]);

    return { ...row, user: profileMap.get(row.user_id) };
  }

  async approve(id: string): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('identity_verifications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        rejection_reason: null,
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.logAction({
      action: 'verification.approve',
      resourceType: 'identity_verification',
      resourceId: id,
      changes: { status: 'approved' },
    });

    return { success: true };
  }

  async reject(id: string, reason: string): Promise<{ success: boolean; error?: string }> {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Rejection reason is required' };
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('identity_verifications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        rejection_reason: reason.trim(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.logAction({
      action: 'verification.reject',
      resourceType: 'identity_verification',
      resourceId: id,
      changes: { status: 'rejected', reason: reason.trim() },
    });

    return { success: true };
  }

  async getSignedUrl(path: string | null): Promise<string | null> {
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from('verification')
      .createSignedUrl(path, 300);

    if (error || !data) {
      console.error('getSignedUrl failed:', error);
      return null;
    }
    return data.signedUrl;
  }

  // ---- Admin-configurable example image ----

  /**
   * Reads the current selfie example URL from verification_settings.
   * Returns null if none has been uploaded yet.
   */
  async getSelfieExampleUrl(): Promise<string | null> {
    const { data, error } = await supabase
      .from('verification_settings')
      .select('value')
      .eq('key', 'selfie_example_url')
      .maybeSingle();

    if (error || !data) return null;
    return data.value ?? null;
  }

  /**
   * Uploads a new selfie example image to the public 'media' bucket
   * and updates verification_settings.selfie_example_url.
   * Returns the new public URL on success.
   */
  async uploadSelfieExample(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Store the example under a fixed path so old versions are always replaced.
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `verification-examples/selfie-example.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(path, file, {
        cacheControl: '300',      // short cache so admins see the change immediately
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      return { success: false, error: uploadErr.message };
    }

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(path);

    // Cache-bust the URL so users don't see the old image
    const url = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateErr } = await supabase
      .from('verification_settings')
      .update({
        value: url,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'selfie_example_url');

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    await auditService.logAction({
      action: 'update_verification_example',
      resourceType: 'verification_settings',
      resourceId: 'selfie_example_url',
      changes: { url },
    });

    return { success: true, url };
  }

  async getStats(): Promise<VerificationStats> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [pendingRes, approvedTodayRes, rejectedTodayRes, totalApprovedRes] = await Promise.all([
      supabase
        .from('identity_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('identity_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('reviewed_at', startOfDay.toISOString()),
      supabase
        .from('identity_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('reviewed_at', startOfDay.toISOString()),
      supabase
        .from('identity_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
    ]);

    return {
      pending: pendingRes.count ?? 0,
      approvedToday: approvedTodayRes.count ?? 0,
      rejectedToday: rejectedTodayRes.count ?? 0,
      totalApproved: totalApprovedRes.count ?? 0,
    };
  }
}

export const verificationService = new VerificationService();
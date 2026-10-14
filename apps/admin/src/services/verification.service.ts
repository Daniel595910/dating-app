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
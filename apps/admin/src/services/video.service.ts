import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface DiscoverVideo {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  status: string;
  privacy: string;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  user?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export interface VideoFilters {
  search?: string;
  status?: 'all' | 'pending' | 'approved' | 'rejected' | 'removed' | 'published';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

class VideoService {
  async getVideos(filters: VideoFilters = {}): Promise<{
    items: DiscoverVideo[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        search,
        status = 'all',
        dateFrom,
        dateTo,
        limit = 20,
        offset = 0,
      } = filters;

      let query = supabase.from('discover_videos').select('*', { count: 'exact' });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch videos:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = [...new Set((data || []).map((v: any) => v.user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, is_verified')
            .in('user_id', userIds);
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        } catch {}
      }

      let items: DiscoverVideo[] = (data || []).map((v: any) => ({
        ...v,
        user: profileMap.get(v.user_id)
          ? {
              display_name: profileMap.get(v.user_id)!.display_name,
              avatar_url: profileMap.get(v.user_id)!.avatar_url,
              is_verified: profileMap.get(v.user_id)!.is_verified || false,
            }
          : undefined,
      }));

      if (search && search.trim()) {
        const term = search.toLowerCase();
        items = items.filter(
          (v) =>
            v.caption?.toLowerCase().includes(term) ||
            v.user?.display_name?.toLowerCase().includes(term)
        );
      }

      return {
        items,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  async getReportedVideos(): Promise<{
    items: DiscoverVideo[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('target_id')
        .in('target_type', ['post', 'video'])
        .eq('status', 'pending');

      if (reportsError || !reports || reports.length === 0) {
        return { items: [], total: 0, hasMore: false };
      }

      const videoIds = [...new Set(reports.map((r: any) => r.target_id).filter(Boolean))];

      if (videoIds.length === 0) {
        return { items: [], total: 0, hasMore: false };
      }

      const { data, error, count } = await supabase
        .from('discover_videos')
        .select('*', { count: 'exact' })
        .in('id', videoIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch reported videos:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = [...new Set((data || []).map((v: any) => v.user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, is_verified')
            .in('user_id', userIds);
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        } catch {}
      }

      const items: DiscoverVideo[] = (data || []).map((v: any) => ({
        ...v,
        user: profileMap.get(v.user_id)
          ? {
              display_name: profileMap.get(v.user_id)!.display_name,
              avatar_url: profileMap.get(v.user_id)!.avatar_url,
              is_verified: profileMap.get(v.user_id)!.is_verified || false,
            }
          : undefined,
      }));

      return {
        items,
        total: count || 0,
        hasMore: false,
      };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  async approveVideo(videoId: string): Promise<boolean> {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('discover_videos')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq('id', videoId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'approve_video',
      resourceType: 'discover_video',
      resourceId: videoId,
    });

    return true;
  }

  async rejectVideo(videoId: string, reason: string): Promise<boolean> {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('discover_videos')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        rejection_reason: reason,
      })
      .eq('id', videoId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'reject_video',
      resourceType: 'discover_video',
      resourceId: videoId,
      changes: { reason },
    });

    return true;
  }

  async removeVideo(videoId: string): Promise<boolean> {
    const { error } = await supabase
      .from('discover_videos')
      .update({ status: 'removed' })
      .eq('id', videoId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'remove_video',
      resourceType: 'discover_video',
      resourceId: videoId,
    });

    return true;
  }

  async deleteVideo(videoId: string): Promise<boolean> {
    const { error } = await supabase
      .from('discover_videos')
      .delete()
      .eq('id', videoId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_video',
      resourceType: 'discover_video',
      resourceId: videoId,
    });

    return true;
  }

  async setAgeRestriction(videoId: string, restricted: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('discover_videos')
      .update({ privacy: restricted ? 'restricted' : 'public' } as any)
      .eq('id', videoId);

    if (error) {
      console.warn('Could not set age restriction:', error.message);
    }

    await auditService.logAction({
      action: restricted ? 'age_restrict_video' : 'remove_age_restriction',
      resourceType: 'discover_video',
      resourceId: videoId,
    });

    return true;
  }

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const safeCount = async (filter?: (q: any) => any) => {
      try {
        let q = supabase.from('discover_videos').select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const [total, pending, approved, rejected, removed, today] = await Promise.all([
      safeCount(),
      safeCount((q) => q.eq('status', 'pending')),
      safeCount((q) => q.eq('status', 'approved')),
      safeCount((q) => q.eq('status', 'rejected')),
      safeCount((q) => q.eq('status', 'removed')),
      safeCount((q) => q.gte('created_at', todayStart)),
    ]);

    return { total, pending, approved, rejected, removed, today };
  }
}

export const videoService = new VideoService();

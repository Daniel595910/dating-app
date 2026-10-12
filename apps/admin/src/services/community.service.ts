import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface Community {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  description?: string | null;
  country: string;
  country_code: string;
  state?: string | null;
  city?: string | null;
  parent_id?: string | null;
  member_count: number;
  post_count: number;
  moderators?: string[];
  rules?: string[];
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_private?: boolean;
  cover_url?: string | null;
  avatar_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityRequest {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  country: string;
  state: string | null;
  city: string | null;
  region_type: string | null;
  is_private: boolean | null;
  allow_join_requests: boolean | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  requester?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface CommunityFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'private' | 'featured';
  country?: string;
  sortBy?: 'created_at' | 'member_count' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CommunitiesResult {
  items: Community[];
  total: number;
  hasMore: boolean;
}

export interface RequestsResult {
  items: CommunityRequest[];
  total: number;
  hasMore: boolean;
}

class CommunityService {
  async getCommunities(filters: CommunityFilters = {}): Promise<CommunitiesResult> {
    const {
      search,
      status = 'all',
      country,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    let query = supabase.from('communities').select('*', { count: 'exact' });

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    if (country) {
      query = query.eq('country', country);
    }

    switch (status) {
      case 'active':
        query = query.eq('is_active', true);
        break;
      case 'inactive':
        query = query.eq('is_active', false);
        break;
      case 'private':
        query = query.eq('is_private', true);
        break;
      case 'featured':
        query = query.eq('is_featured', true);
        break;
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch communities:', error);
      throw new Error(error.message);
    }

    return {
      items: (data || []) as Community[],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async getCommunityById(id: string): Promise<Community | null> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Community;
  }

  async getPendingRequests(limit = 20, offset = 0): Promise<RequestsResult> {
    const { data, error, count } = await supabase
      .from('community_creation_requests')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch community requests:', error);
      return { items: [], total: 0, hasMore: false };
    }

    const requesterIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
    let profileMap = new Map<string, any>();

    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', requesterIds);
      profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    }

    const items: CommunityRequest[] = (data || []).map((r: any) => {
      const requester = profileMap.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        name: r.name,
        description: r.description,
        country: r.country,
        state: r.state,
        city: r.city,
        region_type: r.region_type,
        is_private: r.is_private,
        allow_join_requests: r.allow_join_requests,
        status: r.status,
        reviewed_by: r.reviewed_by,
        reviewed_at: r.reviewed_at,
        rejection_reason: r.rejection_reason,
        created_at: r.created_at,
        updated_at: r.updated_at,
        requester: requester
          ? { display_name: requester.display_name, avatar_url: requester.avatar_url }
          : undefined,
      };
    });

    return {
      items,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async approveRequest(requestId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: communityId, error } = await supabase.rpc('approve_community_creation_request', {
      p_request_id: requestId,
    });

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'approve_community_request',
      resourceType: 'community_request',
      resourceId: requestId,
      changes: { community_id: communityId },
    });

    return true;
  }

  async rejectRequest(requestId: string, reason: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('reject_community_creation_request', {
      p_request_id: requestId,
      p_reason: reason,
    });

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'reject_community_request',
      resourceType: 'community_request',
      resourceId: requestId,
      changes: { reason },
    });

    return true;
  }

  async updateCommunity(communityId: string, updates: Partial<Community>): Promise<boolean> {
    const { error } = await supabase
      .from('communities')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', communityId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'update_community',
      resourceType: 'community',
      resourceId: communityId,
      changes: updates,
    });

    return true;
  }

  async toggleActive(communityId: string, active: boolean): Promise<boolean> {
    return this.updateCommunity(communityId, { is_active: active });
  }

  async toggleFeatured(communityId: string, featured: boolean): Promise<boolean> {
    return this.updateCommunity(communityId, { is_featured: featured });
  }

  async deleteCommunity(communityId: string): Promise<boolean> {
    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', communityId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_community',
      resourceType: 'community',
      resourceId: communityId,
    });

    return true;
  }

  async getStats() {
    const results = await Promise.allSettled([
      supabase.from('communities').select('*', { count: 'exact', head: true }),
      supabase.from('communities').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('communities').select('*', { count: 'exact', head: true }).eq('is_private', true),
      supabase.from('community_creation_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const getCount = (r: any) =>
      r.status === 'fulfilled' && r.value && !r.value.error ? r.value.count || 0 : 0;

    return {
      total: getCount(results[0]),
      active: getCount(results[1]),
      private: getCount(results[2]),
      pending: getCount(results[3]),
    };
  }
}

export const communityService = new CommunityService();

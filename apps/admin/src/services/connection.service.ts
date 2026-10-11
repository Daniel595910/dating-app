import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface ConnectionRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: string;
  message: string | null;
  created_at: string;
  responded_at?: string | null;
  expires_at?: string | null;
  // Enriched
  requester?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  target?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export interface ConnectionFilters {
  search?: string;
  status?: 'all' | 'pending' | 'accepted' | 'declined' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

class ConnectionService {
  async getRequests(filters: ConnectionFilters = {}): Promise<{
    items: ConnectionRequest[];
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

      let query = supabase.from('connection_requests').select('*', { count: 'exact' });

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
        console.error('Failed to fetch connection requests:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.requester_id) userIds.add(r.requester_id);
        if (r.target_id) userIds.add(r.target_id);
      });

      let profileMap = new Map<string, any>();
      if (userIds.size > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, is_verified')
            .in('user_id', Array.from(userIds));
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        } catch {}
      }

      let items: ConnectionRequest[] = (data || []).map((r: any) => ({
        ...r,
        requester: profileMap.get(r.requester_id)
          ? {
              display_name: profileMap.get(r.requester_id)!.display_name,
              avatar_url: profileMap.get(r.requester_id)!.avatar_url,
              is_verified: profileMap.get(r.requester_id)!.is_verified || false,
            }
          : undefined,
        target: profileMap.get(r.target_id)
          ? {
              display_name: profileMap.get(r.target_id)!.display_name,
              avatar_url: profileMap.get(r.target_id)!.avatar_url,
              is_verified: profileMap.get(r.target_id)!.is_verified || false,
            }
          : undefined,
      }));

      if (search && search.trim()) {
        const term = search.toLowerCase();
        items = items.filter(
          (r) =>
            r.requester?.display_name?.toLowerCase().includes(term) ||
            r.target?.display_name?.toLowerCase().includes(term)
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

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const safeCount = async (filter?: (q: any) => any) => {
      try {
        let q = supabase.from('connection_requests').select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const [total, pending, accepted, declined, today, week] = await Promise.all([
      safeCount(),
      safeCount((q) => q.eq('status', 'pending')),
      safeCount((q) => q.eq('status', 'accepted')),
      safeCount((q) => q.eq('status', 'declined')),
      safeCount((q) => q.gte('created_at', todayStart)),
      safeCount((q) => q.gte('created_at', weekAgo)),
    ]);

    return { total, pending, accepted, declined, today, week };
  }

  async cancelRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase
      .from('connection_requests')
      .update({ status: 'cancelled', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'cancel_connection_request',
      resourceType: 'connection_request',
      resourceId: requestId,
    });

    return true;
  }

  async deleteRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase
      .from('connection_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_connection_request',
      resourceType: 'connection_request',
      resourceId: requestId,
    });

    return true;
  }
}

export const connectionService = new ConnectionService();

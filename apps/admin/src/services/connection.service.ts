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
        limit = 20,
        offset = 0,
      } = filters;

      const { data, error } = await supabase.rpc('admin_list_connection_requests', {
        p_status: status,
        p_search: search && search.trim() ? search.trim() : null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw new Error(error.message);

      const payload = (data || {}) as any;
      const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];

      const items: ConnectionRequest[] = rawItems.map((r: any) => ({
        id: r.id,
        requester_id: r.requester_id,
        target_id: r.target_id,
        status: r.status,
        message: r.message,
        created_at: r.created_at,
        responded_at: r.responded_at,
        expires_at: r.expires_at,
        requester: r.requester_display_name
          ? {
              display_name: r.requester_display_name,
              avatar_url: r.requester_avatar_url,
              is_verified: !!r.requester_is_verified,
            }
          : undefined,
        target: r.target_display_name
          ? {
              display_name: r.target_display_name,
              avatar_url: r.target_avatar_url,
              is_verified: !!r.target_is_verified,
            }
          : undefined,
      }));

      return {
        items,
        total: typeof payload.total === 'number' ? payload.total : Number(payload.total || 0),
        hasMore: !!payload.has_more,
      };
    } catch (err: any) {
      console.error('Failed to fetch connection requests:', err);
      return { items: [], total: 0, hasMore: false };
    }
  }

  async getStats() {
    try {
      const { data, error } = await supabase.rpc('admin_connection_stats');
      if (error) throw new Error(error.message);
      const payload = (data || {}) as any;
      const n = (v: any) => (typeof v === 'number' ? v : Number(v || 0));
      return {
        total: n(payload.total),
        pending: n(payload.pending),
        accepted: n(payload.accepted),
        declined: n(payload.declined),
        today: n(payload.today),
        week: n(payload.week),
      };
    } catch (err) {
      console.error('Failed to fetch connection stats:', err);
      return { total: 0, pending: 0, accepted: 0, declined: 0, today: 0, week: 0 };
    }
  }

  async cancelRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase.rpc('admin_cancel_connection_request', {
      p_request_id: requestId,
    });

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'cancel_connection_request',
      resourceType: 'connection_request',
      resourceId: requestId,
    });

    return true;
  }

  async deleteRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase.rpc('admin_delete_connection_request', {
      p_request_id: requestId,
    });

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

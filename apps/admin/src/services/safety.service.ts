import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocker?: {
    display_name: string;
    avatar_url: string | null;
  };
  blocked?: {
    display_name: string;
    avatar_url: string | null;
  };
  reason?: string | null;
}

export interface SafetyEvent {
  id: string;
  user_id: string;
  event_type: string;
  severity: string;
  details: Record<string, any> | null;
  created_at: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface SafetyAuditLog {
  id: string;
  user_id: string;
  action: string;
  target_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface BlockFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

class SafetyService {
  async getBlocks(filters: BlockFilters = {}): Promise<{
    items: Block[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        search,
        dateFrom,
        dateTo,
        limit = 20,
        offset = 0,
      } = filters;

      let query = supabase.from('blocks').select('*', { count: 'exact' });

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch blocks:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = new Set<string>();
      (data || []).forEach((b: any) => {
        if (b.blocker_id) userIds.add(b.blocker_id);
        if (b.blocked_id) userIds.add(b.blocked_id);
      });

      let profileMap = new Map<string, any>();
      if (userIds.size > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', Array.from(userIds));
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        } catch {}
      }

      let items: Block[] = (data || []).map((b: any) => ({
        ...b,
        blocker: profileMap.get(b.blocker_id)
          ? {
              display_name: profileMap.get(b.blocker_id)!.display_name,
              avatar_url: profileMap.get(b.blocker_id)!.avatar_url,
            }
          : undefined,
        blocked: profileMap.get(b.blocked_id)
          ? {
              display_name: profileMap.get(b.blocked_id)!.display_name,
              avatar_url: profileMap.get(b.blocked_id)!.avatar_url,
            }
          : undefined,
      }));

      if (search && search.trim()) {
        const term = search.toLowerCase();
        items = items.filter(
          (b) =>
            b.blocker?.display_name?.toLowerCase().includes(term) ||
            b.blocked?.display_name?.toLowerCase().includes(term)
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

  async unblockUser(blockId: string): Promise<boolean> {
    const { error } = await supabase.from('blocks').delete().eq('id', blockId);
    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'unblock_user',
      resourceType: 'block',
      resourceId: blockId,
    });

    return true;
  }

  async getSafetyEvents(filters: BlockFilters = {}): Promise<{
    items: SafetyEvent[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { limit = 20, offset = 0 } = filters;

      const { data, error, count } = await supabase
        .from('safety_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch safety events:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = [...new Set((data || []).map((e: any) => e.user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        } catch {}
      }

      const items: SafetyEvent[] = (data || []).map((e: any) => ({
        ...e,
        user: profileMap.get(e.user_id)
          ? {
              display_name: profileMap.get(e.user_id)!.display_name,
              avatar_url: profileMap.get(e.user_id)!.avatar_url,
            }
          : undefined,
      }));

      return {
        items,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  async getSafetyAuditLog(filters: BlockFilters = {}): Promise<{
    items: SafetyAuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { limit = 20, offset = 0 } = filters;

      const { data, error, count } = await supabase
        .from('safety_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch safety audit log:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = [...new Set((data || []).map((e: any) => e.user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        } catch {}
      }

      const items: SafetyAuditLog[] = (data || []).map((e: any) => ({
        ...e,
        user: profileMap.get(e.user_id)
          ? {
              display_name: profileMap.get(e.user_id)!.display_name,
              avatar_url: profileMap.get(e.user_id)!.avatar_url,
            }
          : undefined,
      }));

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

    const safeCount = async (table: string, filter?: (q: any) => any) => {
      try {
        let q = supabase.from(table).select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const [
      totalBlocks,
      blocksToday,
      totalEvents,
      eventsWeek,
    ] = await Promise.all([
      safeCount('blocks'),
      safeCount('blocks', (q) => q.gte('created_at', todayStart)),
      safeCount('safety_events'),
      safeCount('safety_events', (q) => q.gte('created_at', weekAgo)),
    ]);

    return {
      totalBlocks,
      blocksToday,
      totalEvents,
      eventsWeek,
    };
  }
}

export const safetyService = new SafetyService();

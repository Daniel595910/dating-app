import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  match_score?: number | null;
  status?: string | null;
  created_at: string;
  updated_at?: string;
  // Enriched
  user1?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  user2?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  message_count?: number;
  has_conversation?: boolean;
}

export interface SwipeRecord {
  id: string;
  swiper_id: string;
  target_id: string;
  action: 'like' | 'pass' | 'super_like' | 'reject';
  created_at: string;
  swiper?: {
    display_name: string;
    avatar_url: string | null;
  };
  target?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface MatchFilters {
  search?: string;
  status?: 'all' | 'recent' | 'active' | 'suspicious';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'created_at' | 'match_score';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

class MatchService {
  async getMatches(filters: MatchFilters = {}): Promise<{
    items: Match[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { status = 'all', limit = 20, offset = 0, search } = filters;
      const filter = status === 'recent' ? 'recent' : 'all';

      const { data, error } = await supabase.rpc('admin_list_matches', {
        p_filter: filter,
        p_search: search && search.trim() ? search.trim() : null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw new Error(error.message);

      const payload = (data || {}) as any;
      const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];
      const items = rawItems.map((r: any) => this.shapeMatch(r));

      return {
        items,
        total: typeof payload.total === 'number' ? payload.total : Number(payload.total || 0),
        hasMore: !!payload.has_more,
      };
    } catch (err: any) {
      console.error('Failed to fetch matches:', err);
      return { items: [], total: 0, hasMore: false };
    }
  }

  private shapeMatch(r: any): Match {
    return {
      id: r.id,
      user1_id: r.user1_id,
      user2_id: r.user2_id,
      match_score: r.match_score,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user1: r.user1_display_name
        ? {
            display_name: r.user1_display_name,
            avatar_url: r.user1_avatar_url,
            is_verified: !!r.user1_is_verified,
          }
        : undefined,
      user2: r.user2_display_name
        ? {
            display_name: r.user2_display_name,
            avatar_url: r.user2_avatar_url,
            is_verified: !!r.user2_is_verified,
          }
        : undefined,
    };
  }

  async getStats() {
    try {
      const { data, error } = await supabase.rpc('admin_match_stats');
      if (error) throw new Error(error.message);
      const payload = (data || {}) as any;
      const n = (v: any) => (typeof v === 'number' ? v : Number(v || 0));
      return {
        total: n(payload.total),
        today: n(payload.today),
        week: n(payload.week),
        month: n(payload.month),
        avgScore: n(payload.avg_score),
      };
    } catch (err) {
      console.error('Failed to fetch match stats:', err);
      return { total: 0, today: 0, week: 0, month: 0, avgScore: 0 };
    }
  }

  async getDailyMatchSeries(days: number = 30): Promise<{ date: string; value: number }[]> {
    try {
      const { data, error } = await supabase.rpc('admin_match_daily_series', { p_days: days });
      if (error) throw new Error(error.message);
      const rows = Array.isArray(data) ? (data as any[]) : [];
      return rows.map((r) => ({ date: String(r.date), value: Number(r.value) || 0 }));
    } catch (err) {
      console.error('Failed to fetch match series:', err);
      return [];
    }
  }

  async getTopMatchesByScore(limit = 10): Promise<Match[]> {
    try {
      const { data, error } = await supabase.rpc('admin_list_matches', {
        p_filter: 'top',
        p_search: null,
        p_limit: limit,
        p_offset: 0,
      });
      if (error) throw new Error(error.message);
      const payload = (data || {}) as any;
      const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];
      return rawItems.map((r: any) => this.shapeMatch(r));
    } catch (err) {
      console.error('Failed to fetch top matches:', err);
      return [];
    }
  }

  async flagMatch(matchId: string, reason: string): Promise<boolean> {
    await auditService.logAction({
      action: 'flag_match',
      resourceType: 'match',
      resourceId: matchId,
      changes: { reason },
    });
    return true;
  }

  async deleteMatch(matchId: string): Promise<boolean> {
    const { error } = await supabase.rpc('admin_delete_match', { p_match_id: matchId });
    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_match',
      resourceType: 'match',
      resourceId: matchId,
    });

    return true;
  }

  async getSuspiciousMatches(): Promise<Match[]> {
    try {
      const { data, error } = await supabase.rpc('admin_list_matches', {
        p_filter: 'suspicious',
        p_search: null,
        p_limit: 20,
        p_offset: 0,
      });
      if (error) throw new Error(error.message);
      const payload = (data || {}) as any;
      const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];
      return rawItems.map((r: any) => this.shapeMatch(r));
    } catch (err) {
      console.error('Failed to fetch suspicious matches:', err);
      return [];
    }
  }
}

export const matchService = new MatchService();

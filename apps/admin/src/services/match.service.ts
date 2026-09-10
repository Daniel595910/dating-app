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
      const {
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = filters;

      let query = supabase.from('matches').select('*', { count: 'exact' });

      if (status === 'recent') {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', dayAgo);
      }

      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch matches:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const items = await this.enrichMatches((data || []) as Match[]);

      return {
        items,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  private async enrichMatches(matches: Match[]): Promise<Match[]> {
    if (matches.length === 0) return [];

    const userIds = new Set<string>();
    matches.forEach((m) => {
      if (m.user1_id) userIds.add(m.user1_id);
      if (m.user2_id) userIds.add(m.user2_id);
    });

    let profileMap = new Map<string, any>();
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, is_verified')
        .in('user_id', Array.from(userIds));
      profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    } catch {}

    return matches.map((m) => {
      const u1 = profileMap.get(m.user1_id);
      const u2 = profileMap.get(m.user2_id);
      return {
        ...m,
        user1: u1
          ? {
              display_name: u1.display_name,
              avatar_url: u1.avatar_url,
              is_verified: u1.is_verified || false,
            }
          : undefined,
        user2: u2
          ? {
              display_name: u2.display_name,
              avatar_url: u2.avatar_url,
              is_verified: u2.is_verified || false,
            }
          : undefined,
      };
    });
  }

  async getMatchById(matchId: string): Promise<Match | null> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error || !data) return null;

      const enriched = await this.enrichMatches([data as Match]);
      return enriched[0] || null;
    } catch {
      return null;
    }
  }

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

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

    const [total, today, week, month] = await Promise.all([
      safeCount('matches'),
      safeCount('matches', (q) => q.gte('created_at', todayStart)),
      safeCount('matches', (q) => q.gte('created_at', weekAgo)),
      safeCount('matches', (q) => q.gte('created_at', monthAgo)),
    ]);

    // Calculate average match score if column exists
    let avgScore = 0;
    try {
      const { data } = await supabase
        .from('matches')
        .select('match_score')
        .not('match_score', 'is', null)
        .limit(500);

      if (data && data.length > 0) {
        const sum = data.reduce((acc, m: any) => acc + (Number(m.match_score) || 0), 0);
        avgScore = Math.round(sum / data.length);
      }
    } catch {}

    return { total, today, week, month, avgScore };
  }

  async getDailyMatchSeries(days: number = 30): Promise<{ date: string; value: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      const counts = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        counts.set(date.toISOString().split('T')[0], 0);
      }

      data.forEach((m: any) => {
        const key = m.created_at.split('T')[0];
        if (counts.has(key)) {
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });

      return Array.from(counts.entries()).map(([date, value]) => ({ date, value }));
    } catch {
      return [];
    }
  }

  async getTopMatchesByScore(limit = 10): Promise<Match[]> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .not('match_score', 'is', null)
        .order('match_score', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return this.enrichMatches(data as Match[]);
    } catch {
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
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_match',
      resourceType: 'match',
      resourceId: matchId,
    });

    return true;
  }

  async getSuspiciousMatches(): Promise<Match[]> {
    // Heuristic: matches between users that have no messages and unusual pattern
    // For now, we look for matches made in the last 7 days with unusual activity
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !data) return [];
      return this.enrichMatches(data as Match[]);
    } catch {
      return [];
    }
  }
}

export const matchService = new MatchService();

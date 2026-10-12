import { supabase } from '@/config/supabase.client';

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AnalyticsOverview {
  users: {
    total: number;
    today: number;
    week: number;
    month: number;
    growth: number; // % change vs previous period
  };
  posts: {
    total: number;
    today: number;
    week: number;
    month: number;
    growth: number;
  };
  matches: {
    total: number;
    today: number;
    week: number;
    month: number;
    growth: number;
  };
  engagement: {
    activeUsers: number;
    averageSessionMinutes: number;
    retentionRate: number;
  };
}

export interface DemographicsData {
  gender: Record<string, number>;
  ageRanges: Record<string, number>;
  topCountries: { country: string; count: number }[];
  topInterests: { interest: string; count: number }[];
}

class AnalyticsService {
  async getOverview(): Promise<AnalyticsOverview> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // Helper for safe counts
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
      totalUsers, usersToday, usersWeek, usersMonth, usersPrevMonth,
      totalPosts, postsToday, postsWeek, postsMonth, postsPrevMonth,
      totalMatches, matchesToday, matchesWeek, matchesMonth, matchesPrevMonth,
      activeUsers,
    ] = await Promise.all([
      safeCount('profiles'),
      safeCount('profiles', (q) => q.gte('created_at', todayStart)),
      safeCount('profiles', (q) => q.gte('created_at', weekAgo)),
      safeCount('profiles', (q) => q.gte('created_at', monthAgo)),
      safeCount('profiles', (q) => q.gte('created_at', twoMonthsAgo).lt('created_at', monthAgo)),
      safeCount('posts'),
      safeCount('posts', (q) => q.gte('created_at', todayStart)),
      safeCount('posts', (q) => q.gte('created_at', weekAgo)),
      safeCount('posts', (q) => q.gte('created_at', monthAgo)),
      safeCount('posts', (q) => q.gte('created_at', twoMonthsAgo).lt('created_at', monthAgo)),
      safeCount('matches'),
      safeCount('matches', (q) => q.gte('created_at', todayStart)),
      safeCount('matches', (q) => q.gte('created_at', weekAgo)),
      safeCount('matches', (q) => q.gte('created_at', monthAgo)),
      safeCount('matches', (q) => q.gte('created_at', twoMonthsAgo).lt('created_at', monthAgo)),
      safeCount('presence', (q) => q.eq('is_online', true)),
    ]);

    const growth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      users: {
        total: totalUsers,
        today: usersToday,
        week: usersWeek,
        month: usersMonth,
        growth: growth(usersMonth, usersPrevMonth),
      },
      posts: {
        total: totalPosts,
        today: postsToday,
        week: postsWeek,
        month: postsMonth,
        growth: growth(postsMonth, postsPrevMonth),
      },
      matches: {
        total: totalMatches,
        today: matchesToday,
        week: matchesWeek,
        month: matchesMonth,
        growth: growth(matchesMonth, matchesPrevMonth),
      },
      engagement: {
        activeUsers,
        averageSessionMinutes: 0, // TODO: track sessions
        retentionRate: 0, // TODO: calculate from returning users
      },
    };
  }

  async getUserGrowthSeries(days: number = 30): Promise<TimeSeriesPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      // Group by date
      const series = this.groupByDate(data, days);
      return series;
    } catch (err) {
      console.error('Failed to fetch user growth:', err);
      return [];
    }
  }

  async getPostActivitySeries(days: number = 30): Promise<TimeSeriesPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return this.groupByDate(data, days);
    } catch (err) {
      console.error('Failed to fetch post activity:', err);
      return [];
    }
  }

  async getMatchActivitySeries(days: number = 30): Promise<TimeSeriesPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return this.groupByDate(data, days);
    } catch (err) {
      console.error('Failed to fetch match activity:', err);
      return [];
    }
  }

  private groupByDate(data: any[], days: number): TimeSeriesPoint[] {
    const counts = new Map<string, number>();

    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0] ?? '';
      if (key) counts.set(key, 0);
    }

    // Count by date
    data.forEach((item) => {
      const key = item.created_at.split('T')[0];
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    return Array.from(counts.entries()).map(([date, value]) => ({ date, value }));
  }

  async getDemographics(): Promise<DemographicsData> {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('gender, birth_date, location, interests')
        .limit(1000);

      const gender: Record<string, number> = {};
      const ageRanges: Record<string, number> = {
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55+': 0,
      };
      const countries: Record<string, number> = {};
      const interestCounts: Record<string, number> = {};

      (profiles || []).forEach((p: any) => {
        // Gender
        if (p.gender) {
          gender[p.gender] = (gender[p.gender] || 0) + 1;
        }

        // Age
        if (p.birth_date) {
          const age = Math.floor(
            (Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );
          if (age < 25) ageRanges['18-24'] = (ageRanges['18-24'] ?? 0) + 1;
          else if (age < 35) ageRanges['25-34'] = (ageRanges['25-34'] ?? 0) + 1;
          else if (age < 45) ageRanges['35-44'] = (ageRanges['35-44'] ?? 0) + 1;
          else if (age < 55) ageRanges['45-54'] = (ageRanges['45-54'] ?? 0) + 1;
          else ageRanges['55+'] = (ageRanges['55+'] ?? 0) + 1;
        }

        // Location
        const country = p.location?.country;
        if (country) {
          countries[country] = (countries[country] || 0) + 1;
        }

        // Interests
        if (Array.isArray(p.interests)) {
          p.interests.forEach((i: string) => {
            interestCounts[i] = (interestCounts[i] || 0) + 1;
          });
        }
      });

      const topCountries = Object.entries(countries)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topInterests = Object.entries(interestCounts)
        .map(([interest, count]) => ({ interest, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return { gender, ageRanges, topCountries, topInterests };
    } catch (err) {
      console.error('Failed to fetch demographics:', err);
      return { gender: {}, ageRanges: {}, topCountries: [], topInterests: [] };
    }
  }
}

export const analyticsService = new AnalyticsService();

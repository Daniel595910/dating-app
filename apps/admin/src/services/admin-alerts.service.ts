import { supabase } from '@/config/supabase.client';

export interface AlertItem {
  id: string;
  label: string;
  count: number;
  priority: 'high' | 'medium' | 'info';
  icon: string; // lucide icon name — resolved by the component
  route: string;
}

export interface AdminAlertsResult {
  items: AlertItem[];
  total: number;
  hasHighPriority: boolean;
  fetchedAt: string;
}

class AdminAlertsService {
  private async count(table: string, filters: Record<string, any> = {}, gteCol?: string, gteValue?: string, extra?: (q: any) => any): Promise<number> {
    try {
      let q = supabase.from(table).select('*', { count: 'exact', head: true });
      for (const [key, value] of Object.entries(filters)) {
        q = q.eq(key, value);
      }
      if (gteCol && gteValue) q = q.gte(gteCol, gteValue);
      if (extra) q = extra(q);
      const { count, error } = await q;
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  async getAlerts(): Promise<AdminAlertsResult> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const [
      pendingVerif,
      openReports,
      criticalReports,
      flaggedPosts,
      flaggedComments,
      locationMismatch,
      banned24h,
      newSignups24h,
      newVips24h,
      pendingDiscover,
      recentPayments,
      recentLogins,
      matches24h,
      messages1h,
    ] = await Promise.all([
      // High priority
      this.count('identity_verifications', { status: 'pending' }),
      this.count('reports', { status: 'open' }),
      this.count('reports', { status: 'open', severity: 'critical' }),
      this.count('posts', { is_hidden: false }, undefined, undefined, (q) => q.gt('report_count', 0)),
      this.count('comments', { is_hidden: false }, undefined, undefined, (q) => q.gt('report_count', 0)),
      this.count('profiles', { location_signals_match: false }, undefined, undefined, (q) => q.is('deleted_at', null)),
      this.count('profiles', { is_banned: true }, 'banned_at', dayAgo),
      // Medium priority
      this.count('profiles', {}, 'created_at', dayAgo),
      this.count('profiles', { is_vip: true }, 'updated_at', dayAgo),
      this.count('posts', { discover_status: 'pending' }),
      this.count('payments', { status: 'success' }, 'created_at', dayAgo),
      this.count('login_verifications', {}, 'created_at', dayAgo, (q) => q.not('verified_at', 'is', null)),
      // Info
      this.count('matches', {}, 'created_at', dayAgo),
      this.count('messages', {}, 'created_at', hourAgo),
    ]);

    const items: AlertItem[] = [
      { id: 'pending-verifications', label: 'pending verification' + (pendingVerif === 1 ? '' : 's'), count: pendingVerif, priority: 'high', icon: 'ShieldCheck', route: '/verifications' },
      { id: 'open-reports', label: 'open report' + (openReports === 1 ? '' : 's'), count: openReports, priority: 'high', icon: 'Flag', route: '/reports' },
      { id: 'critical-reports', label: 'critical report' + (criticalReports === 1 ? '' : 's'), count: criticalReports, priority: 'high', icon: 'AlertTriangle', route: '/reports' },
      { id: 'flagged-posts', label: 'flagged post' + (flaggedPosts === 1 ? '' : 's'), count: flaggedPosts, priority: 'high', icon: 'FileWarning', route: '/moderation' },
      { id: 'flagged-comments', label: 'flagged comment' + (flaggedComments === 1 ? '' : 's'), count: flaggedComments, priority: 'high', icon: 'MessageSquare', route: '/moderation' },
      { id: 'location-mismatch', label: 'location mismatch', count: locationMismatch, priority: 'high', icon: 'MapPin', route: '/safety' },
      { id: 'banned-24h', label: 'new ban' + (banned24h === 1 ? '' : 's') + ' (24h)', count: banned24h, priority: 'high', icon: 'Ban', route: '/safety' },
      { id: 'new-signups', label: 'new signup' + (newSignups24h === 1 ? '' : 's') + ' (24h)', count: newSignups24h, priority: 'medium', icon: 'UserPlus', route: '/users' },
      { id: 'new-vips', label: 'new VIP' + (newVips24h === 1 ? '' : 's') + ' (24h)', count: newVips24h, priority: 'medium', icon: 'Crown', route: '/vip' },
      { id: 'pending-discover', label: 'discover pending review', count: pendingDiscover, priority: 'medium', icon: 'Video', route: '/discover-videos' },
      { id: 'recent-payments', label: 'payment' + (recentPayments === 1 ? '' : 's') + ' (24h)', count: recentPayments, priority: 'medium', icon: 'DollarSign', route: '/payments' },
      { id: 'recent-logins', label: 'new device login' + (recentLogins === 1 ? '' : 's') + ' (24h)', count: recentLogins, priority: 'medium', icon: 'KeyRound', route: '/audit-log' },
      { id: 'matches-24h', label: 'match' + (matches24h === 1 ? '' : 'es') + ' (24h)', count: matches24h, priority: 'info', icon: 'Heart', route: '/matches' },
      { id: 'messages-1h', label: 'message' + (messages1h === 1 ? '' : 's') + ' (1h)', count: messages1h, priority: 'info', icon: 'MessageCircle', route: '/analytics' },
    ];

    // Filter out zero-count items
    const visible = items.filter((i) => i.count > 0);

    const total = visible.reduce((sum, i) => sum + i.count, 0);
    const hasHighPriority = visible.some((i) => i.priority === 'high');

    return {
      items: visible,
      total,
      hasHighPriority,
      fetchedAt: new Date().toISOString(),
    };
  }
}

export const adminAlertsService = new AdminAlertsService();

import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type NotificationType =
  | 'match'
  | 'message'
  | 'like'
  | 'comment'
  | 'mention'
  | 'system'
  | 'verification'
  | 'vip'
  | 'report'
  | 'community';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: string;
  created_at: string;
  read_at?: string | null;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface BroadcastInput {
  title: string;
  body: string;
  type: NotificationType;
  targetAudience: 'all' | 'verified' | 'vip' | 'specific';
  specificUserIds?: string[];
  data?: Record<string, any>;
}

export interface NotificationFilters {
  search?: string;
  type?: NotificationType | 'all';
  status?: 'all' | 'unread' | 'read' | 'archived';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

class NotificationService {
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    items: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        search,
        type = 'all',
        status = 'all',
        dateFrom,
        dateTo,
        limit = 30,
        offset = 0,
      } = filters;

      let query = supabase.from('notifications').select('*', { count: 'exact' });

      if (type !== 'all') query = query.eq('type', type);
      if (status !== 'all') query = query.eq('status', status);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch notifications:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = [...new Set((data || []).map((n: any) => n.user_id).filter(Boolean))];
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

      let items: Notification[] = (data || []).map((n: any) => ({
        ...n,
        user: profileMap.get(n.user_id)
          ? {
              display_name: profileMap.get(n.user_id)!.display_name,
              avatar_url: profileMap.get(n.user_id)!.avatar_url,
            }
          : undefined,
      }));

      if (search && search.trim()) {
        const term = search.toLowerCase();
        items = items.filter(
          (n) =>
            n.title?.toLowerCase().includes(term) ||
            n.body?.toLowerCase().includes(term) ||
            n.user?.display_name?.toLowerCase().includes(term)
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

  async sendBroadcast(input: BroadcastInput): Promise<{ sent: number; failed: number }> {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    // Get target users
    let userIds: string[] = [];

    if (input.targetAudience === 'specific') {
      userIds = input.specificUserIds || [];
    } else {
      let query = supabase.from('profiles').select('user_id');

      if (input.targetAudience === 'verified') {
        query = query.eq('is_verified', true);
      } else if (input.targetAudience === 'vip') {
        query = query.eq('is_vip', true);
      }

      const { data: users } = await query.limit(10000);
      userIds = (users || []).map((u: any) => u.user_id);
    }

    if (userIds.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Insert notifications in batches
    const batchSize = 500;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const notifications = batch.map((userId) => ({
        user_id: userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data || {},
        status: 'unread',
      }));

      try {
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) {
          console.error('Batch insert failed:', error);
          failed += batch.length;
        } else {
          sent += batch.length;
        }
      } catch (err) {
        console.error('Batch insert exception:', err);
        failed += batch.length;
      }
    }

    await auditService.logAction({
      action: 'send_broadcast_notification',
      resourceType: 'notification',
      changes: {
        title: input.title,
        audience: input.targetAudience,
        sent,
        failed,
      },
    });

    return { sent, failed };
  }

  async deleteNotification(id: string): Promise<boolean> {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_notification',
      resourceType: 'notification',
      resourceId: id,
    });

    return true;
  }

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const safeCount = async (filter?: (q: any) => any) => {
      try {
        let q = supabase.from('notifications').select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const [total, today, week, unread] = await Promise.all([
      safeCount(),
      safeCount((q) => q.gte('created_at', todayStart)),
      safeCount((q) => q.gte('created_at', weekAgo)),
      safeCount((q) => q.eq('status', 'unread')),
    ]);

    return { total, today, week, unread };
  }

  async getRecentBroadcasts(limit = 5): Promise<Notification[]> {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'system')
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []) as Notification[];
    } catch {
      return [];
    }
  }
}

export const notificationService = new NotificationService();

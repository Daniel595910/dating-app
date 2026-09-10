import { supabase } from '@/config/supabase.client';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin?: {
    display_name: string;
    avatar_url: string | null;
    role: string | null;
  };
}

export interface AuditFilters {
  action?: string;
  resourceType?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface AuditResult {
  logs: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

export interface LogActionParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
}

class AuditService {
  async logAction(params: LogActionParams): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the RPC. The function may return UUID or VOID - both are fine.
      await supabase.rpc('log_audit_entry', {
        p_user_id: user.id,
        p_action: params.action,
        p_resource_type: params.resourceType,
        p_resource_id: params.resourceId || null,
        p_changes: params.changes || null,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
      });
    } catch (err) {
      // Never throw - logging should never break the app
      console.error('Failed to log audit entry:', err);
    }
  }

  async getLogs(filters: AuditFilters = {}): Promise<AuditResult> {
    const {
      action,
      resourceType,
      userId,
      search,
      dateFrom,
      dateTo,
      limit = 50,
      offset = 0,
    } = filters;

    let query = supabase.from('audit_logs').select('*', { count: 'exact' });

    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    if (resourceType && resourceType !== 'all') {
      query = query.eq('resource_type', resourceType);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      throw new Error(error.message);
    }

    // Enrich with admin profiles
    const adminIds = [...new Set((data || []).map((log: any) => log.user_id).filter(Boolean))];
    let profileMap = new Map<string, any>();

    if (adminIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, role')
          .in('user_id', adminIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      } catch (err) {
        console.warn('Failed to enrich audit logs:', err);
      }
    }

    const logs: AuditLogEntry[] = (data || []).map((log: any) => {
      const admin = profileMap.get(log.user_id);
      return {
        id: log.id,
        user_id: log.user_id,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        changes: log.changes,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
        admin: admin
          ? {
              display_name: admin.display_name,
              avatar_url: admin.avatar_url,
              role: admin.role,
            }
          : undefined,
      };
    });

    // Client-side search
    let filtered = logs;
    if (search && search.trim()) {
      const term = search.toLowerCase();
      filtered = logs.filter(
        (log) =>
          log.action.toLowerCase().includes(term) ||
          log.resource_type.toLowerCase().includes(term) ||
          log.admin?.display_name?.toLowerCase().includes(term) ||
          log.resource_id?.toLowerCase().includes(term)
      );
    }

    return {
      logs: filtered,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async getActionTypes(): Promise<string[]> {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('action')
        .limit(1000);

      const unique = [...new Set((data || []).map((l: any) => l.action).filter(Boolean))];
      return (unique as string[]).sort();
    } catch {
      return [];
    }
  }

  async getResourceTypes(): Promise<string[]> {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('resource_type')
        .limit(1000);

      const unique = [...new Set((data || []).map((l: any) => l.resource_type).filter(Boolean))];
      return (unique as string[]).sort();
    } catch {
      return [];
    }
  }

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const results = await Promise.allSettled([
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    ]);

    const getCount = (r: any) => (r.status === 'fulfilled' && r.value && !r.value.error ? r.value.count || 0 : 0);

    return {
      total: getCount(results[0]),
      today: getCount(results[1]),
      week: getCount(results[2]),
    };
  }
}

export const auditService = new AuditService();

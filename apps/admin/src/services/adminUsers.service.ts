import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support_agent' | 'analyst';

export interface AdminUser {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  email?: string | null;
  role: AdminRole;
  is_admin: boolean;
  created_at: string;
  last_active?: string;
  total_actions?: number;
}

export interface AdminFilters {
  search?: string;
  role?: AdminRole | 'all';
  limit?: number;
  offset?: number;
}

export interface AdminActivity {
  action: string;
  resource_type: string;
  created_at: string;
}

class AdminUsersService {
  async getAdmins(filters: AdminFilters = {}): Promise<{
    items: AdminUser[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { search, role = 'all', limit = 20, offset = 0 } = filters;

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('is_admin', true);

      if (role !== 'all') {
        query = query.eq('role', role);
      }

      if (search && search.trim()) {
        query = query.ilike('display_name', `%${search.trim()}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch admins:', error);
        return { items: [], total: 0, hasMore: false };
      }

      return {
        items: (data || []) as AdminUser[],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  async getAdminActivity(userId: string, limit = 10): Promise<AdminActivity[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, resource_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return [];
      return (data || []) as AdminActivity[];
    } catch {
      return [];
    }
  }

  async getAdminStats(userId: string): Promise<{ total: number; today: number; week: number }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const safeCount = async (filter?: (q: any) => any) => {
      try {
        let q = supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const [total, today, week] = await Promise.all([
      safeCount(),
      safeCount((q) => q.gte('created_at', todayStart)),
      safeCount((q) => q.gte('created_at', weekAgo)),
    ]);

    return { total, today, week };
  }

  async updateRole(userId: string, role: AdminRole): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        is_admin: role !== 'analyst' || true, // all these roles are admin
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'update_admin_role',
      resourceType: 'profile',
      resourceId: userId,
      changes: { role },
    });

    return true;
  }

  async revokeAdmin(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        role: 'user',
        is_admin: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'revoke_admin',
      resourceType: 'profile',
      resourceId: userId,
    });

    return true;
  }

  async promoteToAdmin(userId: string, role: AdminRole): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        is_admin: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'promote_to_admin',
      resourceType: 'profile',
      resourceId: userId,
      changes: { role },
    });

    return true;
  }

  async searchNonAdminUsers(query: string, limit = 10): Promise<AdminUser[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, role, is_admin, created_at')
        .ilike('display_name', `%${query.trim()}%`)
        .or('is_admin.is.null,is_admin.eq.false')
        .limit(limit);

      if (error) return [];
      return (data || []) as AdminUser[];
    } catch {
      return [];
    }
  }
}

export const adminUsersService = new AdminUsersService();

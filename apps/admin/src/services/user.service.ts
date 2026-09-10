import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface AdminUserRecord {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  is_admin: boolean;
  is_verified: boolean;
  is_vip: boolean;
  gender: string | null;
  birth_date: string | null;
  location: any;
  created_at: string;
  updated_at: string;
  email?: string | null;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: 'all' | 'active' | 'verified' | 'unverified' | 'vip' | 'admin' | 'banned';
  sortBy?: 'created_at' | 'display_name' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface UsersResult {
  users: AdminUserRecord[];
  total: number;
  hasMore: boolean;
}

class UserService {
  async getUsers(filters: UserFilters = {}): Promise<UsersResult> {
    const {
      search,
      role,
      status = 'all',
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Search
    if (search && search.trim()) {
      query = query.ilike('display_name', `%${search.trim()}%`);
    }

    // Role filter
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Status filter
    switch (status) {
      case 'verified':
        query = query.eq('is_verified', true);
        break;
      case 'unverified':
        query = query.eq('is_verified', false);
        break;
      case 'vip':
        query = query.eq('is_vip', true);
        break;
      case 'admin':
        query = query.eq('is_admin', true);
        break;
      case 'active':
        query = query.eq('is_admin', false).eq('is_vip', false);
        break;
    }

    // Sort
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch users:', error);
      throw new Error(error.message);
    }

    return {
      users: (data || []) as AdminUserRecord[],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async getUserById(userId: string): Promise<AdminUserRecord | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }

    return data as AdminUserRecord;
  }

  async getUserStats(userId: string) {
    const [posts, matches, reports] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
      supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('reported_user_id', userId),
    ]);

    return {
      posts: posts.count || 0,
      matches: matches.count || 0,
      reports: reports.count || 0,
    };
  }

  async updateUser(userId: string, updates: Partial<AdminUserRecord>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update user:', error);
      throw new Error(error.message);
    }

    await auditService.logAction({
      action: 'update_user',
      resourceType: 'profile',
      resourceId: userId,
      changes: updates,
    });

    return true;
  }

  async banUser(userId: string, reason: string): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'ban_user',
      resourceType: 'profile',
      resourceId: userId,
      changes: { reason },
    });

    return true;
  }

  async unbanUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'unban_user',
      resourceType: 'profile',
      resourceId: userId,
    });

    return true;
  }

  async verifyUser(userId: string, verified: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: verified,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: verified ? 'verify_user' : 'unverify_user',
      resourceType: 'profile',
      resourceId: userId,
    });

    return true;
  }

  async updateUserRole(userId: string, role: string): Promise<boolean> {
    const isAdmin = ['admin', 'super_admin', 'moderator', 'support_agent', 'analyst'].includes(role);

    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        is_admin: isAdmin,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'update_user_role',
      resourceType: 'profile',
      resourceId: userId,
      changes: { role },
    });

    return true;
  }

  async deleteUser(userId: string): Promise<boolean> {
    // NOTE: This only deletes the profile. Use Supabase admin API for full delete.
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_user',
      resourceType: 'profile',
      resourceId: userId,
    });

    return true;
  }
}

export const userService = new UserService();

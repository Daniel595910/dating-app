import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type VIPLevel = 'free' | 'basic' | 'premium' | 'vip';

export interface VIPPlan {
  id: string;
  name: string;
  description: string | null;
  level: VIPLevel;
  duration_days: number;
  price: number;
  price_ngn: number | null;
  currency: string;
  features: string[];
  points_included: number;
  credits_included: number;
  status: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VIPAccount {
  id: string;
  user_id: string;
  level: VIPLevel;
  points_balance: number;
  total_points_earned: number;
  total_points_spent: number;
  plan_id: string | null;
  plan_expires_at: string | null;
  community_credits: number | null;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
  plan?: {
    name: string;
    level: string;
  };
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  reason: string;
  reference_id: string | null;
  reference_type: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

class VIPService {
  async getPlans(): Promise<VIPPlan[]> {
    try {
      const { data, error } = await supabase
        .from('vip_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) return [];
      return (data || []) as VIPPlan[];
    } catch {
      return [];
    }
  }

  async updatePlan(planId: string, updates: Partial<VIPPlan>): Promise<boolean> {
    const { error } = await supabase
      .from('vip_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId);
    if (error) throw new Error(error.message);
    await auditService.logAction({
      action: 'update_vip_plan',
      resourceType: 'vip_plan',
      resourceId: planId,
      changes: updates,
    });
    return true;
  }

  async togglePlanActive(planId: string, active: boolean): Promise<boolean> {
    return this.updatePlan(planId, {
      is_active: active,
      status: active ? 'active' : 'inactive',
    });
  }

  async getTransactions(filters: any = {}): Promise<{
    items: PointTransaction[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { limit = 20, offset = 0 } = filters;

      const { data, error, count } = await supabase
        .from('point_transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('Failed to fetch point_transactions:', error.message);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = [...new Set((data || []).map((t: any) => t.user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const items: PointTransaction[] = (data || []).map((t: any) => ({
        ...t,
        user: profileMap.get(t.user_id)
          ? {
              display_name: profileMap.get(t.user_id)!.display_name,
              avatar_url: profileMap.get(t.user_id)!.avatar_url,
            }
          : undefined,
      }));

      return { items, total: count || 0, hasMore: (count || 0) > offset + limit };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  async getVIPUsers(filters: any = {}): Promise<{
    items: VIPAccount[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { level = 'all', limit = 20, offset = 0 } = filters;

      let query = supabase.from('vip_accounts').select('*', { count: 'exact' });
      if (level !== 'all') query = query.eq('level', level);

      query = query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        console.warn('Failed to fetch vip_accounts:', error.message);
        return { items: [], total: 0, hasMore: false };
      }

      const userIds = [...new Set((data || []).map((u: any) => u.user_id).filter(Boolean))];
      const planIds = [...new Set((data || []).map((u: any) => u.plan_id).filter(Boolean))];

      const [profilesRes, plansRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
        planIds.length > 0
          ? supabase.from('vip_plans').select('id, name, level').in('id', planIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const planMap = new Map((plansRes.data || []).map((p: any) => [p.id, p]));

      const items: VIPAccount[] = (data || []).map((u: any) => ({
        ...u,
        user: profileMap.get(u.user_id)
          ? {
              display_name: profileMap.get(u.user_id)!.display_name,
              avatar_url: profileMap.get(u.user_id)!.avatar_url,
            }
          : undefined,
        plan: planMap.get(u.plan_id)
          ? {
              name: planMap.get(u.plan_id)!.name,
              level: planMap.get(u.plan_id)!.level,
            }
          : undefined,
      }));

      return { items, total: count || 0, hasMore: (count || 0) > offset + limit };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  async grantVIP(userId: string, planId: string, durationDays: number, notes?: string): Promise<boolean> {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    const { data: plan, error: planErr } = await supabase
      .from('vip_plans')
      .select('id, name, level, points_included, credits_included')
      .eq('id', planId)
      .single();

    if (planErr || !plan) throw new Error('Plan not found');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const { data: acc } = await supabase
      .from('vip_accounts')
      .select('points_balance, community_credits, total_points_earned')
      .eq('user_id', userId)
      .maybeSingle();

    const pointsIncluded = plan.points_included ?? 0;
    const creditsIncluded = plan.credits_included ?? 0;

    const newPoints = (acc?.points_balance ?? 0) + pointsIncluded;
    const newCredits = (acc?.community_credits ?? 0) + creditsIncluded;
    const newEarned = (acc?.total_points_earned ?? 0) + pointsIncluded;

    const { error } = await supabase
      .from('vip_accounts')
      .upsert(
        {
          user_id: userId,
          level: plan.level,
          plan_id: planId,
          plan_expires_at: expiresAt.toISOString(),
          points_balance: newPoints,
          community_credits: newCredits,
          total_points_earned: newEarned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw new Error(error.message);

    if (pointsIncluded > 0 || creditsIncluded > 0) {
      const { error: ledgerErr } = await supabase.from('point_transactions').insert({
        user_id: userId,
        amount: pointsIncluded,
        balance_after: newPoints,
        reason: 'admin_grant_vip',
        reference_type: 'admin_action',
        performed_by: admin.id,
        notes: `${plan.name} for ${durationDays}d (+${pointsIncluded} pts, +${creditsIncluded} cr)${notes ? ' — ' + notes : ''}`,
      });
      if (ledgerErr) console.error('Ledger insert failed (grant VIP):', ledgerErr);
    }

    await auditService.logAction({
      action: 'grant_vip',
      resourceType: 'vip_account',
      resourceId: userId,
      changes: { plan: plan.name, duration_days: durationDays, notes },
    });

    return true;
  }

  async revokeVIP(userId: string, reason: string): Promise<boolean> {
    const { error } = await supabase
      .from('vip_accounts')
      .update({
        level: 'free',
        plan_expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'revoke_vip',
      resourceType: 'vip_account',
      resourceId: userId,
      changes: { reason },
    });

    return true;
  }

  async adjustPoints(userId: string, amount: number, reason: string, notes?: string): Promise<boolean> {
    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error('Amount must be a non-zero number');
    }

    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    const { data: current } = await supabase
      .from('vip_accounts')
      .select('points_balance, community_credits, total_points_earned, total_points_spent')
      .eq('user_id', userId)
      .maybeSingle();

    const currentPoints = current?.points_balance ?? 0;
    const currentCredits = current?.community_credits ?? 0;
    const newPoints = currentPoints + amount;
    const newCredits = currentCredits + amount;

    if (newPoints < 0 || newCredits < 0) {
      throw new Error('Insufficient balance for this debit');
    }

    const updates: any = {
      user_id: userId,
      points_balance: newPoints,
      community_credits: newCredits,
      updated_at: new Date().toISOString(),
    };
    if (amount > 0) {
      updates.total_points_earned = (current?.total_points_earned ?? 0) + amount;
    } else {
      updates.total_points_spent = (current?.total_points_spent ?? 0) + Math.abs(amount);
    }

    const { error: updateError } = await supabase
      .from('vip_accounts')
      .upsert(updates, { onConflict: 'user_id' });

    if (updateError) throw new Error(updateError.message);

    const { error: ledgerError } = await supabase.from('point_transactions').insert({
      user_id: userId,
      amount,
      balance_after: newPoints,
      reason: amount > 0 ? 'admin_credit' : 'admin_debit',
      reference_type: 'admin_action',
      performed_by: admin.id,
      notes: reason + (notes ? ' — ' + notes : ''),
    });

    if (ledgerError) {
      console.error('Failed to write point_transactions row:', ledgerError);
      throw new Error(`Adjustment applied but ledger write failed: ${ledgerError.message}`);
    }

    await auditService.logAction({
      action: amount > 0 ? 'credit_points' : 'debit_points',
      resourceType: 'vip_account',
      resourceId: userId,
      changes: { amount, reason, notes, new_balance: newPoints },
    });

    return true;
  }

  async grantCredits(userId: string, credits: number, reason: string): Promise<boolean> {
    return this.adjustPoints(userId, credits, reason || 'admin_grant_credits');
  }

  async getStats() {
    const now = new Date();

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

    const [totalVIPUsers, activeVIPUsers] = await Promise.all([
      safeCount('vip_accounts'),
      safeCount('vip_accounts', (q) => q.gte('plan_expires_at', now.toISOString())),
    ]);

    const { count: pendingTransactions } = await supabase
      .from('point_transactions')
      .select('*', { count: 'exact', head: true });

    return {
      totalVIPUsers,
      activeVIPUsers,
      pendingTransactions: pendingTransactions || 0,
      completedToday: 0,
      completedWeek: 0,
      completedMonth: 0,
      revenueToday: 0,
      revenueWeek: 0,
      revenueMonth: 0,
    };
  }

  async getLevelDistribution(): Promise<Record<string, number>> {
    try {
      const { data } = await supabase.from('vip_accounts').select('level');

      const distribution: Record<string, number> = { free: 0, basic: 0, premium: 0, vip: 0 };
      (data || []).forEach((u: any) => {
        if (u.level && distribution[u.level] !== undefined) {
          distribution[u.level] = (distribution[u.level] ?? 0) + 1;
        }
      });

      return distribution;
    } catch {
      return { free: 0, basic: 0, premium: 0, vip: 0 };
    }
  }
}

export const vipService = new VIPService();

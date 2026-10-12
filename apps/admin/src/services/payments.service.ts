import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type PaymentKind = 'vip' | 'credits';
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'reversed';

export interface AdminPaymentRow {
  id: string;
  kind: PaymentKind;
  user_id: string;
  plan_code: string | null;
  pack_code: string | null;
  credits: number | null;
  currency: 'NGN' | 'USD';
  amount: number;
  status: PaymentStatus;
  paystack_reference: string;
  paystack_transaction_id: number | null;
  paystack_channel: string | null;
  paid_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
    email?: string | null;
  };
}

export interface PaymentFilters {
  kind?: PaymentKind | 'all';
  status?: PaymentStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}

class PaymentsService {
  async list(filters: PaymentFilters = {}): Promise<{
    items: AdminPaymentRow[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        kind = 'all',
        status = 'all',
        limit = 25,
        offset = 0,
      } = filters;

      const [vipRes, credRes] = await Promise.all([
        kind === 'credits'
          ? Promise.resolve({ data: [], count: 0 })
          : this.fetchVip(status, limit, offset),
        kind === 'vip'
          ? Promise.resolve({ data: [], count: 0 })
          : this.fetchCredits(status, limit, offset),
      ]);

      const merged: AdminPaymentRow[] = [
        ...(vipRes.data || []),
        ...(credRes.data || []),
      ];

      merged.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const sliced = merged.slice(0, limit);
      const userIds = [...new Set(sliced.map((r) => r.user_id).filter(Boolean))];

      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const items = sliced.map((row) => ({
        ...row,
        user: profileMap.get(row.user_id)
          ? {
              display_name: profileMap.get(row.user_id)!.display_name,
              avatar_url: profileMap.get(row.user_id)!.avatar_url,
            }
          : undefined,
      }));

      const total = (vipRes.count || 0) + (credRes.count || 0);
      return { items, total, hasMore: total > offset + limit };
    } catch (err) {
      console.error('paymentsService.list failed', err);
      return { items: [], total: 0, hasMore: false };
    }
  }

  private async fetchVip(
    status: PaymentStatus | 'all',
    _limit: number,
    _offset: number
  ): Promise<{ data: AdminPaymentRow[]; count: number }> {
    let q = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') q = q.eq('status', status);

    const { data, count, error } = await q;
    if (error) return { data: [], count: 0 };

    return {
      data: (data || []).map((p: any) => ({
        ...p,
        kind: 'vip' as const,
        pack_code: null,
        credits: null,
      })),
      count: count || 0,
    };
  }

  private async fetchCredits(
    status: PaymentStatus | 'all',
    _limit: number,
    _offset: number
  ): Promise<{ data: AdminPaymentRow[]; count: number }> {
    let q = supabase
      .from('credit_purchases')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') q = q.eq('status', status);

    const { data, count, error } = await q;
    if (error) return { data: [], count: 0 };

    return {
      data: (data || []).map((p: any) => ({
        ...p,
        kind: 'credits' as const,
        plan_code: null,
      })),
      count: count || 0,
    };
  }

  async markSuccess(paymentId: string, kind: PaymentKind): Promise<boolean> {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    const table = kind === 'vip' ? 'payments' : 'credit_purchases';

    const { error } = await supabase
      .from(table)
      .update({
        status: 'success',
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'mark_payment_success',
      resourceType: table,
      resourceId: paymentId,
      changes: { manual: true, by: admin.id },
    });

    return true;
  }

  async markFailed(paymentId: string, kind: PaymentKind, reason: string): Promise<boolean> {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    const table = kind === 'vip' ? 'payments' : 'credit_purchases';

    const { error } = await supabase
      .from(table)
      .update({ status: 'failed' })
      .eq('id', paymentId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'mark_payment_failed',
      resourceType: table,
      resourceId: paymentId,
      changes: { reason, by: admin.id },
    });

    return true;
  }
}

export const paymentsService = new PaymentsService();

/**
 * Paystack client-side service.
 * Only calls our Edge Functions. Never touches Paystack secret.
 */

import { supabase } from '@/config/supabase.client';

export interface VipPlan {
  id: string;
  plan_code: string;
  name: string;
  description: string | null;
  level: 'basic' | 'premium' | 'vip';
  currency: 'NGN' | 'USD';
  amount: number;
  price: number;
  billing_interval: string;
  duration_days: number;
  features: string[];
  points_included: number;
  credits_included: number;
  paystack_plan_code: string | null;
}

export interface CreditPack {
  id: string;
  pack_code: string;
  name: string;
  credits: number;
  currency: 'NGN' | 'USD';
  amount: number;
  price: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_code: string;
  status: 'pending' | 'active' | 'failed' | 'cancelled' | 'expired' | 'non_renewing';
  currency: 'NGN' | 'USD';
  amount: number;
  current_period_start: string | null;
  current_period_end: string | null;
  next_payment_date: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
}

export interface Payment {
  id: string;
  user_id: string;
  plan_code: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'abandoned' | 'reversed';
  currency: 'NGN' | 'USD';
  amount: number;
  paystack_reference: string;
  paystack_channel: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface VipAccount {
  user_id: string;
  level: string;
  points_balance: number;
  community_credits: number;
  plan_expires_at: string | null;
}

class PaystackService {
  async getPlans(): Promise<VipPlan[]> {
    const { data, error } = await supabase
      .from('vip_plans')
      .select('id, plan_code, name, description, level, currency, amount, price, billing_interval, duration_days, features, points_included, credits_included, paystack_plan_code')
      .eq('is_active', true)
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as VipPlan[];
  }

  async getCreditPacks(): Promise<CreditPack[]> {
    const { data, error } = await supabase
      .from('credit_packs')
      .select('id, pack_code, name, credits, currency, amount, price')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CreditPack[];
  }

  async getMySubscription(): Promise<Subscription | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'pending', 'non_renewing', 'failed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as Subscription | null;
  }

  async getMyPayments(limit = 50): Promise<Payment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []) as Payment[];
  }

  async getVipAccount(): Promise<VipAccount | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('vip_accounts')
      .select('user_id, level, points_balance, community_credits, plan_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    return data as VipAccount | null;
  }

  async getBillingCurrency(): Promise<{ currency: 'NGN' | 'USD' | null; suggested: 'NGN' | 'USD' }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { currency: null, suggested: 'NGN' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('billing_currency, location')
      .eq('user_id', user.id)
      .maybeSingle();

    const saved = (profile?.billing_currency as 'NGN' | 'USD' | null) ?? null;
    const country = profile?.location?.country ?? null;
    const suggested: 'NGN' | 'USD' = country === 'NG' || country === 'Nigeria' ? 'NGN' : 'USD';

    return { currency: saved, suggested };
  }

  async setBillingCurrency(currency: 'NGN' | 'USD'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ billing_currency: currency })
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async initializeVipPayment(planCode: string, currency: 'NGN' | 'USD'): Promise<{
    authorization_url: string;
    reference: string;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initialize-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'vip',
          plan_code: planCode,
          currency,
        }),
      }
    );

    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to initialize payment');
    return body;
  }

  async initializeCreditPurchase(packCode: string, currency: 'NGN' | 'USD'): Promise<{
    authorization_url: string;
    reference: string;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initialize-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'credits',
          pack_code: packCode,
          currency,
        }),
      }
    );

    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to initialize purchase');
    return body;
  }

  async verifyPayment(reference: string): Promise<{ ok: boolean; status: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reference }),
      }
    );

    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Verification failed');
    return body;
  }
}

export const paystackService = new PaystackService();

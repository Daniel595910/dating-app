import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export interface ActivateVipArgs {
  db: SupabaseClient;
  userId: string;
  planId: string;
  planCode: string;
  currency: string;
  amount: number;
  reference: string;
  paystackSubscriptionCode: string | null;
  paystackCustomerCode: string | null;
  paystackAuthorizationCode: string | null;
  periodStart: Date;
  provider?: string;
}

export async function activateVipSubscription(args: ActivateVipArgs): Promise<void> {
  const {
    db, userId, planId, planCode, currency, amount, reference,
    paystackSubscriptionCode, paystackCustomerCode, paystackAuthorizationCode,
    periodStart, provider = 'paystack',
  } = args;

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { data: existing } = await db
    .from('subscriptions')
    .select('id')
    .eq('paystack_reference', reference)
    .maybeSingle();
  if (existing) return;

  const { data: active } = await db
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['active', 'pending', 'non_renewing'])
    .maybeSingle();
  if (active) return;

  const { data: plan } = await db
    .from('vip_plans')
    .select('level, points_included, credits_included')
    .eq('id', planId)
    .single();

  const pointsIncluded = plan?.points_included ?? 0;
  const creditsIncluded = plan?.credits_included ?? 0;

  const { data: sub, error: subErr } = await db
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      plan_code: planCode,
      provider,
      status: 'active',
      currency,
      amount,
      paystack_subscription_code: paystackSubscriptionCode,
      paystack_customer_code: paystackCustomerCode,
      paystack_authorization_code: paystackAuthorizationCode,
      paystack_reference: reference,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_payment_date: periodEnd.toISOString(),
    })
    .select('id')
    .single();

  if (subErr || !sub) {
    console.error('activateVipSubscription: sub insert failed', subErr);
    return;
  }

  const { data: acc } = await db
    .from('vip_accounts')
    .select('points_balance, community_credits, total_points_earned')
    .eq('user_id', userId)
    .maybeSingle();

  const newPoints = (acc?.points_balance ?? 0) + pointsIncluded;
  const newCredits = (acc?.community_credits ?? 0) + creditsIncluded;
  const newEarned = (acc?.total_points_earned ?? 0) + pointsIncluded;

  await db.from('vip_accounts').upsert(
    {
      user_id: userId,
      plan_id: planId,
      plan_expires_at: periodEnd.toISOString(),
      active_subscription_id: sub.id,
      level: plan?.level ?? 'basic',
      points_balance: newPoints,
      community_credits: newCredits,
      total_points_earned: newEarned,
    },
    { onConflict: 'user_id' }
  );

  if (pointsIncluded > 0 || creditsIncluded > 0) {
    await db.from('point_transactions').insert({
      user_id: userId,
      amount: pointsIncluded,
      balance_after: newPoints,
      reason: 'vip_plan_activation',
      reference_id: sub.id,
      reference_type: 'subscription',
      notes: `${planCode}: +${pointsIncluded} pts, +${creditsIncluded} credits`,
    });
  }

  await db.from('profiles').update({ is_vip: true }).eq('user_id', userId);
}

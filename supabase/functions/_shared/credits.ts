import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * Idempotently add credits to a user's vip_account and ledger the change.
 * Safe to call multiple times for the same referenceId — checks the
 * credit_purchases.metadata.credited flag before writing.
 */
export async function creditUserAccount(args: {
  db: SupabaseClient;
  userId: string;
  credits: number;
  purchaseId: string;
  packCode: string;
}): Promise<{ credited: boolean; balanceAfter: number }> {
  const { db, userId, credits, purchaseId, packCode } = args;

  const { data: purchase } = await db
    .from('credit_purchases')
    .select('metadata')
    .eq('id', purchaseId)
    .maybeSingle();

  if ((purchase?.metadata as any)?.credited) {
    const { data: acc } = await db
      .from('vip_accounts')
      .select('community_credits')
      .eq('user_id', userId)
      .maybeSingle();
    return { credited: false, balanceAfter: acc?.community_credits ?? 0 };
  }

  const { data: acc } = await db
    .from('vip_accounts')
    .select('points_balance, community_credits')
    .eq('user_id', userId)
    .maybeSingle();

  const newCredits = (acc?.community_credits ?? 0) + credits;
  const newPoints = (acc?.points_balance ?? 0) + credits;

  await db.from('vip_accounts').upsert(
    {
      user_id: userId,
      community_credits: newCredits,
      points_balance: newPoints,
      total_points_earned: newPoints,
    },
    { onConflict: 'user_id' }
  );

  await db.from('point_transactions').insert({
    user_id: userId,
    amount: credits,
    balance_after: newPoints,
    reason: 'credit_purchase',
    reference_id: purchaseId,
    reference_type: 'credit_purchase',
    notes: `Purchased ${packCode}`,
  });

  await db.from('credit_purchases').update({
    metadata: {
      ...((purchase?.metadata as any) ?? {}),
      credited: true,
      credited_at: new Date().toISOString(),
    },
  }).eq('id', purchaseId);

  return { credited: true, balanceAfter: newCredits };
}

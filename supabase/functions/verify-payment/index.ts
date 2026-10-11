import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { verifyTransaction } from '../_shared/paystack.ts';
import { serviceClient, userClient } from '../_shared/db.ts';
import { creditUserAccount } from '../_shared/credits.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const u = userClient(authHeader);
    const { data: { user }, error: authErr } = await u.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthenticated' }, 401);

    const { reference } = await req.json().catch(() => ({}));
    if (!reference || typeof reference !== 'string') {
      return jsonResponse({ error: 'reference is required' }, 400);
    }

    const db = serviceClient();

    // 1. VIP payment?
    const { data: payment } = await db
      .from('payments')
      .select('id, user_id, plan_id, plan_code, currency, amount, status, paystack_reference')
      .eq('paystack_reference', reference)
      .maybeSingle();

    // 2. Credit purchase?
    let purchase: any = null;
    if (!payment) {
      const { data: cp } = await db
        .from('credit_purchases')
        .select('id, user_id, pack_id, pack_code, credits, currency, amount, status, metadata')
        .eq('paystack_reference', reference)
        .maybeSingle();
      purchase = cp;
    }

    if (!payment && !purchase) return jsonResponse({ error: 'Record not found' }, 404);

    const ownerId = payment?.user_id ?? purchase?.user_id;
    if (ownerId !== user.id) return jsonResponse({ error: 'Not your transaction' }, 403);

    // 3. Idempotent short circuit
    if (payment?.status === 'success') {
      return jsonResponse({ ok: true, already_verified: true, status: 'success', type: 'vip' });
    }
    if (purchase?.status === 'success' && (purchase.metadata as any)?.credited) {
      return jsonResponse({ ok: true, already_verified: true, status: 'success', type: 'credits' });
    }

    // 4. Verify with Paystack
    const verify = await verifyTransaction(reference);
    const data = verify.data;
    if (!verify.status || !data) {
      return jsonResponse({ error: 'Paystack verification failed' }, 400);
    }

    const expectedAmount = payment?.amount ?? purchase?.amount;
    const expectedCurrency = payment?.currency ?? purchase?.currency;

    if (data.currency !== expectedCurrency || Number(data.amount) !== Number(expectedAmount)) {
      console.warn('Amount/currency mismatch', { reference, expectedCurrency, expectedAmount, got: { c: data.currency, a: data.amount } });
      if (payment) await db.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      if (purchase) await db.from('credit_purchases').update({ status: 'failed' }).eq('id', purchase.id);
      return jsonResponse({ error: 'Amount/currency mismatch' }, 400);
    }

    const mappedStatus =
      data.status === 'success' ? 'success' :
      data.status === 'abandoned' ? 'abandoned' :
      data.status === 'failed' ? 'failed' :
      data.status === 'reversed' ? 'reversed' : 'pending';

    // ============================================================
    // VIP path
    // ============================================================
    if (payment) {
      await db.from('payments').update({
        status: mappedStatus,
        paystack_transaction_id: data.id,
        paystack_channel: data.channel,
        paid_at: data.paid_at ?? null,
      }).eq('id', payment.id);

      if (mappedStatus === 'success') {
        await activateVipSubscription({
          db,
          userId: user.id,
          planId: payment.plan_id,
          planCode: payment.plan_code,
          currency: payment.currency,
          amount: payment.amount,
          reference,
          paystackSubscriptionCode: data.subscription_code ?? null,
          paystackCustomerCode: data.customer?.customer_code ?? null,
          paystackAuthorizationCode: data.authorization?.authorization_code ?? null,
          periodStart: data.paid_at ? new Date(data.paid_at) : new Date(),
        });
      }

      return jsonResponse({ ok: true, status: mappedStatus, type: 'vip' });
    }

    // ============================================================
    // Credits path
    // ============================================================
    if (purchase) {
      await db.from('credit_purchases').update({
        status: mappedStatus,
        paystack_transaction_id: data.id,
        paystack_channel: data.channel,
        paid_at: data.paid_at ?? null,
      }).eq('id', purchase.id);

      let credited = false;
      let balanceAfter = 0;

      if (mappedStatus === 'success') {
        const result = await creditUserAccount({
          db,
          userId: user.id,
          credits: purchase.credits,
          purchaseId: purchase.id,
          packCode: purchase.pack_code,
        });
        credited = result.credited;
        balanceAfter = result.balanceAfter;
      }

      return jsonResponse({
        ok: true,
        status: mappedStatus,
        type: 'credits',
        credited,
        balance_after: balanceAfter,
      });
    }

    return jsonResponse({ ok: true, status: mappedStatus });
  } catch (err) {
    console.error('verify-payment failed', err);
    return jsonResponse({ error: (err as Error).message ?? 'Server error' }, 500);
  }
});

async function activateVipSubscription(args: {
  db: any;
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
}) {
  const {
    db, userId, planId, planCode, currency, amount, reference,
    paystackSubscriptionCode, paystackCustomerCode, paystackAuthorizationCode, periodStart,
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

  const { data: sub, error: subErr } = await db
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      plan_code: planCode,
      provider: 'paystack',
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

  if (subErr) {
    console.error('Subscription insert failed', subErr);
    return;
  }

  await db.from('vip_accounts').upsert(
    {
      user_id: userId,
      plan_id: planId,
      plan_expires_at: periodEnd.toISOString(),
      active_subscription_id: sub.id,
    },
    { onConflict: 'user_id' }
  );

  await db.from('profiles').update({ is_vip: true }).eq('user_id', userId);
}

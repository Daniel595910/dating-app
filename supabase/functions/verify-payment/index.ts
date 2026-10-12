import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { verifyTransaction, getRequestedAmount } from '../_shared/paystack.ts';
import { serviceClient, userClient } from '../_shared/db.ts';
import { creditUserAccount } from '../_shared/credits.ts';
import { activateVipSubscription } from '../_shared/vip-activation.ts';

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

    const { data: payment } = await db
      .from('payments')
      .select('id, user_id, plan_id, plan_code, currency, amount, status, paystack_reference')
      .eq('paystack_reference', reference)
      .maybeSingle();

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

    if (payment?.status === 'success') {
      return jsonResponse({ ok: true, already_verified: true, status: 'success', type: 'vip' });
    }
    if (purchase?.status === 'success' && (purchase.metadata as any)?.credited) {
      return jsonResponse({ ok: true, already_verified: true, status: 'success', type: 'credits' });
    }

    const verify = await verifyTransaction(reference);
    const data = verify.data;
    if (!verify.status || !data) {
      return jsonResponse({ error: 'Paystack verification failed' }, 400);
    }

    const expectedAmount = payment?.amount ?? purchase?.amount;
    const expectedCurrency = payment?.currency ?? purchase?.currency;
    const paidAmount = getRequestedAmount(data);

    if (data.currency !== expectedCurrency || paidAmount !== Number(expectedAmount)) {
      console.warn('Amount/currency mismatch', {
        reference,
        expectedCurrency, expectedAmount,
        got: { currency: data.currency, requested_amount: data.requested_amount, amount: data.amount, fees: data.fees },
      });
      const meta = {
        mismatch: true,
        expected: { currency: expectedCurrency, amount: expectedAmount },
        got: { currency: data.currency, requested_amount: data.requested_amount, amount: data.amount, fees: data.fees },
        detected_at: new Date().toISOString(),
      };
      if (payment) await db.from('payments').update({ status: 'failed', metadata: meta }).eq('id', payment.id);
      if (purchase) await db.from('credit_purchases').update({ status: 'failed', metadata: meta }).eq('id', purchase.id);
      return jsonResponse({ error: 'Amount/currency mismatch' }, 400);
    }

    const mappedStatus =
      data.status === 'success' ? 'success' :
      data.status === 'abandoned' ? 'abandoned' :
      data.status === 'failed' ? 'failed' :
      data.status === 'reversed' ? 'reversed' : 'pending';

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

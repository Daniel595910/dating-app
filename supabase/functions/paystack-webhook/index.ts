import { verifyTransaction } from '../_shared/paystack.ts';
import { serviceClient } from '../_shared/db.ts';
import { creditUserAccount } from '../_shared/credits.ts';

/**
 * POST /paystack-webhook
 *
 * Called by Paystack. Must:
 *   1. Verify x-paystack-signature HMAC-SHA512 using PAYSTACK_SECRET_KEY
 *   2. Persist event for idempotency (webhook_events unique(provider,event_id))
 *   3. Perform DB changes idempotently (VIP + credits)
 *   4. Return 200 quickly so Paystack doesn't retry
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) return new Response('Server misconfigured', { status: 500 });

  const signature = req.headers.get('x-paystack-signature');
  const rawBody = await req.text();

  if (!signature) return new Response('Missing signature', { status: 400 });

  const valid = await verifyHmac(rawBody, signature, secret);
  if (!valid) {
    console.warn('Invalid Paystack webhook signature');
    return new Response('Invalid signature', { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return new Response('Bad JSON', { status: 400 }); }

  const eventType: string = event?.event ?? 'unknown';
  const data = event?.data ?? {};
  const reference: string | null = data?.reference ?? null;

  const eventId = event?.id
    ? String(event.id)
    : `${eventType}:${reference ?? 'no-ref'}:${data?.id ?? 'no-tx'}`;

  const db = serviceClient();

  // Idempotency gate
  const { error: evtErr } = await db.from('webhook_events').insert({
    provider: 'paystack',
    event_type: eventType,
    event_id: eventId,
    reference,
    payload: event,
    signature_valid: true,
  });

  if (evtErr) {
    if ((evtErr as any).code === '23505') {
      return new Response('Duplicate - ignored', { status: 200 });
    }
    console.error('webhook_events insert failed', evtErr);
    return new Response('DB error', { status: 500 });
  }

  try {
    switch (eventType) {
      case 'charge.success':
        await handleChargeSuccess(db, reference);
        break;

      case 'subscription.create':
        await handleSubscriptionCreate(db, data);
        break;

      case 'invoice.payment_failed':
        await handleInvoiceFailed(db, data);
        break;

      case 'subscription.not_renew':
        await handleSubscriptionNotRenew(db, data);
        break;

      case 'subscription.disable':
        await handleSubscriptionDisable(db, data);
        break;

      case 'invoice.update':
        await handleInvoiceUpdate(db, data);
        break;

      default:
        console.log('Unhandled event', eventType);
    }

    await db.from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'paystack')
      .eq('event_id', eventId);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('Webhook handler error', err);
    await db.from('webhook_events')
      .update({ processing_error: (err as Error).message })
      .eq('provider', 'paystack')
      .eq('event_id', eventId);
    return new Response('ok', { status: 200 });
  }
});

async function verifyHmac(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

async function handleChargeSuccess(db: any, reference: string | null) {
  if (!reference) return;

  // ---- VIP payment path ----
  const { data: payment } = await db
    .from('payments')
    .select('id, user_id, plan_id, plan_code, currency, amount, status')
    .eq('paystack_reference', reference)
    .maybeSingle();

  if (payment) {
    const verify = await verifyTransaction(reference);
    if (!verify.status || verify.data.status !== 'success') {
      console.warn('charge.success but verify returned non-success');
      return;
    }

    if (verify.data.currency !== payment.currency ||
        Number(verify.data.amount) !== Number(payment.amount)) {
      console.error('Webhook amount/currency mismatch (VIP)', reference);
      return;
    }

    await db.from('payments').update({
      status: 'success',
      paystack_transaction_id: verify.data.id,
      paystack_channel: verify.data.channel,
      paid_at: verify.data.paid_at ?? new Date().toISOString(),
    }).eq('id', payment.id).eq('status', 'pending');

    const { data: existing } = await db
      .from('subscriptions')
      .select('id')
      .eq('paystack_reference', reference)
      .maybeSingle();
    if (existing) return;

    const { data: active } = await db
      .from('subscriptions').select('id')
      .eq('user_id', payment.user_id)
      .in('status', ['active', 'pending', 'non_renewing'])
      .maybeSingle();
    if (active) return;

    const periodStart = verify.data.paid_at ? new Date(verify.data.paid_at) : new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { data: sub } = await db.from('subscriptions').insert({
      user_id: payment.user_id,
      plan_id: payment.plan_id,
      plan_code: payment.plan_code,
      provider: 'paystack',
      status: 'active',
      currency: payment.currency,
      amount: payment.amount,
      paystack_subscription_code: verify.data.subscription_code ?? null,
      paystack_customer_code: verify.data.customer?.customer_code ?? null,
      paystack_authorization_code: verify.data.authorization?.authorization_code ?? null,
      paystack_reference: reference,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_payment_date: periodEnd.toISOString(),
    }).select('id').single();

    if (sub) {
      await db.from('vip_accounts').upsert({
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        plan_expires_at: periodEnd.toISOString(),
        active_subscription_id: sub.id,
      }, { onConflict: 'user_id' });

      await db.from('profiles').update({ is_vip: true }).eq('user_id', payment.user_id);
    }
    return;
  }

  // ---- Credit purchase path ----
  const { data: purchase } = await db
    .from('credit_purchases')
    .select('id, user_id, pack_code, credits, currency, amount, status, metadata')
    .eq('paystack_reference', reference)
    .maybeSingle();

  if (!purchase) {
    console.warn('charge.success: no payment or purchase for', reference);
    return;
  }

  const verify = await verifyTransaction(reference);
  if (!verify.status || verify.data.status !== 'success') {
    console.warn('charge.success (credits) but verify returned non-success');
    return;
  }

  if (verify.data.currency !== purchase.currency ||
      Number(verify.data.amount) !== Number(purchase.amount)) {
    console.error('Webhook amount/currency mismatch (credits)', reference);
    return;
  }

  await db.from('credit_purchases').update({
    status: 'success',
    paystack_transaction_id: verify.data.id,
    paystack_channel: verify.data.channel,
    paid_at: verify.data.paid_at ?? new Date().toISOString(),
  }).eq('id', purchase.id).eq('status', 'pending');

  await creditUserAccount({
    db,
    userId: purchase.user_id,
    credits: purchase.credits,
    purchaseId: purchase.id,
    packCode: purchase.pack_code,
  });
}

async function handleSubscriptionCreate(db: any, data: any) {
  const subCode = data?.subscription_code;
  const emailToken = data?.email_token;
  const customerCode = data?.customer?.customer_code;
  if (!subCode) return;

  await db.from('subscriptions')
    .update({
      paystack_subscription_code: subCode,
      paystack_email_token: emailToken,
      paystack_customer_code: customerCode,
    })
    .eq('paystack_subscription_code', subCode);
}

async function handleInvoiceFailed(db: any, data: any) {
  const subCode = data?.subscription?.subscription_code ?? data?.subscription_code;
  if (!subCode) return;

  await db.from('subscriptions')
    .update({ status: 'failed' })
    .eq('paystack_subscription_code', subCode)
    .neq('status', 'cancelled');
}

async function handleSubscriptionNotRenew(db: any, data: any) {
  const subCode = data?.subscription_code;
  if (!subCode) return;

  await db.from('subscriptions')
    .update({ status: 'non_renewing', cancel_at_period_end: true })
    .eq('paystack_subscription_code', subCode);
}

async function handleSubscriptionDisable(db: any, data: any) {
  const subCode = data?.subscription_code;
  if (!subCode) return;

  const { data: sub } = await db
    .from('subscriptions')
    .select('id, user_id')
    .eq('paystack_subscription_code', subCode)
    .maybeSingle();

  await db.from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('paystack_subscription_code', subCode);

  if (sub) {
    await db.from('vip_accounts')
      .update({ plan_expires_at: new Date().toISOString() })
      .eq('user_id', sub.user_id);

    await db.from('profiles').update({ is_vip: false }).eq('user_id', sub.user_id);
  }
}

async function handleInvoiceUpdate(db: any, data: any) {
  const subCode = data?.subscription?.subscription_code;
  const paidAt = data?.paid_at ? new Date(data.paid_at) : new Date();
  if (!subCode) return;

  const periodEnd = new Date(paidAt);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { data: sub } = await db
    .from('subscriptions')
    .select('id, user_id')
    .eq('paystack_subscription_code', subCode)
    .maybeSingle();

  if (!sub) return;

  await db.from('subscriptions').update({
    status: 'active',
    current_period_start: paidAt.toISOString(),
    current_period_end: periodEnd.toISOString(),
    next_payment_date: periodEnd.toISOString(),
  }).eq('id', sub.id);

  await db.from('vip_accounts')
    .update({ plan_expires_at: periodEnd.toISOString() })
    .eq('user_id', sub.user_id);

  await db.from('profiles').update({ is_vip: true }).eq('user_id', sub.user_id);
}

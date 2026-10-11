import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { initializeTransaction } from '../_shared/paystack.ts';
import { serviceClient, userClient } from '../_shared/db.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const u = userClient(authHeader);
    const { data: { user }, error: authErr } = await u.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthenticated' }, 401);

    const body = await req.json().catch(() => ({}));
    const { type, plan_code, pack_code, currency } = body as {
      type?: 'vip' | 'credits';
      plan_code?: string;
      pack_code?: string;
      currency?: 'NGN' | 'USD';
    };

    if (!type || !['vip', 'credits'].includes(type)) {
      return jsonResponse({ error: 'type must be vip or credits' }, 400);
    }
    if (!currency || !['NGN', 'USD'].includes(currency)) {
      return jsonResponse({ error: 'currency must be NGN or USD' }, 400);
    }

    const db = serviceClient();
    const origin = req.headers.get('Origin') ?? 'http://localhost:3000';
    const callbackUrl = `${origin}/profile/vip/checkout/callback`;

    // ============================================================
    // VIP BRANCH
    // ============================================================
    if (type === 'vip') {
      if (!plan_code) return jsonResponse({ error: 'plan_code required' }, 400);

      const { data: plan, error: planErr } = await db
        .from('vip_plans')
        .select('id, plan_code, name, level, currency, amount, paystack_plan_code, is_active, status')
        .eq('plan_code', plan_code)
        .eq('currency', currency)
        .eq('is_active', true)
        .eq('status', 'active')
        .maybeSingle();

      if (planErr) return jsonResponse({ error: 'Failed to load plan' }, 500);
      if (!plan) return jsonResponse({ error: 'Plan not found or inactive' }, 404);

      const { data: existingSub } = await db
        .from('subscriptions')
        .select('id, status, currency, amount, plan_code')
        .eq('user_id', user.id)
        .in('status', ['active', 'pending', 'non_renewing'])
        .maybeSingle();

      if (existingSub) {
        return jsonResponse({
          error: 'You already have an active subscription. Cancel it before starting a new one.',
          existing_subscription: {
            status: existingSub.status,
            plan_code: existingSub.plan_code,
            currency: existingSub.currency,
          },
        }, 409);
      }

      const reference = `vip_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data: payment, error: payErr } = await db
        .from('payments')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          plan_code: plan.plan_code,
          currency: plan.currency,
          amount: plan.amount,
          status: 'pending',
          paystack_reference: reference,
          metadata: { plan_level: plan.level, initialized_from: 'web_app' },
        })
        .select('id')
        .single();

      if (payErr) {
        console.error('Payment insert error', payErr);
        return jsonResponse({ error: 'Failed to create payment record' }, 500);
      }

      const init = await initializeTransaction({
        email: user.email ?? `${user.id}@local`,
        amount: plan.amount,
        currency: plan.currency,
        reference,
        callback_url: callbackUrl,
        ...(plan.paystack_plan_code ? { plan: plan.paystack_plan_code } : {}),
        metadata: {
          user_id: user.id,
          product_type: 'vip',
          plan_code: plan.plan_code,
          plan_id: plan.id,
          currency: plan.currency,
          app: 'stealgat',
        },
      });

      await db.from('payments').update({
        metadata: {
          plan_level: plan.level,
          initialized_from: 'web_app',
          access_code: init.data.access_code,
        },
      }).eq('id', payment.id);

      return jsonResponse({
        ok: true,
        authorization_url: init.data.authorization_url,
        access_code: init.data.access_code,
        reference: init.data.reference,
      });
    }

    // ============================================================
    // CREDITS BRANCH
    // ============================================================
    if (!pack_code) return jsonResponse({ error: 'pack_code required' }, 400);

    const { data: pack, error: packErr } = await db
      .from('credit_packs')
      .select('id, pack_code, name, credits, currency, amount, is_active')
      .eq('pack_code', pack_code)
      .eq('currency', currency)
      .eq('is_active', true)
      .maybeSingle();

    if (packErr) return jsonResponse({ error: 'Failed to load credit pack' }, 500);
    if (!pack) return jsonResponse({ error: 'Credit pack not found or inactive' }, 404);

    const reference = `credits_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { data: purchase, error: cpErr } = await db
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        pack_id: pack.id,
        pack_code: pack.pack_code,
        credits: pack.credits,
        currency: pack.currency,
        amount: pack.amount,
        status: 'pending',
        paystack_reference: reference,
        metadata: { initialized_from: 'web_app' },
      })
      .select('id')
      .single();

    if (cpErr) {
      console.error('Credit purchase insert error', cpErr);
      return jsonResponse({ error: 'Failed to create purchase record' }, 500);
    }

    const init = await initializeTransaction({
      email: user.email ?? `${user.id}@local`,
      amount: pack.amount,
      currency: pack.currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        user_id: user.id,
        product_type: 'credits',
        pack_code: pack.pack_code,
        pack_id: pack.id,
        credits: pack.credits,
        currency: pack.currency,
        app: 'stealgat',
      },
    });

    await db.from('credit_purchases').update({
      metadata: {
        initialized_from: 'web_app',
        access_code: init.data.access_code,
      },
    }).eq('id', purchase.id);

    return jsonResponse({
      ok: true,
      authorization_url: init.data.authorization_url,
      access_code: init.data.access_code,
      reference: init.data.reference,
    });
  } catch (err) {
    console.error('initialize-payment failed', err);
    return jsonResponse({ error: (err as Error).message ?? 'Server error' }, 500);
  }
});

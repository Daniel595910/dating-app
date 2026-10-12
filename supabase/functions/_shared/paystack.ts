const PAYSTACK_BASE = 'https://api.paystack.co';

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: 'success' | 'failed' | 'abandoned' | 'reversed' | 'pending';
    reference: string;
    amount: number;
    requested_amount?: number;
    fees?: number;
    currency: string;
    channel: string;
    paid_at: string | null;
    customer: { id: number; email: string; customer_code: string };
    authorization?: { authorization_code: string; reusable: boolean };
    plan?: string;
    plan_object?: { id: number; name: string; plan_code: string };
    subscription_code?: string;
    metadata?: Record<string, unknown>;
  };
}

async function callPaystack<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not set');

  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let payload: any;
  try { payload = text ? JSON.parse(text) : {}; }
  catch { payload = { raw: text }; }

  if (!res.ok) {
    console.error('Paystack API error', path, res.status, payload);
    throw new Error(`Paystack API error ${res.status}: ${payload?.message ?? 'unknown'}`);
  }
  return payload as T;
}

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback_url: string;
  plan?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResponse> {
  return callPaystack<PaystackInitResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callback_url,
      ...(params.plan ? { plan: params.plan } : {}),
      metadata: params.metadata ?? {},
    }),
  });
}

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  return callPaystack<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export async function disableSubscription(
  subscriptionCode: string,
  emailToken: string
): Promise<unknown> {
  return callPaystack('/subscription/disable', {
    method: 'POST',
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  });
}

/**
 * Returns the amount the merchant initialized (pre-fee), falling back to
 * the amount the customer paid if Paystack doesn't provide requested_amount.
 */
export function getRequestedAmount(data: PaystackVerifyResponse['data']): number {
  return Number(data.requested_amount ?? data.amount);
}

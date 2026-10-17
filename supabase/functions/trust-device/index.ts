/**
 * trust-device
 *
 * Called after the user completes the new-device magic-link flow.
 * Generates a random device token, stores its SHA256 hash in
 * login_verifications, and returns the plaintext token to the client
 * (which stores it in localStorage). Future logins on this device
 * skip the magic-link step.
 *
 * Request:  POST { }                (user identified via JWT)
 * Response: { device_token: string, expires_at: string }
 *
 * Requires valid JWT — must be called by a signed-in user.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/db.ts';

const TRUST_DURATION_DAYS = 30;

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateDeviceToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // --- 1. Authenticate ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const userSb = userClient(authHeader);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    // --- 2. Generate device token ---
    const deviceToken = generateDeviceToken();
    const tokenHash = await sha256(deviceToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRUST_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // --- 3. Capture device metadata (best effort) ---
    const userAgent = req.headers.get('User-Agent') || null;
    const forwardedFor = req.headers.get('X-Forwarded-For');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

    // --- 4. Store in login_verifications ---
    const sb = serviceClient();

    // Optional: expire any previous unverified rows for this user so old
    // pending magic-link attempts don't linger.
    await sb
      .from('login_verifications')
      .update({ expires_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('verified_at', null);

    const { data, error } = await sb
      .from('login_verifications')
      .insert({
        user_id: user.id,
        device_token_hash: tokenHash,
        user_agent: userAgent,
        ip_address: ipAddress,
        verified_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('trust-device insert failed:', error);
      return jsonResponse({ error: 'Failed to store device trust' }, 500);
    }

    console.log(`Trusted device for user ${user.id}: row ${data.id}, expires ${expiresAt.toISOString()}`);

    return jsonResponse({
      device_token: deviceToken,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('trust-device unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
/**
 * check-device-trust
 *
 * Called on login (right after password success) to decide whether
 * the user needs a magic-link verification for this device.
 *
 * Request:  POST { device_token: string, user_id: string }
 * Response: { trusted: boolean }
 *
 * No JWT required — the device_token itself is the credential.
 * Random 32-byte tokens are unguessable, and knowing one only tells
 * the server "this device was previously trusted for this user" —
 * the actual login still requires email + password.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/db.ts';

interface RequestBody {
  device_token?: string;
  user_id?: string;
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const deviceToken = typeof body.device_token === 'string' ? body.device_token.trim() : '';
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';

    if (!deviceToken || !userId) {
      return jsonResponse({ trusted: false, reason: 'missing_token_or_user' });
    }

    // Reject obviously malformed tokens early
    if (deviceToken.length < 32) {
      return jsonResponse({ trusted: false, reason: 'invalid_token' });
    }

    const tokenHash = await sha256(deviceToken);
    const sb = serviceClient();

    // Look for a row matching this device token for this user
    const { data, error } = await sb
      .from('login_verifications')
      .select('id, verified_at, expires_at')
      .eq('user_id', userId)
      .eq('device_token_hash', tokenHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('check-device-trust query failed:', error);
      return jsonResponse({ trusted: false, reason: 'query_error' });
    }

    if (!data) {
      return jsonResponse({ trusted: false, reason: 'no_match' });
    }

    const now = Date.now();
    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
    const verified = Boolean(data.verified_at);
    const notExpired = expiresAt > now;

    if (verified && notExpired) {
      return jsonResponse({ trusted: true });
    }

    return jsonResponse({
      trusted: false,
      reason: verified ? 'expired' : 'not_verified',
    });
  } catch (err) {
    console.error('check-device-trust unhandled error:', err);
    return jsonResponse({ trusted: false, reason: 'server_error' }, 500);
  }
});
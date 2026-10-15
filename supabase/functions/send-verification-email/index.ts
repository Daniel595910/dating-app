/**
 * send-verification-email
 *
 * Sends a fresh signup confirmation email to a specific user.
 * Used by the admin UI when an admin notices an unconfirmed account
 * and wants to nudge the user.
 *
 * Request:  POST { user_id: string }
 * Response: { success: true } | { error: string }
 *
 * Auth: caller must be an authenticated admin with USER_VERIFY-level role.
 *
 * Notes:
 * - Requires SUPABASE_SERVICE_ROLE_KEY as an edge function secret.
 * - Uses Supabase Auth's admin.resend, which sends through whatever SMTP
 *   is configured in the project Auth settings.
 * - Refuses to send if the target user's email is already confirmed.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/db.ts';

interface RequestBody {
  user_id?: string;
}

const ALLOWED_ROLES = ['admin', 'super_admin', 'support_agent'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // --- 1. Authenticate caller ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const userSb = userClient(authHeader);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    // --- 2. Authorize caller (same role gate as admin-user-status) ---
    const adminSb = serviceClient();
    const { data: callerProfile } = await adminSb
      .from('profiles')
      .select('role, is_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin =
      callerProfile?.is_admin === true &&
      ALLOWED_ROLES.includes(callerProfile?.role ?? '');
    if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

    // --- 3. Parse input ---
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const targetId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
    if (!targetId) return jsonResponse({ error: 'user_id is required' }, 400);

    // --- 4. Look up the target user ---
    const { data: targetData, error: targetErr } = await adminSb.auth.admin.getUserById(targetId);
    if (targetErr || !targetData?.user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    const target = targetData.user;
    if (!target.email) {
      return jsonResponse({ error: 'User has no email on file' }, 400);
    }
    if (target.email_confirmed_at) {
      return jsonResponse({ error: 'Email already confirmed' }, 409);
    }

    // --- 5. Send the verification email via Supabase Auth ---
    // type 'signup' sends the "Confirm your signup" template through the
    // configured SMTP. The link redirects to the project's site_url /
    // additional_redirect_urls, which should include the ConfirmEmail page.
    const { error: resendErr } = await adminSb.auth.resend({
      type: 'signup',
      email: target.email,
    });

    if (resendErr) {
      return jsonResponse({ error: resendErr.message }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
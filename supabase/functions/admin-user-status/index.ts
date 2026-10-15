/**
 * admin-user-status
 *
 * Batch-reads email confirmation status for a list of user ids.
 * The admin UI cannot read auth.users directly, so this function
 * verifies the caller is an admin, then uses the service-role client
 * to fetch each user's email + email_confirmed_at + last_sign_in_at.
 *
 * Request:  POST { user_ids: string[] }
 * Response: { statuses: { [user_id]: { email, email_confirmed_at, last_sign_in_at } } }
 *
 * Auth: caller must be an authenticated admin / support_agent.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/db.ts';

interface RequestBody {
  user_ids?: string[];
}

interface UserStatus {
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
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

    // --- 2. Authorize caller (must be admin with USER_VIEW-level access) ---
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

    const ids = Array.isArray(body.user_ids)
      ? Array.from(new Set(body.user_ids.filter((x) => typeof x === 'string' && x.length > 0)))
      : [];

    if (ids.length === 0) {
      return jsonResponse({ statuses: {} });
    }
    if (ids.length > 100) {
      return jsonResponse({ error: 'Too many user_ids (max 100 per call)' }, 400);
    }

    // --- 4. Fetch each user's status in parallel ---
    const results = await Promise.all(
      ids.map(async (id): Promise<[string, UserStatus]> => {
        try {
          const { data, error } = await adminSb.auth.admin.getUserById(id);
          if (error || !data?.user) {
            return [id, { email: null, email_confirmed_at: null, last_sign_in_at: null }];
          }
          const u = data.user;
          return [id, {
            email: u.email ?? null,
            email_confirmed_at: u.email_confirmed_at ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
          }];
        } catch {
          return [id, { email: null, email_confirmed_at: null, last_sign_in_at: null }];
        }
      })
    );

    const statuses: Record<string, UserStatus> = {};
    for (const [id, status] of results) {
      statuses[id] = status;
    }

    return jsonResponse({ statuses });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
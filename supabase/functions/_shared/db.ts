import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * Service-role client for Edge Functions.
 * Bypasses RLS — used only for server-side operations
 * that MUST be authoritative.
 */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('EDGE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase service credentials missing');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * User-scoped client using the Authorization header.
 * Enforces RLS — used only for reading the authenticated user.
 */
export function userClient(authHeader: string | null): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) throw new Error('Supabase anon credentials missing');

  return createClient(url, anon, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Auth Hooks Edge Function
 * Handles authentication-related hooks and user creation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AuthHookPayload {
  type: 'SIGNUP' | 'LOGIN' | 'DELETE_USER';
  user_id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, any>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const payload: AuthHookPayload = await req.json();

    // Validate payload
    if (!payload.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different auth events
    switch (payload.type) {
      case 'SIGNUP': {
        // Create user record
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert({
            id: payload.user_id,
            email: payload.email || '',
            phone: payload.phone || null,
            email_verified: false,
            phone_verified: false,
            verification_status: 'unverified',
            status: 'pending_verification',
          })
          .select()
          .single();

        if (userError) throw userError;

        // Create VIP account for new user
        const { error: vipError } = await supabase
          .from('vip_accounts')
          .insert({
            user_id: payload.user_id,
            level: 'free',
            points_balance: 0,
            total_points_earned: 0,
            total_points_spent: 0,
          });

        if (vipError) throw vipError;

        // Create notification preferences
        const notificationTypes = ['match', 'message', 'like', 'comment', 'system', 'verification', 'vip'];
        const preferences = notificationTypes.map(type => ({
          user_id: payload.user_id,
          type,
          channels: ['in_app'],
          enabled: true,
        }));

        const { error: prefError } = await supabase
          .from('notification_preferences')
          .insert(preferences);

        if (prefError) throw prefError;

        return new Response(
          JSON.stringify({ success: true, message: 'User created successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'LOGIN': {
        // Update last login timestamp
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', payload.user_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, message: 'Login recorded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'DELETE_USER': {
        // Soft delete user
        const { error: deleteError } = await supabase
          .from('users')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
          })
          .eq('id', payload.user_id);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true, message: 'User deleted' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid auth event type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in auth-hooks:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
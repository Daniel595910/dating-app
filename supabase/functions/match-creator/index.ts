/**
 * Match Creator Edge Function
 * Handles match creation and getting-to-know stage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MatchRequestPayload {
  target_user_id: string;
  message?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: MatchRequestPayload = await req.json();

    // Validate payload
    if (!payload.target_user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing target_user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.target_user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot match with yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, status')
      .eq('id', payload.target_user_id)
      .single();

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetUser.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Target user is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if match already exists
    const { data: existingMatch, error: matchError } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${payload.target_user_id}),and(user1_id.eq.${payload.target_user_id},user2_id.eq.${user.id})`)
      .single();

    if (existingMatch) {
      return new Response(
        JSON.stringify({ error: 'Match already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create match request
    const { data: matchRequest, error: requestError } = await supabase
      .from('match_requests')
      .insert({
        requester_id: user.id,
        target_id: payload.target_user_id,
        message: payload.message,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Send notification to target user
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.target_user_id,
        type: 'match',
        title: 'New Match Request',
        body: 'Someone wants to get to know you!',
        status: 'unread',
        data: { match_request_id: matchRequest.id },
        channels: ['in_app', 'push'],
      });

    if (notificationError) throw notificationError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Match request sent',
        match_request: matchRequest,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-creator:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
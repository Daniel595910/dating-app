/**
 * Notification Sender Edge Function
 * Handles notification dispatch across channels
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
  channels?: string[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify service role authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = await req.json();

    // Validate payload
    if (!payload.user_id || !payload.type || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('enabled, channels')
      .eq('user_id', payload.user_id)
      .eq('type', payload.type)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      throw prefError;
    }

    // If preferences exist and notifications are disabled, skip
    if (preferences && !preferences.enabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'Notifications disabled for this type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine channels
    const channels = payload.channels || preferences?.channels || ['in_app'];

    // Create notification in database
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        status: 'unread',
        data: payload.data,
        action_url: payload.action_url,
        channels,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Handle email notifications
    if (channels.includes('email')) {
      // TODO: Integrate with email service (SMTP, SendGrid, etc.)
      console.log(`Email notification to user ${payload.user_id}: ${payload.title}`);
    }

    // Handle SMS notifications
    if (channels.includes('sms')) {
      // TODO: Integrate with SMS service (Twilio, etc.)
      console.log(`SMS notification to user ${payload.user_id}: ${payload.title}`);
    }

    // Handle push notifications
    if (channels.includes('push')) {
      // TODO: Integrate with push notification service (FCM, APNS, etc.)
      console.log(`Push notification to user ${payload.user_id}: ${payload.title}`);
    }

    // Send realtime event
    await supabase
      .from('notifications')
      .update({ status: 'unread' })
      .eq('id', notification.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent',
        notification,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in notification-sender:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
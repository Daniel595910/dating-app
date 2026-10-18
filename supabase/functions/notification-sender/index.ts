/**
 * Notification Sender Edge Function
 * Inserts the notification row AND fires a web push to every subscribed device.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import webPush from 'https://esm.sh/web-push@3.6.7';

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
  data?: Record<string, unknown>;
  action_url?: string;
  channels?: string[];
  // Rich push fields
  image?: string;
  icon?: string;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
  actions?: { action: string; title: string }[];
}

interface PushRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('EDGE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@datingapp.com';

    if (!vapidPublic || !vapidPrivate) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth: only service role can call this endpoint
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = await req.json();

    if (!payload.user_id || !payload.type || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('enabled, channels')
      .eq('user_id', payload.user_id)
      .eq('type', payload.type)
      .maybeSingle();

    if (preferences && preferences.enabled === false) {
      return new Response(
        JSON.stringify({ success: true, message: 'Notifications disabled for this type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channels = payload.channels || (preferences?.channels as string[]) || ['in_app'];

    // NOTE: the notification row is already inserted by the caller.
    // This function only delivers the push. Inserting here would fire the
    // trigger again and create an infinite loop.

    // Web Push
    let pushSent = 0;
    let pushFailed = 0;

    if (channels.includes('push')) {
      // Skip push if recipient has muted this conversation
      if (payload.data?.conversation_id) {
        const { data: muted } = await supabase
          .from('muted_conversations')
          .select('user_id')
          .eq('user_id', payload.user_id)
          .eq('conversation_id', payload.data.conversation_id)
          .gt('muted_until', new Date().toISOString())
          .maybeSingle();
        if (muted) {
          return new Response(
            JSON.stringify({ success: true, skipped: 'muted' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .eq('user_id', payload.user_id);

      const avatarUrl = (payload.data as any)?.avatar_url || null;

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        // Rich fields — passed through to the SW push handler
        image: payload.image || avatarUrl,
        icon: payload.icon || avatarUrl,
        tag: payload.tag,
        renotify: payload.renotify,
        vibrate: payload.vibrate,
        actions: payload.actions,
        data: {
          url: payload.action_url || '/',
          type: payload.type,
          ...(payload.data || {}),
        },
      });

      for (const sub of (subs || []) as PushRow[]) {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload
          );
          pushSent++;
        } catch (err: any) {
          pushFailed++;
          // 404 or 410 means the subscription is dead → remove it
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        push_sent: pushSent,
        push_failed: pushFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in notification-sender:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

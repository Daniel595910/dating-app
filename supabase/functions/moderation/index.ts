/**
 * Moderation Edge Function
 * Handles automated content moderation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ModerationPayload {
  content_type: 'post' | 'comment' | 'message' | 'profile';
  content_id: string;
  content: string;
}

// Simple profanity and spam detection patterns
const profanityPatterns = [
  /\b(fuck|shit|bitch|asshole|bastard|damn|crap)\b/i,
  /\b(nigger|faggot|retard|slut|whore)\b/i,
];

const spamPatterns = [
  /(http|https):\/\/[^\s]+/gi,
  /\b(buy now|click here|limited time|special offer|discount|cheap)\b/i,
  /(.)\1{4,}/g, // Repeated characters
];

const phonePattern = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

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

    const payload: ModerationPayload = await req.json();

    // Validate payload
    if (!payload.content_type || !payload.content_id || !payload.content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const violations: string[] = [];
    let containsProfanity = false;
    let containsSpam = false;
    let containsContactInfo = false;

    // Check for profanity
    for (const pattern of profanityPatterns) {
      if (pattern.test(payload.content)) {
        containsProfanity = true;
        violations.push('profanity');
        break;
      }
    }

    // Check for spam
    const spamMatches = payload.content.match(spamPatterns[0]!);
    if (spamMatches && spamMatches.length > 3) {
      containsSpam = true;
      violations.push('spam_links');
    }

    if (spamPatterns[1]!.test(payload.content)) {
      containsSpam = true;
      violations.push('spam_phrases');
    }

    if (spamPatterns[2]!.test(payload.content)) {
      containsSpam = true;
      violations.push('repeated_characters');
    }

    // Check for contact information
    const phoneMatches = payload.content.match(phonePattern);
    const emailMatches = payload.content.match(emailPattern);

    if ((phoneMatches && phoneMatches.length > 0) || (emailMatches && emailMatches.length > 0)) {
      containsContactInfo = true;
      violations.push('contact_info');
    }

    // Determine action based on violations
    let action: 'none' | 'flag' | 'hide' = 'none';

    if (containsProfanity) {
      action = 'hide';
    } else if (containsSpam) {
      action = 'hide';
    } else if (containsContactInfo) {
      action = 'flag';
    }

    // Apply moderation action
    if (action !== 'none') {
      const tableName = `${payload.content_type}s`;
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          status: action === 'hide' ? 'hidden' : 'flagged',
        })
        .eq('id', payload.content_id);

      if (updateError) throw updateError;

      // Create moderation log
      const { error: logError } = await supabase
        .from('moderation_actions')
        .insert({
          moderator_id: '00000000-0000-0000-0000-000000000000', // System moderator
          target_type: payload.content_type,
          target_id: payload.content_id,
          action: action === 'hide' ? 'hide' : 'warn',
          reason: violations.join(', '),
        });

      if (logError) throw logError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        violations,
        message: action === 'none' ? 'Content passed moderation' : `Content ${action}d`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in moderation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
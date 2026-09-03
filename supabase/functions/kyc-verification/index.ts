/**
 * KYC Verification Edge Function
 * Handles identity verification requests
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface KycSubmissionPayload {
  user_id: string;
  document_type: 'passport' | 'national_id' | 'drivers_license';
  document_number: string;
  document_front_url: string;
  document_back_url?: string;
  selfie_url: string;
  full_name: string;
  date_of_birth: string;
  address: string;
  country: string;
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

    if (req.method === 'GET') {
      // Get KYC status
      const { data: verification, error: fetchError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      return new Response(
        JSON.stringify({ 
          status: verification?.status || 'not_submitted',
          verification: verification || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const payload: KycSubmissionPayload = await req.json();

      // Validate required fields
      if (!payload.document_type || !payload.document_number || !payload.document_front_url || !payload.selfie_url) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already submitted
      const { data: existing, error: existingError } = await supabase
        .from('kyc_verifications')
        .select('id, status')
        .eq('user_id', user.id)
        .single();

      if (existing && existing.status === 'pending') {
        return new Response(
          JSON.stringify({ error: 'Verification already pending' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Submit KYC verification
      const { data: verification, error: submitError } = await supabase
        .from('kyc_verifications')
        .upsert({
          user_id: user.id,
          document_type: payload.document_type,
          document_number: payload.document_number,
          document_front_url: payload.document_front_url,
          document_back_url: payload.document_back_url,
          selfie_url: payload.selfie_url,
          full_name: payload.full_name,
          date_of_birth: payload.date_of_birth,
          address: payload.address,
          country: payload.country,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (submitError) throw submitError;

      // Update user verification status
      const { error: updateError } = await supabase
        .from('users')
        .update({ verification_status: 'pending' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Send notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'verification',
          title: 'Verification Submitted',
          body: 'Your identity verification has been submitted for review.',
          status: 'unread',
          channels: ['in_app'],
        });

      if (notificationError) throw notificationError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification submitted successfully',
          verification,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in kyc-verification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
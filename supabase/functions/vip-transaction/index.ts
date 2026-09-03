/**
 * VIP Transaction Edge Function
 * Handles VIP point transactions securely
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VipTransactionPayload {
  user_id: string;
  type: 'purchase' | 'consumption' | 'refund' | 'bonus' | 'adjustment';
  amount: number;
  description: string;
  reference_id?: string;
  metadata?: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify service role authorization (server-to-server only)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: VipTransactionPayload = await req.json();

    // Validate payload
    if (!payload.user_id || !payload.type || !payload.amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current VIP account
    const { data: vipAccount, error: fetchError } = await supabase
      .from('vip_accounts')
      .select('*')
      .eq('user_id', payload.user_id)
      .single();

    if (fetchError) throw fetchError;

    if (!vipAccount) {
      return new Response(
        JSON.stringify({ error: 'VIP account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new balance
    let pointsBefore = vipAccount.points_balance;
    let pointsAfter = vipAccount.points_balance;
    let totalEarned = vipAccount.total_points_earned;
    let totalSpent = vipAccount.total_points_spent;

    switch (payload.type) {
      case 'purchase':
      case 'bonus':
      case 'refund':
        pointsAfter += payload.amount;
        totalEarned += payload.amount;
        break;
      case 'consumption':
      case 'adjustment':
        pointsAfter -= payload.amount;
        totalSpent += payload.amount;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid transaction type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Check for negative balance
    if (pointsAfter < 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient points balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('vip_transactions')
      .insert({
        user_id: payload.user_id,
        type: payload.type,
        amount: payload.amount,
        status: 'completed',
        points_before: pointsBefore,
        points_after: pointsAfter,
        description: payload.description,
        reference_id: payload.reference_id,
        metadata: payload.metadata,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update VIP account
    const { data: updatedAccount, error: updateError } = await supabase
      .from('vip_accounts')
      .update({
        points_balance: pointsAfter,
        total_points_earned: totalEarned,
        total_points_spent: totalSpent,
      })
      .eq('user_id', payload.user_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Send notification if points changed significantly
    if (Math.abs(payload.amount) >= 100) {
      await supabase
        .from('notifications')
        .insert({
          user_id: payload.user_id,
          type: 'vip',
          title: 'VIP Points Update',
          body: `${payload.amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(payload.amount)} points: ${payload.description}`,
          status: 'unread',
          data: { transaction_id: transaction.id },
          channels: ['in_app'],
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction completed successfully',
        transaction,
        vip_account: updatedAccount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vip-transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
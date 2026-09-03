 * VIP Service
 * Handles VIP membership and points operations
 */

import { supabase } from '@/config/supabase.client';
import { VipAccount, VipTransaction } from '@dating-app/types';

class VipService {
  async getVipAccount(userId: string): Promise<VipAccount | null> {
    try {
      const { data, error } = await supabase
        .from('vip_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as VipAccount;
    } catch {
      return null;
    }
  }

  async getVipTransactions(userId: string, limit = 50): Promise<VipTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('vip_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as VipTransaction[];
    } catch {
      return [];
    }
  }

  async useVipFeature(
    userId: string,
    featureId: string,
    pointsCost: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('vip-transaction', {
        body: {
          user_id: userId,
          type: 'consumption',
          amount: pointsCost,
          description: `Used VIP feature: ${featureId}`,
        },
      });

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  async purchasePoints(userId: string, amount: number): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('vip-transaction', {
        body: {
          user_id: userId,
          type: 'purchase',
          amount,
          description: `Purchased ${amount} points`,
        },
      });

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
}

export const vipService = new VipService();
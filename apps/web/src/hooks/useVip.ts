/**
 * useVip Hook
 * VIP membership management
 */

import { useState, useCallback } from 'react';
import { VipAccount, VipTransaction } from '@dating-app/types';
import { vipService } from '@/services/vip.service';

interface UseVipReturn {
  vipAccount: VipAccount | null;
  transactions: VipTransaction[];
  loading: boolean;
  error: string | null;
  loadVipAccount: (userId: string) => Promise < void > ;
  loadTransactions: (userId: string) => Promise < void > ;
  useFeature: (userId: string, featureId: string, pointsCost: number) => Promise < boolean > ;
  purchasePoints: (userId: string, amount: number) => Promise < boolean > ;
}

export function useVip(): UseVipReturn {
  const [vipAccount, setVipAccount] = useState < VipAccount | null > (null);
  const [transactions, setTransactions] = useState < VipTransaction[] > ([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const loadVipAccount = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const account = await vipService.getVipAccount(userId);
      setVipAccount(account);
    } catch (err: any) {
      setError(err.message || 'Failed to load VIP account');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const loadTransactions = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const vipTransactions = await vipService.getVipTransactions(userId);
      setTransactions(vipTransactions);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const useFeature = useCallback(async (userId: string, featureId: string, pointsCost: number) => {
    setError(null);
    
    try {
      const success = await vipService.useVipFeature(userId, featureId, pointsCost);
      if (success) {
        await loadVipAccount(userId);
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to use feature');
      return false;
    }
  }, [loadVipAccount]);
  
  const purchasePoints = useCallback(async (userId: string, amount: number) => {
    setError(null);
    
    try {
      const success = await vipService.purchasePoints(userId, amount);
      if (success) {
        await loadVipAccount(userId);
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to purchase points');
      return false;
    }
  }, [loadVipAccount]);
  
  return {
    vipAccount,
    transactions,
    loading,
    error,
    loadVipAccount,
    loadTransactions,
    useFeature,
    purchasePoints,
  };
}
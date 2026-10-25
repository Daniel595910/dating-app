import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase.client';

/**
 * Returns true if the current user has an active VIP entitlement.
 *
 * Schema facts this encodes:
 *  - vip_accounts.level enum: 'basic' | 'premium' | 'vip' — no 'free' value.
 *    Free users have no vip_accounts row at all.
 *  - plan_expires_at is the app's entitlement signal. A null expiry is
 *    treated as "no entitlement", not "lifetime". Lifetime grants should
 *    use a far-future date, not null.
 *  - RLS permits self-read (view_own_vip / Users can view their own VIP account).
 */
export function useUserVip(): boolean {
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from('vip_accounts')
        .select('level, plan_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn('[useUserVip] lookup failed:', error.message);
        return;
      }
      if (!data) return;

      const levelOk = ['basic', 'premium', 'vip'].includes(data.level as string);
      const expiryOk = data.plan_expires_at
        ? new Date(data.plan_expires_at) > new Date()
        : false;

      setIsVip(levelOk && expiryOk);
    })();
    return () => { cancelled = true; };
  }, []);

  return isVip;
}
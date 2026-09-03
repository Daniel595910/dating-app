/**
 * VipPage Component
 * VIP membership page
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { VipAccount } from '@dating-app/types';
import { VipStatus } from '@/components/profile/VipStatus';
import { Button } from '@dating-app/ui';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import styles from './VipPage.module.css';

export const VipPage: React.FC = () => {
  const [vipAccount, setVipAccount] = useState < VipAccount | null > (null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    const fetchVipAccount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error: fetchError } = await supabase
          .from('vip_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (fetchError) throw fetchError;
        setVipAccount(data as VipAccount);
      } catch (err: any) {
        setError(err.message || 'Failed to load VIP status');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVipAccount();
  }, []);
  
  if (loading) {
    return <LoadingScreen message="Loading VIP status..." />;
  }
  
  if (error || !vipAccount) {
    return <div className={styles.error}>{error || 'VIP account not found'}</div>;
  }
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>VIP Membership</h1>
      <VipStatus
        level={vipAccount.level}
        pointsBalance={vipAccount.points_balance}
        planExpiresAt={vipAccount.plan_expires_at}
      />
      <div className={styles.upgradeSection}>
        <h2 className={styles.upgradeTitle}>Upgrade Your Experience</h2>
        <div className={styles.plans}>
          <div className={styles.plan}>
            <h3 className={styles.planName}>Basic</h3>
            <p className={styles.planPrice}>$9.99/month</p>
            <ul className={styles.planFeatures}>
              <li>Unlimited matches</li>
              <li>See who liked you</li>
            </ul>
            <Button variant="outline" fullWidth>
              Choose Basic
            </Button>
          </div>
          <div className={styles.plan}>
            <h3 className={styles.planName}>Premium</h3>
            <p className={styles.planPrice}>$19.99/month</p>
            <ul className={styles.planFeatures}>
              <li>Everything in Basic</li>
              <li>Priority profile visibility</li>
              <li>Advanced filters</li>
            </ul>
            <Button fullWidth>
              Choose Premium
            </Button>
          </div>
          <div className={styles.plan}>
            <h3 className={styles.planName}>VIP</h3>
            <p className={styles.planPrice}>$29.99/month</p>
            <ul className={styles.planFeatures}>
              <li>Everything in Premium</li>
              <li>VIP badge</li>
              <li>Dedicated support</li>
            </ul>
            <Button variant="outline" fullWidth>
              Choose VIP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
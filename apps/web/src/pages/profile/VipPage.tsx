import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Star, Check, CreditCard, Crown } from 'lucide-react';
import styles from './VipPage.module.css';

interface VipPlan {
  id: string;
  name: string;
  level: string;
  description: string;
  price: number;
  durationDays: number;
  pointsIncluded: number;
  features: string[];
}

export const VipPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentLevel, setCurrentLevel] = useState('free');
  const [credits, setCredits] = useState(0);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans: VipPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      level: 'basic',
      description: 'Get started with enhanced features',
      price: 9.99,
      durationDays: 30,
      pointsIncluded: 100,
      features: ['Unlimited matches', 'See who liked you', 'Basic filters'],
    },
    {
      id: 'premium',
      name: 'Premium',
      level: 'premium',
      description: 'Our most popular plan',
      price: 19.99,
      durationDays: 30,
      pointsIncluded: 500,
      features: ['Everything in Basic', 'Priority profile visibility', 'Advanced filters', 'Create community (100 credits)'],
    },
    {
      id: 'vip',
      name: 'VIP',
      level: 'vip',
      description: 'Maximum features and visibility',
      price: 29.99,
      durationDays: 30,
      pointsIncluded: 1000,
      features: ['Everything in Premium', 'VIP badge', 'Dedicated support', 'Sponsor communities'],
    },
  ];

  useEffect(() => {
    const loadVipData = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('vip_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setCurrentLevel(data.level);
        setCredits(data.community_credits || 0);
        setPoints(data.points_balance || 0);
      }

      setLoading(false);
    };

    loadVipData();
  }, [user]);

  const handleUpgrade = async (plan: VipPlan) => {
    if (!user) return;
    setProcessing(plan.id);
    setError(null);
    setSuccess(null);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const { error: updateError } = await supabase
        .from('vip_accounts')
        .update({
          level: plan.level,
          plan_id: plan.id,
          plan_expires_at: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString(),
          points_balance: points + plan.pointsIncluded,
          total_points_earned: points + plan.pointsIncluded,
          community_credits: credits + Math.floor(plan.pointsIncluded / 5),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCurrentLevel(plan.level);
      setCredits((prev) => prev + Math.floor(plan.pointsIncluded / 5));
      setPoints((prev) => prev + plan.pointsIncluded);
      setSuccess(`Successfully upgraded to ${plan.name}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading VIP info...</p>
      </div>
    );
  }

  return (
    <div className={styles.vipPage}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate('/profile')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>VIP Membership</h1>
      </header>

      <div className={styles.content}>
        {/* Current Status */}
        <div className={styles.statusCard}>
          <Crown size={28} className={styles.statusIcon} />
          <div>
            <p className={styles.statusLabel}>Current Plan</p>
            <p className={styles.statusLevel}>{currentLevel.toUpperCase()}</p>
          </div>
          <div className={styles.statusStats}>
            <div className={styles.statusStat}>
              <span className={styles.statusStatValue}>{credits}</span>
              <span className={styles.statusStatLabel}>Credits</span>
            </div>
            <div className={styles.statusStat}>
              <span className={styles.statusStatValue}>{points}</span>
              <span className={styles.statusStatLabel}>Points</span>
            </div>
          </div>
        </div>

        {success && (
          <div className={styles.successBanner}>{success}</div>
        )}
        {error && (
          <div className={styles.errorBanner}>{error}</div>
        )}

        {/* Plans */}
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.planCard} ${currentLevel === plan.level ? styles.planCardActive : ''}`}
            >
              <div className={styles.planHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                {currentLevel === plan.level && (
                  <span className={styles.currentBadge}>Current</span>
                )}
              </div>
              <p className={styles.planPrice}>${plan.price}/month</p>
              <p className={styles.planDescription}>{plan.description}</p>
              <ul className={styles.planFeatures}>
                {plan.features.map((feature) => (
                  <li key={feature} className={styles.planFeature}>
                    <Check size={14} className={styles.featureCheck} />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={styles.upgradeButton}
                onClick={() => handleUpgrade(plan)}
                disabled={currentLevel === plan.level || processing === plan.id}
              >
                {processing === plan.id
                  ? 'Processing...'
                  : currentLevel === plan.level
                    ? 'Current Plan'
                    : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* Buy Credits */}
        <div className={styles.creditsSection}>
          <h3 className={styles.creditsTitle}>Buy Community Credits</h3>
          <p className={styles.creditsDescription}>
            Use credits to create communities and sponsor them.
          </p>
          <div className={styles.creditsPackages}>
            <button className={styles.creditPackage}>
              <CreditCard size={20} />
              <span>100 Credits</span>
              <span className={styles.creditPrice}>$5</span>
            </button>
            <button className={styles.creditPackage}>
              <CreditCard size={20} />
              <span>500 Credits</span>
              <span className={styles.creditPrice}>$20</span>
            </button>
            <button className={styles.creditPackage}>
              <CreditCard size={20} />
              <span>1000 Credits</span>
              <span className={styles.creditPrice}>$35</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

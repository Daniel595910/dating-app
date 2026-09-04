import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Star, Check, CreditCard, Crown, Clock, Sparkles, TrendingUp } from 'lucide-react';
import styles from './VipPage.module.css';

export const VipPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentLevel, setCurrentLevel] = useState('free');
  const [credits, setCredits] = useState(0);
  const [points, setPoints] = useState(0);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans = [
    {
      id: 'basic-plan',
      name: 'Basic',
      level: 'basic',
      description: 'Get started with enhanced features',
      price: 9.99,
      durationDays: 30,
      pointsIncluded: 100,
      creditsIncluded: 20,
      features: ['Unlimited matches', 'See who liked you', 'Basic filters', '20 community credits'],
    },
    {
      id: 'premium-plan',
      name: 'Premium',
      level: 'premium',
      description: 'Our most popular plan',
      price: 19.99,
      durationDays: 30,
      pointsIncluded: 500,
      creditsIncluded: 100,
      features: ['Everything in Basic', 'Priority profile visibility', 'Advanced filters', '100 community credits', 'Create community'],
    },
    {
      id: 'vip-plan',
      name: 'VIP',
      level: 'vip',
      description: 'Maximum features and visibility',
      price: 29.99,
      durationDays: 30,
      pointsIncluded: 1000,
      creditsIncluded: 500,
      features: ['Everything in Premium', 'VIP badge', 'Dedicated support', '500 community credits', 'Sponsor communities'],
    },
  ];

  useEffect(() => {
    loadVipData();
  }, [user]);

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
      setPlanExpiresAt(data.plan_expires_at);
      setTotalSpent(data.total_points_spent || 0);
    }

    setLoading(false);
  };

  const handleUpgrade = async (plan: any) => {
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
          community_credits: credits + plan.creditsIncluded,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCurrentLevel(plan.level);
      setCredits((prev) => prev + plan.creditsIncluded);
      setPoints((prev) => prev + plan.pointsIncluded);
      setPlanExpiresAt(new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString());
      setSuccess('Successfully upgraded to ' + plan.name + '!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade');
    } finally {
      setProcessing(null);
    }
  };

  const handleBuyCredits = async (amount: number, price: number) => {
    if (!user) return;
    setProcessing('credits-' + amount);
    setError(null);
    setSuccess(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { error: updateError } = await supabase
        .from('vip_accounts')
        .update({
          community_credits: credits + amount,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCredits((prev) => prev + amount);
      setSuccess('Successfully purchased ' + amount + ' credits!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to purchase credits');
    } finally {
      setProcessing(null);
    }
  };

  const daysRemaining = planExpiresAt
    ? Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;

  const subscriptionProgress = planExpiresAt
    ? Math.min(100, Math.max(0, ((30 - daysRemaining) / 30) * 100))
    : 0;

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
        <h1 className={styles.headerTitle}>VIP & Credits</h1>
      </header>

      <div className={styles.content}>
        {/* Current Status Card */}
        <div className={styles.statusCard}>
          <Crown size={28} className={styles.statusIcon} />
          <div style={{ flex: 1 }}>
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

        {/* Subscription Progress */}
        {planExpiresAt && (
          <div className={styles.subscriptionCard}>
            <div className={styles.subscriptionHeader}>
              <Clock size={16} className={styles.subscriptionIcon} />
              <span className={styles.subscriptionTitle}>Subscription Progress</span>
              <span className={styles.daysRemaining}>
                {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${subscriptionProgress}%` }}
              />
            </div>
            <p className={styles.subscriptionMeta}>
              Started: {new Date(new Date(planExpiresAt).getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              {' → '}
              Expires: {new Date(planExpiresAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {success && <div className={styles.successBanner}>{success}</div>}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Plans */}
        <h3 className={styles.sectionTitle}>Upgrade Plan</h3>
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.planCard} ${currentLevel === plan.level ? styles.planCardActive : ''}`}
            >
              <div className={styles.planHeader}>
                <h4 className={styles.planName}>{plan.name}</h4>
                {currentLevel === plan.level && (
                  <span className={styles.currentBadge}>Current</span>
                )}
              </div>
              <p className={styles.planPrice}>${plan.price}/month</p>
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
                {processing === plan.id ? 'Processing...' : currentLevel === plan.level ? 'Current Plan' : `Upgrade`}
              </button>
            </div>
          ))}
        </div>

        {/* Buy Credits */}
        <h3 className={styles.sectionTitle}>Buy Community Credits</h3>
        <div className={styles.creditsSection}>
          <div className={styles.creditsPackages}>
            {[
              { amount: 50, price: 5 },
              { amount: 100, price: 9 },
              { amount: 500, price: 40 },
              { amount: 1000, price: 75 },
            ].map((pkg) => (
              <button
                key={pkg.amount}
                className={styles.creditPackage}
                onClick={() => handleBuyCredits(pkg.amount, pkg.price)}
                disabled={processing === 'credits-' + pkg.amount}
              >
                <CreditCard size={20} />
                <span>{pkg.amount} Credits</span>
                <span className={styles.creditPrice}>${pkg.price}</span>
              </button>
            ))}
          </div>
        </div>

        {/* What can you do with credits */}
        <div className={styles.creditsInfo}>
          <Sparkles size={16} className={styles.creditsInfoIcon} />
          <div>
            <p className={styles.creditsInfoTitle}>What can you do with credits?</p>
            <ul className={styles.creditsInfoList}>
              <li>Create a community: 100 credits</li>
              <li>Sponsor your community: 50 credits/month</li>
              <li>Feature your community: 200 credits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

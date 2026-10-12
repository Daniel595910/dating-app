import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { paystackService, VipPlan, Subscription, CreditPack } from '@/services/paystack.service';
import {
  ArrowLeft,
  Crown,
  Coins,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  Loader,
  Star,
  Zap,
  Shield,
  ShoppingBag,
  Globe,
  CheckCircle,
  Info,
} from 'lucide-react';
import styles from './VipPage.module.css';

function formatAmount(smallestUnit: number, currency: 'NGN' | 'USD'): string {
  const value = smallestUnit / 100;
  if (currency === 'NGN') {
    return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
  }
  return `$${value.toFixed(2)}`;
}

function formatCredits(credits: number): string {
  return credits.toLocaleString('en-US');
}

export const VipPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<'NGN' | 'USD' | null>(null);
  const [suggestedCurrency, setSuggestedCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [loading, setLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [plansData, packsData, subData, currencyData, accountData] = await Promise.all([
          paystackService.getPlans(),
          paystackService.getCreditPacks(),
          paystackService.getMySubscription(),
          paystackService.getBillingCurrency(),
          paystackService.getVipAccount(),
        ]);
        setPlans(plansData);
        setCreditPacks(packsData);
        setSubscription(subData);
        setSelectedCurrency(currencyData.currency);
        setSuggestedCurrency(currencyData.suggested);
        setCurrentCredits(accountData?.community_credits ?? 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load VIP data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleChooseCurrency = async (currency: 'NGN' | 'USD') => {
    setSelectedCurrency(currency);
    try {
      await paystackService.setBillingCurrency(currency);
    } catch (err) {
      console.error('Failed to save currency preference', err);
    }
  };

  const filteredPlans = useMemo(() => {
    if (!selectedCurrency) return [];
    return plans.filter((p) => p.currency === selectedCurrency);
  }, [plans, selectedCurrency]);

  const filteredPacks = useMemo(() => {
    if (!selectedCurrency) return [];
    return creditPacks.filter((p) => p.currency === selectedCurrency);
  }, [creditPacks, selectedCurrency]);

  const handleUpgrade = async (plan: VipPlan) => {
    if (processingKey) return;
    if (!selectedCurrency) {
      setError('Please choose your billing currency first');
      return;
    }

    setProcessingKey(`plan-${plan.plan_code}`);
    setError(null);
    setSuccessMessage(null);

    try {
      const { authorization_url } = await paystackService.initializeVipPayment(
        plan.plan_code,
        selectedCurrency
      );
      window.location.href = authorization_url;
    } catch (err: any) {
      setError(err.message || 'Failed to start payment');
      setProcessingKey(null);
    }
  };

  const handleBuyCredits = async (pack: CreditPack) => {
    if (processingKey) return;
    if (!selectedCurrency) {
      setError('Please choose your billing currency first');
      return;
    }

    setProcessingKey(`pack-${pack.pack_code}`);
    setError(null);
    setSuccessMessage(null);

    try {
      const { authorization_url } = await paystackService.initializeCreditPurchase(
        pack.pack_code,
        selectedCurrency
      );
      window.location.href = authorization_url;
    } catch (err: any) {
      setError(err.message || 'Failed to start purchase');
      setProcessingKey(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size={36} className={styles.spin} />
        <p>Loading your VIP status...</p>
      </div>
    );
  }

  const activeSubscription = subscription && subscription.status === 'active';
  const daysRemaining = activeSubscription && subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className={styles.vipPage}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate('/profile')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>VIP & Credits</h1>
      </header>

      <div className={styles.content}>
        {/* ==================================================
            ACCOUNT STATUS CARD
           ================================================== */}
        {activeSubscription ? (
          <div className={styles.statusCard}>
            <div className={styles.statusIconWrapper}>
              <Crown size={24} className={styles.statusIcon} />
            </div>
            <div className={styles.statusInfo}>
              <p className={styles.statusLabel}>Active Membership</p>
              <p className={styles.statusLevel}>{subscription.plan_code.replace('_monthly', '').toUpperCase()}</p>
              <p className={styles.statusMeta}>
                Renews {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'soon'}
              </p>
            </div>
            <div className={styles.statusStats}>
              <div className={styles.statusStat}>
                <span className={styles.statusStatValue}>
                  {formatAmount(subscription.amount, subscription.currency)}
                </span>
                <span className={styles.statusStatLabel}>per month</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.statusCardFree}>
            <div className={styles.statusIconWrapperFree}>
              <Star size={22} className={styles.statusIconFree} />
            </div>
            <div className={styles.statusInfo}>
              <p className={styles.statusLabelFree}>Free Account</p>
              <p className={styles.statusLevelFree}>Upgrade to unlock</p>
              <p className={styles.statusMetaFree}>Unlimited matches, priority visibility, and more</p>
            </div>
          </div>
        )}

        {/* ==================================================
            CREDITS BALANCE CHIP
           ================================================== */}
        <div className={styles.creditsBalanceChip}>
          <Coins size={18} className={styles.creditsBalanceIcon} />
          <div className={styles.creditsBalanceInfo}>
            <span className={styles.creditsBalanceLabel}>Credit Balance</span>
            <span className={styles.creditsBalanceValue}>{formatCredits(currentCredits)}</span>
          </div>
        </div>

        {/* ==================================================
            SUBSCRIPTION PROGRESS
           ================================================== */}
        {activeSubscription && subscription?.current_period_end && (
          <div className={styles.subscriptionCard}>
            <div className={styles.subscriptionHeader}>
              <Clock size={16} className={styles.subscriptionIcon} />
              <span className={styles.subscriptionTitle}>Billing Period</span>
              <span className={styles.daysRemaining}>{daysRemaining} days left</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(100, ((30 - daysRemaining) / 30) * 100)}%` }}
              />
            </div>
            <p className={styles.subscriptionMeta}>
              {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : '—'}
              {' → '}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* ==================================================
            BANNERS
           ================================================== */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successBanner}>
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ==================================================
            CURRENCY CHOOSER (first-time only)
           ================================================== */}
        {!selectedCurrency && (
          <div className={styles.currencyChooser}>
            <div className={styles.currencyChooserHeader}>
              <Globe size={20} className={styles.currencyChooserIcon} />
              <h3 className={styles.currencyChooserTitle}>Choose your billing currency</h3>
            </div>
            <p className={styles.currencyHint}>
              We suggested <strong>{suggestedCurrency}</strong> based on your profile.
              This choice is saved and won't change if you travel or change networks.
            </p>
            <div className={styles.currencyOptions}>
              <button
                className={`${styles.currencyButton} ${suggestedCurrency === 'NGN' ? styles.currencySuggested : ''}`}
                onClick={() => handleChooseCurrency('NGN')}
              >
                <Coins size={20} />
                <span>Nigerian Naira</span>
                <span className={styles.currencyCode}>(₦ NGN)</span>
                {suggestedCurrency === 'NGN' && <span className={styles.suggestedTag}>Suggested</span>}
              </button>
              <button
                className={`${styles.currencyButton} ${suggestedCurrency === 'USD' ? styles.currencySuggested : ''}`}
                onClick={() => handleChooseCurrency('USD')}
              >
                <Globe size={20} />
                <span>US Dollar</span>
                <span className={styles.currencyCode}>($ USD)</span>
                {suggestedCurrency === 'USD' && <span className={styles.suggestedTag}>Suggested</span>}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================
            MAIN SECTIONS (once currency chosen)
           ================================================== */}
        {selectedCurrency && (
          <>
            {/* ============================================
                VIP PLANS
               ============================================ */}
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Crown size={20} className={styles.sectionHeaderIcon} />
                <h3 className={styles.sectionTitle}>VIP Membership</h3>
              </div>
              <button
                className={styles.changeCurrencyBtn}
                onClick={() => setSelectedCurrency(null)}
                disabled={activeSubscription}
                title={activeSubscription ? 'Cancel your subscription first' : 'Change currency'}
              >
                {selectedCurrency} <span className={styles.changeDot}>•</span> Change
              </button>
            </div>

            <div className={styles.plansGrid}>
              {filteredPlans.map((plan) => {
                const isCurrent = subscription?.plan_code === plan.plan_code && subscription?.currency === plan.currency;
                const isProcessing = processingKey === `plan-${plan.plan_code}`;

                return (
                  <div
                    key={plan.id}
                    className={`${styles.planCard} ${isCurrent ? styles.planCardActive : ''}`}
                  >
                    {plan.level === 'premium' && (
                      <div className={styles.popularBadge}>
                        <Zap size={12} />
                        Popular
                      </div>
                    )}

                    {isCurrent && (
                      <div className={styles.currentBadge}>
                        <CheckCircle size={12} />
                        Current
                      </div>
                    )}

                    <div className={styles.planHeader}>
                      <div className={styles.planTitleGroup}>
                        {plan.level === 'basic' && <Star size={22} className={styles.planTierIconBasic} />}
                        {plan.level === 'premium' && <Zap size={22} className={styles.planTierIconPremium} />}
                        {plan.level === 'vip' && <Crown size={22} className={styles.planTierIconVip} />}
                        <h4 className={styles.planName}>{plan.name}</h4>
                      </div>
                    </div>

                    <p className={styles.planDescription}>{plan.description}</p>

                    <div className={styles.planPrice}>
                      <span className={styles.planPriceValue}>
                        {formatAmount(plan.amount, plan.currency)}
                      </span>
                      <span className={styles.planPricePeriod}>/month</span>
                    </div>

                    <ul className={styles.planFeatures}>
                      {plan.features.map((feature) => (
                        <li key={feature} className={styles.planFeature}>
                          <span className={styles.featureCheckWrapper}>
                            <Check size={12} />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`${styles.upgradeButton} ${isCurrent ? styles.upgradeButtonCurrent : ''}`}
                      onClick={() => handleUpgrade(plan)}
                      disabled={processingKey !== null || isCurrent}
                    >
                      {isProcessing ? (
                        <>
                          <Loader size={16} className={styles.spin} />
                          Redirecting...
                        </>
                      ) : isCurrent ? (
                        <>
                          <Check size={16} />
                          Active Plan
                        </>
                      ) : (
                        <>
                          <Crown size={16} />
                          Upgrade Now
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ============================================
                CREDIT PACKS
               ============================================ */}
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Coins size={20} className={styles.sectionHeaderIcon} />
                <h3 className={styles.sectionTitle}>Buy Credits</h3>
              </div>
            </div>

            <p className={styles.sectionSubtitle}>
              Use credits to create communities, sponsor them, or feature them.
            </p>

            <div className={styles.packsGrid}>
              {filteredPacks.map((pack) => {
                const isProcessing = processingKey === `pack-${pack.pack_code}`;

                return (
                  <button
                    key={`${pack.pack_code}-${pack.currency}`}
                    className={styles.packCard}
                    onClick={() => handleBuyCredits(pack)}
                    disabled={processingKey !== null}
                  >
                    <div className={styles.packIcon}>
                      <Coins size={22} />
                    </div>
                    <div className={styles.packInfo}>
                      <span className={styles.packCredits}>{formatCredits(pack.credits)}</span>
                      <span className={styles.packLabel}>credits</span>
                    </div>
                    <div className={styles.packPrice}>
                      {isProcessing ? (
                        <Loader size={16} className={styles.spin} />
                      ) : (
                        formatAmount(pack.amount, pack.currency)
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ============================================
                CREDITS INFO
               ============================================ */}
            <div className={styles.creditsInfo}>
              <div className={styles.creditsInfoHeader}>
                <Info size={16} className={styles.creditsInfoIcon} />
                <p className={styles.creditsInfoTitle}>What can you do with credits?</p>
              </div>
              <ul className={styles.creditsInfoList}>
                <li>
                  <ShoppingBag size={12} />
                  Create a community: 100 credits
                </li>
                <li>
                  <Sparkles size={12} />
                  Sponsor your community: 50 credits
                </li>
                <li>
                  <Shield size={12} />
                  Feature your community: 200 credits
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

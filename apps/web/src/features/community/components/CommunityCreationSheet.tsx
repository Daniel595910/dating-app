import React, { useState } from 'react';
import { X, Globe, Lock, Users, CreditCard, Check } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/CommunityCreationSheet.module.css';

interface CommunityCreationSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  vipLevel: string;
  credits: number;
  onSuccess: () => void;
}

export const CommunityCreationSheet: React.FC<CommunityCreationSheetProps> = ({
  open,
  onClose,
  userId,
  vipLevel,
  credits,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [regionType, setRegionType] = useState('city');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const CREATION_COST = 100;

  const handleSubmit = async () => {
    if (!name.trim() || !country.trim()) {
      setError('Community name and country are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc('request_community_creation', {
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_country: country,
        p_state: state || null,
        p_city: city || null,
        p_region_type: regionType,
        p_is_private: isPrivate,
      });

      if (rpcError) throw rpcError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setDescription('');
        setState('');
        setCity('');
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h3 className={styles.title}>
            {success ? 'Request Submitted!' : 'Create Community'}
          </h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}><Check size={32} /></div>
            <p className={styles.successText}>
              Your community request has been submitted! An admin will review it shortly.
            </p>
            <p className={styles.creditInfo}>
              100 credits deducted. Will be refunded if rejected.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.vipBanner}>
              <CreditCard size={16} />
              <span>VIP {vipLevel !== 'free' ? vipLevel.toUpperCase() : 'REQUIRED'}</span>
              <span className={styles.creditsBadge}>{credits} credits</span>
            </div>

            {vipLevel === 'free' ? (
              <div className={styles.noAccess}>
                <Lock size={28} className={styles.noAccessIcon} />
                <p className={styles.noAccessText}>
                  VIP membership is required to create a community.
                </p>
                <button className={styles.upgradeButton}>
                  Upgrade to VIP
                </button>
              </div>
            ) : credits < CREATION_COST ? (
              <div className={styles.noAccess}>
                <CreditCard size={28} className={styles.noAccessIcon} />
                <p className={styles.noAccessText}>
                  You need {CREATION_COST - credits} more credits to create a community.
                </p>
                <p className={styles.costText}>
                  Cost: {CREATION_COST} credits
                </p>
              </div>
            ) : (
              <>
                <div className={styles.form}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Community Name *</label>
                    <input
                      className={styles.fieldInput}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Port Harcourt Singles"
                      maxLength={200}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Description</label>
                    <textarea
                      className={styles.fieldTextarea}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this community about?"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Country *</label>
                      <select className={styles.fieldSelect} value={country} onChange={(e) => setCountry(e.target.value)}>
                        <option value="Nigeria">Nigeria</option>
                        <option value="Ghana">Ghana</option>
                        <option value="South Africa">South Africa</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                      </select>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Region Type</label>
                      <select className={styles.fieldSelect} value={regionType} onChange={(e) => setRegionType(e.target.value)}>
                        <option value="city">City</option>
                        <option value="state">State</option>
                        <option value="country">Country</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>State</label>
                      <input className={styles.fieldInput} value={state} onChange={(e) => setState(e.target.value)} placeholder="Optional" />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>City</label>
                      <input className={styles.fieldInput} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>

                  <div className={styles.privateToggle}>
                    <button
                      className={`${styles.toggleButton} ${isPrivate ? styles.toggleActive : ''}`}
                      onClick={() => setIsPrivate(!isPrivate)}
                    >
                      {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                      {isPrivate ? 'Private Community' : 'Public Community'}
                    </button>
                    <span className={styles.costText}>
                      Cost: {CREATION_COST} credits
                    </span>
                  </div>

                  {error && <p className={styles.error}>{error}</p>}

                  <button className={styles.submitButton} onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

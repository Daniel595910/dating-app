import React, { useState } from 'react';
import { X, Globe, Lock, Users, CreditCard, Check, Upload } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { mediaService } from '../services/media.service';
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const CREATION_COST = 100;

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !country.trim()) {
      setError('Community name and country are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload logo first (if user selected one)
      let avatarUrl: string | null = null;
      if (avatarFile) {
        setAvatarUploading(true);
        const upload = await mediaService.uploadImage(avatarFile, userId, 'community_logo');
        setAvatarUploading(false);
        if (!upload.success || !upload.media) {
          setError(upload.error || 'Logo upload failed');
          setSubmitting(false);
          return;
        }
        avatarUrl = upload.media.url;
      }

      // Then submit the request
      const { error: rpcError } = await supabase.rpc('request_community_creation', {
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_country: country,
        p_state: state || null,
        p_city: city || null,
        p_region_type: regionType,
        p_is_private: isPrivate,
        p_avatar_url: avatarUrl,
      });

      if (rpcError) throw rpcError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setDescription('');
        setState('');
        setCity('');
        setAvatarFile(null);
        setAvatarPreview(null);
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
                  {/* Logo Picker */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading || submitting}
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: '50%',
                        border: '2px dashed var(--color-border-strong, #e5e7eb)',
                        background: avatarPreview ? 'transparent' : 'var(--color-surface-alt, #f9fafb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: avatarUploading ? 'wait' : 'pointer',
                        overflow: 'hidden',
                        padding: 0,
                        position: 'relative',
                      }}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--color-text-muted, #9ca3af)' }}>
                          <Upload size={24} />
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{avatarUploading ? 'Uploading...' : 'Add Logo'}</span>
                        </div>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarPick}
                      style={{ display: 'none' }}
                    />
                  </div>

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

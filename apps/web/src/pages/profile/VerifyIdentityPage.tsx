import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { supabase } from '@/config/supabase.client';
import { verificationService, VerificationRequest } from '@/features/verification/services/verification.service';
import {
  ArrowLeft, Camera, Upload, CheckCircle2, Clock, XCircle, Shield,
  Hand, UserCheck, FileText,
} from 'lucide-react';
import styles from './VerifyIdentityPage.module.css';

type Step = 'status' | 'intro' | 'selfie' | 'id' | 'review' | 'submitting';

export const VerifyIdentityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((state) => state.showToast);

  const [existing, setExisting] = useState<VerificationRequest | null>(null);
  const [step, setStep] = useState<Step>('status');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idDocType, setIdDocType] = useState<'passport' | 'national_id' | 'drivers_license'>('national_id');
  const [countryCode, setCountryCode] = useState<string>('NG');
  const [loading, setLoading] = useState(true);

  // Load existing verification status + user country
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [verif, profile] = await Promise.all([
        verificationService.getMyLatestVerification(user.id),
        supabase.from('profiles').select('location').eq('user_id', user.id).maybeSingle(),
      ]);
      setExisting(verif);
      const cc = profile.data?.location?.countryCode || profile.data?.location?.country_code || 'NG';
      setCountryCode(cc);
      setLoading(false);
    })();
  }, [user]);

  const onPickSelfie = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      showToast('Please choose an image', 'error');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10 MB', 'error');
      return;
    }
    setSelfieFile(f);
    setSelfiePreview(URL.createObjectURL(f));
  };

  const onPickId = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      showToast('Please choose an image', 'error');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10 MB', 'error');
      return;
    }
    setIdFile(f);
    setIdPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user || !selfieFile || !idFile) return;
    setStep('submitting');
    const result = await verificationService.submit({
      userId: user.id,
      selfieFile,
      idFile,
      idDocumentType: idDocType,
      countryCode,
    });

    if (!result.success) {
      showToast(result.error || 'Submission failed', 'error');
      setStep('review');
      return;
    }

    showToast('Submitted! We\'ll review within 24 hours.', 'success');
    // Reload the latest request so the status screen shows 'pending'
    const fresh = await verificationService.getMyLatestVerification(user.id);
    setExisting(fresh);
    setStep('status');
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h1 className={styles.headerTitle}>Verify Identity</h1>
        </header>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  const isPending = existing?.status === 'pending';
  const isApproved = existing?.status === 'approved';
  const isRejected = existing?.status === 'rejected';
  const canStart = !existing || isRejected;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Verify Identity</h1>
      </header>

      {/* ===================== STATUS SCREEN ===================== */}
      {step === 'status' && (
        <div className={styles.content}>
          {isApproved && (
            <div className={styles.statusCard}>
              <div className={`${styles.statusIcon} ${styles.statusIconGreen}`}>
                <CheckCircle2 size={32} />
              </div>
              <h2 className={styles.statusTitle}>You&apos;re verified</h2>
              <p className={styles.statusText}>
                Your identity has been confirmed. A blue badge will appear on your profile.
              </p>
            </div>
          )}

          {isPending && (
            <div className={styles.statusCard}>
              <div className={`${styles.statusIcon} ${styles.statusIconYellow}`}>
                <Clock size={32} />
              </div>
              <h2 className={styles.statusTitle}>Under review</h2>
              <p className={styles.statusText}>
                We received your submission on{' '}
                {new Date(existing!.submitted_at).toLocaleString()}. Most reviews take
                under 24 hours.
              </p>
            </div>
          )}

          {isRejected && (
            <div className={styles.statusCard}>
              <div className={`${styles.statusIcon} ${styles.statusIconRed}`}>
                <XCircle size={32} />
              </div>
              <h2 className={styles.statusTitle}>Verification failed</h2>
              <p className={styles.statusText}>
                {existing?.rejection_reason || 'Your submission was not accepted.'}
              </p>
              <button className={styles.primaryButton} onClick={() => setStep('intro')}>
                Try again
              </button>
            </div>
          )}

          {!existing && (
            <div className={styles.statusCard}>
              <div className={`${styles.statusIcon} ${styles.statusIconBlue}`}>
                <Shield size={32} />
              </div>
              <h2 className={styles.statusTitle}>Get verified</h2>
              <p className={styles.statusText}>
                Verified profiles get more replies and appear higher in discovery.
                It takes about 2 minutes.
              </p>
              <button className={styles.primaryButton} onClick={() => setStep('intro')}>
                Start verification
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================== INTRO ===================== */}
      {step === 'intro' && (
        <div className={styles.content}>
          <h2 className={styles.stepTitle}>How it works</h2>
          <div className={styles.stepList}>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>1</div>
              <div>
                <div className={styles.stepItemTitle}>Take a selfie with your hand</div>
                <div className={styles.stepItemText}>
                  Hold your hand beside your face — palm open, fingers visible. This proves
                  you&apos;re a real person.
                </div>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>2</div>
              <div>
                <div className={styles.stepItemTitle}>Upload your ID</div>
                <div className={styles.stepItemText}>
                  Passport, national ID, or driver&apos;s license. A clear photo works.
                </div>
              </div>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>3</div>
              <div>
                <div className={styles.stepItemTitle}>We review it</div>
                <div className={styles.stepItemText}>
                  Usually within 24 hours. Your documents are stored privately and never
                  shown to other users.
                </div>
              </div>
            </div>
          </div>
          <button className={styles.primaryButton} onClick={() => setStep('selfie')}>
            Continue
          </button>
        </div>
      )}

      {/* ===================== SELFIE ===================== */}
      {step === 'selfie' && (
        <div className={styles.content}>
          <h2 className={styles.stepTitle}>Step 1 — Selfie with hand</h2>
          <p className={styles.stepText}>
            Hold your hand beside your face like the example. Make sure both your face
            and hand are clearly visible.
          </p>

          <div className={styles.exampleBox}>
            <Hand size={40} />
            <div className={styles.exampleText}>Face + open hand beside it</div>
          </div>

          {selfiePreview ? (
            <img src={selfiePreview} alt="Selfie preview" className={styles.preview} />
          ) : (
            <label className={styles.uploadBox}>
              <Camera size={28} />
              <span>Take or upload selfie</span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={onPickSelfie}
                style={{ display: 'none' }}
              />
            </label>
          )}

          <div className={styles.navRow}>
            <button className={styles.secondaryButton} onClick={() => setStep('intro')}>
              Back
            </button>
            <button
              className={styles.primaryButton}
              disabled={!selfieFile}
              onClick={() => setStep('id')}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ===================== ID ===================== */}
      {step === 'id' && (
        <div className={styles.content}>
          <h2 className={styles.stepTitle}>Step 2 — Your ID</h2>
          <p className={styles.stepText}>
            A clear photo of your passport, national ID, or driver&apos;s license.
          </p>

          <div className={styles.selectGroup}>
            {(
              [
                { v: 'national_id', l: 'National ID' },
                { v: 'passport', l: 'Passport' },
                { v: 'drivers_license', l: "Driver's License" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                className={`${styles.typeBtn} ${idDocType === o.v ? styles.typeBtnActive : ''}`}
                onClick={() => setIdDocType(o.v)}
              >
                <FileText size={14} />
                {o.l}
              </button>
            ))}
          </div>

          {idPreview ? (
            <img src={idPreview} alt="ID preview" className={styles.preview} />
          ) : (
            <label className={styles.uploadBox}>
              <Upload size={28} />
              <span>Upload ID photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={onPickId}
                style={{ display: 'none' }}
              />
            </label>
          )}

          <div className={styles.navRow}>
            <button className={styles.secondaryButton} onClick={() => setStep('selfie')}>
              Back
            </button>
            <button
              className={styles.primaryButton}
              disabled={!idFile}
              onClick={() => setStep('review')}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ===================== REVIEW ===================== */}
      {step === 'review' && (
        <div className={styles.content}>
          <h2 className={styles.stepTitle}>Confirm and submit</h2>
          <p className={styles.stepText}>
            Double-check your photos. Once submitted, you can&apos;t edit them.
          </p>

          <div className={styles.reviewGrid}>
            <div>
              <div className={styles.reviewLabel}>Selfie</div>
              {selfiePreview && (
                <img src={selfiePreview} alt="Selfie" className={styles.reviewImg} />
              )}
            </div>
            <div>
              <div className={styles.reviewLabel}>{idDocType.replace(/_/g, ' ')}</div>
              {idPreview && (
                <img src={idPreview} alt="ID" className={styles.reviewImg} />
              )}
            </div>
          </div>

          <div className={styles.privacyNote}>
            <Shield size={14} />
            Your documents are stored privately. Only moderators can see them.
          </div>

          <div className={styles.navRow}>
            <button className={styles.secondaryButton} onClick={() => setStep('id')}>
              Back
            </button>
            <button className={styles.primaryButton} onClick={handleSubmit}>
              Submit for review
            </button>
          </div>
        </div>
      )}

      {/* ===================== SUBMITTING ===================== */}
      {step === 'submitting' && (
        <div className={styles.content}>
          <div className={styles.statusCard}>
            <div className={styles.statusIcon}>
              <UserCheck size={32} />
            </div>
            <h2 className={styles.statusTitle}>Uploading…</h2>
            <p className={styles.statusText}>Please wait, this takes a few seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
};
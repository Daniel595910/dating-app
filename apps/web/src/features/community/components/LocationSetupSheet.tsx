import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { locationService } from '@/services/location.service';
import { reverseGeocode, countryCodeToFlag } from '@/utils/reverseGeocode';
import styles from '../styles/LocationSetupSheet.module.css';

interface LocationSetupSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onLocationSaved: () => void;
}

type DetectState = 'idle' | 'detecting' | 'success' | 'denied' | 'error';

interface VerifiedLocation {
  country: string;
  countryCode: string;
  state: string;
  city: string;
  lat: number;
  lng: number;
}

export const LocationSetupSheet: React.FC<LocationSetupSheetProps> = ({
  open,
  onClose,
  userId,
  onLocationSaved,
}) => {
  const [step, setStep] = useState<'select' | 'saving' | 'success'>('select');
  const [detectState, setDetectState] = useState<DetectState>('idle');
  const [detectError, setDetectError] = useState<string | null>(null);
  const [verified, setVerified] = useState<VerifiedLocation | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unsupportedCountry, setUnsupportedCountry] = useState<string | null>(null);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setStep('select');
      setDetectState('idle');
      setDetectError(null);
      setVerified(null);
      setSaveError(null);
      setUnsupportedCountry(null);
    }
  }, [open]);

  const handleDetect = async () => {
    setDetectState('detecting');
    setDetectError(null);
    setVerified(null);

    try {
      // Step 1 — get GPS
      const gps = await locationService.requestGps(15000);

      // Step 2 — reverse geocode for immediate preview
      const geo = await reverseGeocode(gps.lat, gps.lng);

      if (!geo.countryCode) {
        setDetectState('error');
        setDetectError('We could not figure out your location from those coordinates. Please try again.');
        return;
      }

      // Step 3 — mark verified
      setVerified({
        country: geo.country || geo.countryCode,
        countryCode: geo.countryCode,
        state: geo.state || '',
        city: geo.city || '',
        lat: gps.lat,
        lng: gps.lng,
      });
      setDetectState('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not detect location';
      setDetectState('denied');
      setDetectError(msg);
    }
  };

  const handleSave = async () => {
    if (!verified) {
      setSaveError('Please verify your location with GPS first.');
      return;
    }

    setStep('saving');
    setSaveError(null);
    setUnsupportedCountry(null);

    const result = await locationService.captureLocation({
      lat: verified.lat,
      lng: verified.lng,
      displayCity: verified.city,
      displayState: verified.state,
      displayCountry: verified.country,
      displayCountryCode: verified.countryCode,
    });

    if (!result.success) {
      setStep('select');

      if (result.errorCode === 'unsupported_country') {
        setUnsupportedCountry(verified.country);
        return;
      }

      setSaveError(result.error || 'Could not save location');
      return;
    }

    setStep('success');
    setTimeout(() => {
      onLocationSaved();
      onClose();
    }, 1500);
  };

  if (!open) return null;

  const isVerifying = detectState === 'detecting';
  const saveEnabled = detectState === 'success' && verified !== null && step === 'select';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h2 className={styles.title}>
            {step === 'success' ? 'Location Set!' : 'Set Your Location'}
          </h2>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {step === 'success' ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <Check size={32} />
            </div>
            <p className={styles.successText}>
              Your location is set! You&apos;ll be assigned to your regional community.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.iconWrapper}>
              <MapPin size={28} className={styles.mapIcon} />
            </div>

            <p className={styles.description}>
              To keep matches real, we verify your location with your device GPS. You cannot proceed without this step.
            </p>

            {/* Detect button — primary CTA */}
            {!verified && (
              <button
                className={styles.detectButton}
                onClick={handleDetect}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={16} className={styles.spinnerIcon} />
                    Detecting your location…
                  </>
                ) : detectState === 'denied' || detectState === 'error' ? (
                  <>
                    <MapPin size={16} />
                    Retry Detect
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Detect My Location
                  </>
                )}
              </button>
            )}

            {/* Error state */}
            {detectError && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{detectError}</span>
              </div>
            )}

            {/* Verified state */}
            {verified && (
              <div className={styles.verifiedBox}>
                <div className={styles.verifiedIcon}>
                  <ShieldCheck size={20} />
                </div>
                <div className={styles.verifiedContent}>
                  <p className={styles.verifiedTitle}>Location verified</p>
                  <p className={styles.verifiedDetail}>
                    {countryCodeToFlag(verified.countryCode)}{' '}
                    {[verified.city, verified.state, verified.country].filter(Boolean).join(', ')}
                  </p>
                </div>
                <button
                  className={styles.verifiedRetry}
                  onClick={handleDetect}
                  disabled={isVerifying}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Unsupported country */}
            {unsupportedCountry && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                <span>
                  We&apos;re not available in {unsupportedCountry} yet. We currently support
                  Nigeria, Ghana, South Africa, the UK, and the US.
                </span>
              </div>
            )}

            {/* Save error */}
            {saveError && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{saveError}</span>
              </div>
            )}

            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={!saveEnabled}
            >
              {step === 'saving' ? 'Saving…' : 'Save Location & Join Community'}
            </button>

            {!verified && (
              <p className={styles.requiredNote}>
                Verification required — click &quot;Detect My Location&quot; to continue.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
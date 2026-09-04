import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/LocationSetupSheet.module.css';

interface LocationSetupSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onLocationSaved: () => void;
}

interface LocationOption {
  country: string;
  countryCode: string;
  states: string[];
}

const NIGERIA_STATES = ['Lagos', 'Rivers', 'Abuja', 'Kano', 'Oyo', 'Enugu', 'Delta', 'Edo', 'Kaduna', 'Anambra'];
const GHANA_STATES = ['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Cape Coast'];
const SOUTH_AFRICA_STATES = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'];
const UK_STATES = ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'];
const USA_STATES = ['California', 'New York', 'Texas', 'Florida', 'Illinois'];

const LOCATIONS: LocationOption[] = [
  { country: 'Nigeria', countryCode: 'NG', states: NIGERIA_STATES },
  { country: 'Ghana', countryCode: 'GH', states: GHANA_STATES },
  { country: 'South Africa', countryCode: 'ZA', states: SOUTH_AFRICA_STATES },
  { country: 'United Kingdom', countryCode: 'GB', states: UK_STATES },
  { country: 'United States', countryCode: 'US', states: USA_STATES },
];

export const LocationSetupSheet: React.FC<LocationSetupSheetProps> = ({
  open,
  onClose,
  userId,
  onLocationSaved,
}) => {
  const [step, setStep] = useState<'select' | 'saving' | 'success'>('select');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleDetectLocation = () => {
    setDetectingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setDetectingLocation(false);
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetectingLocation(false);
        // We got coordinates. For privacy, we don't store exact coords.
        // In production, you'd use reverse geocoding here.
        // For now, let user select manually with a hint.
        setError('Location detected! Please select your city/state below.');
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied. Please select your location manually.');
        } else {
          setError('Unable to detect location. Please select manually.');
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSave = async () => {
    if (!selectedCountry || !selectedState) {
      setError('Please select your country and state');
      return;
    }

    setStep('saving');
    setError(null);

    try {
      const countryCode = LOCATIONS.find((l) => l.country === selectedCountry)?.countryCode || '';

      // Update profile location
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          location: {
            country: selectedCountry,
            countryCode,
            state: selectedState,
            city: selectedCity || null,
          },
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Find matching community
      const { data: communities } = await supabase
        .from('communities')
        .select('id')
        .eq('country', selectedCountry)
        .eq('status', 'active')
        .limit(1);

      if (communities && communities.length > 0) {
        // Assign user to community
        const { error: joinError } = await supabase
          .from('community_members')
          .insert({
            community_id: communities[0].id,
            user_id: userId,
            role: 'member',
          })
          .select();

        // 23505 = already member, that's fine
        if (joinError && joinError.code !== '23505') {
          console.error('Failed to join community:', joinError);
        }
      }

      setStep('success');
      setTimeout(() => {
        setStep('select');
        onLocationSaved();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
      setStep('select');
    }
  };

  if (!open) return null;

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
              Your location is set! You'll be assigned to your regional community.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.iconWrapper}>
              <MapPin size={28} className={styles.mapIcon} />
            </div>

            <p className={styles.description}>
              Choose your location to be matched with your regional dating community.
              We never share your exact address.
            </p>

            <button
              className={styles.detectButton}
              onClick={handleDetectLocation}
              disabled={detectingLocation}
            >
              {detectingLocation ? (
                <>
                  <Loader2 size={16} className={styles.spinnerIcon} />
                  Detecting...
                </>
              ) : (
                <>
                  <MapPin size={16} />
                  Detect My Location
                </>
              )}
            </button>

            <div className={styles.divider}>
              <span>or select manually</span>
            </div>

            {/* Country Select */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Country</label>
              <select
                className={styles.select}
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedState('');
                  setSelectedCity('');
                }}
              >
                <option value="">Select country</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc.countryCode} value={loc.country}>
                    {loc.country}
                  </option>
                ))}
              </select>
            </div>

            {/* State Select */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>State / Region</label>
              <select
                className={styles.select}
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity('');
                }}
                disabled={!selectedCountry}
              >
                <option value="">Select state</option>
                {selectedCountry &&
                  LOCATIONS.find((l) => l.country === selectedCountry)?.states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
              </select>
            </div>

            {/* City Input */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>City (optional)</label>
              <input
                className={styles.input}
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                placeholder="e.g. Ikeja, Port Harcourt, etc."
                disabled={!selectedState}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={!selectedCountry || !selectedState || step === 'saving'}
            >
              {step === 'saving' ? 'Saving...' : 'Save Location & Join Community'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import {
  ArrowLeft, Save, Calendar, MapPin, Heart, BadgeCheck, RotateCcw, Check,
} from 'lucide-react';
import styles from './DatingPreferencesPage.module.css';

const INTENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'serious_relationship', label: 'Serious Relationship' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'long_term', label: 'Long Term' },
  { value: 'casual_dating', label: 'Casual Dating' },
  { value: 'friendship', label: 'Friendship' },
  { value: 'unsure', label: 'Not Sure' },
];

const AGE_MIN = 18;
const AGE_MAX = 80;
const DISTANCE_MIN = 5;
const DISTANCE_MAX = 500;

interface Preferences {
  ageMin: number;
  ageMax: number;
  distance: number;
  intents: string[];
  verifiedOnly: boolean;
}

const DEFAULTS: Preferences = {
  ageMin: 18,
  ageMax: 50,
  distance: 50,
  intents: [],
  verifiedOnly: false,
};

export const DatingPreferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();

  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [initialPrefs, setInitialPrefs] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ============================================================
  // Load preferences
  // ============================================================
  useEffect(() => {
    // Wait until auth has finished hydrating — otherwise we'd
    // fetch with a null user and never fire again on some setups.
    if (authLoading) return;

    // No user (logged out) — stop loading and show defaults
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data } = await supabase
          .from('match_preferences')
          .select('age_range, distance_radius, relationship_intent, verified_only')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (data) {
          const loaded: Preferences = {
            ageMin: data.age_range?.min ?? DEFAULTS.ageMin,
            ageMax: data.age_range?.max ?? DEFAULTS.ageMax,
            distance: data.distance_radius ?? DEFAULTS.distance,
            intents: Array.isArray(data.relationship_intent) ? data.relationship_intent : [],
            verifiedOnly: data.verified_only ?? false,
          };
          setPrefs(loaded);
          setInitialPrefs(loaded);
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  // ============================================================
  // Detect changes
  // ============================================================
  const hasChanges = useMemo(() => {
    if (prefs.ageMin !== initialPrefs.ageMin) return true;
    if (prefs.ageMax !== initialPrefs.ageMax) return true;
    if (prefs.distance !== initialPrefs.distance) return true;
    if (prefs.verifiedOnly !== initialPrefs.verifiedOnly) return true;
    if (prefs.intents.length !== initialPrefs.intents.length) return true;
    const sortedA = [...prefs.intents].sort().join(',');
    const sortedB = [...initialPrefs.intents].sort().join(',');
    return sortedA !== sortedB;
  }, [prefs, initialPrefs]);

  // ============================================================
  // Actions
  // ============================================================
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = async () => {
    if (!user || !hasChanges) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('match_preferences')
        .upsert(
          {
            user_id: user.id,
            age_range: { min: prefs.ageMin, max: prefs.ageMax },
            distance_radius: prefs.distance,
            relationship_intent: prefs.intents,
            verified_only: prefs.verifiedOnly,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setInitialPrefs(prefs);
      showToast('success', 'Preferences saved');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setPrefs(DEFAULTS);
  };

  const toggleIntent = (value: string) => {
    setPrefs((prev) => ({
      ...prev,
      intents: prev.intents.includes(value)
        ? prev.intents.filter((i) => i !== value)
        : [...prev.intents, value],
    }));
  };

  const sliderFillPct =
    ((prefs.distance - DISTANCE_MIN) / (DISTANCE_MAX - DISTANCE_MIN)) * 100;

  // ============================================================
  // Render
  // ============================================================
  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h1 className={styles.headerTitle}>Dating Preferences</h1>
        </header>
        <div className={styles.loading}>Loading preferences…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Dating Preferences</h1>
        <button
          className={`${styles.saveButton} ${hasChanges ? styles.saveButtonWithChanges : ''}`}
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.text}
        </div>
      )}

      <div className={styles.content}>
        {/* ============ AGE RANGE ============ */}
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrap}>
                <Calendar size={18} />
              </div>
              <div className={styles.cardTitleGroup}>
                <h3 className={styles.cardTitle}>Age Range</h3>
                <p className={styles.cardSubtitle}>
                  Only show people within this age range
                </p>
              </div>
            </div>
            <div className={styles.ageRow}>
              <select
                className={styles.ageSelect}
                value={prefs.ageMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPrefs((p) => ({ ...p, ageMin: Math.min(v, p.ageMax) }));
                }}
                aria-label="Minimum age"
              >
                {Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i).map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
              <span className={styles.ageSeparator}>to</span>
              <select
                className={styles.ageSelect}
                value={prefs.ageMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPrefs((p) => ({ ...p, ageMax: Math.max(v, p.ageMin) }));
                }}
                aria-label="Maximum age"
              >
                {Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i).map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ============ DISTANCE ============ */}
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrap}>
                <MapPin size={18} />
              </div>
              <div className={styles.cardTitleGroup}>
                <h3 className={styles.cardTitle}>Maximum Distance</h3>
                <p className={styles.cardSubtitle}>
                  How far away can a match be?
                </p>
              </div>
            </div>
            <div className={styles.distanceValue}>
              <span className={styles.distanceNumber}>{prefs.distance}</span>
              <span className={styles.distanceUnit}>km</span>
            </div>
            <div className={styles.sliderWrap}>
              <input
                type="range"
                min={DISTANCE_MIN}
                max={DISTANCE_MAX}
                step={5}
                value={prefs.distance}
                onChange={(e) => setPrefs((p) => ({ ...p, distance: Number(e.target.value) }))}
                className={styles.slider}
                style={{ ['--slider-fill' as any]: `${sliderFillPct}%` }}
                aria-label="Maximum distance in kilometers"
              />
              <div className={styles.sliderRangeLabels}>
                <span>{DISTANCE_MIN} km</span>
                <span>{DISTANCE_MAX} km</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ LOOKING FOR ============ */}
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrap}>
                <Heart size={18} />
              </div>
              <div className={styles.cardTitleGroup}>
                <h3 className={styles.cardTitle}>Looking For</h3>
                <p className={styles.cardSubtitle}>
                  Choose one or more. Leave empty to see everyone.
                </p>
              </div>
            </div>
            <div className={styles.pillsGrid}>
              {INTENT_OPTIONS.map((opt) => {
                const active = prefs.intents.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleIntent(opt.value)}
                    className={`${styles.pill} ${active ? styles.pillActive : ''}`}
                    aria-pressed={active}
                  >
                    {active && (
                      <span className={styles.pillCheck}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============ VERIFICATION ============ */}
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.toggleRow}>
              <div className={styles.cardIconWrap}>
                <BadgeCheck size={18} />
              </div>
              <div className={styles.toggleLabel}>
                <h3 className={styles.cardTitle}>Verified Profiles Only</h3>
                <p className={styles.cardSubtitle}>
                  Only match with verified users
                </p>
              </div>
              <button
                className={`${styles.toggle} ${prefs.verifiedOnly ? styles.toggleOn : ''}`}
                onClick={() => setPrefs((p) => ({ ...p, verifiedOnly: !p.verifiedOnly }))}
                aria-label="Toggle verified profiles only"
                aria-pressed={prefs.verifiedOnly}
              >
                <span className={`${styles.toggleThumb} ${prefs.verifiedOnly ? styles.toggleThumbOn : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ============ CLEAR ============ */}
        <button
          className={styles.clearButton}
          onClick={handleClear}
          disabled={!hasChanges && prefs === initialPrefs}
        >
          <RotateCcw size={16} />
          Reset to defaults
        </button>
      </div>
    </div>
  );
};
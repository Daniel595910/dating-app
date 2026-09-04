import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Save } from 'lucide-react';

export const DatingPreferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(50);
  const [distance, setDistance] = useState(50);
  const [lookingFor, setLookingFor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('match_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setAgeMin(data.age_range?.min || 18);
        setAgeMax(data.age_range?.max || 50);
        setDistance(data.distance_radius || 50);
        setLookingFor(data.relationship_intent?.[0] || '');
      }

      setLoading(false);
    };

    loadPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: upsertError } = await supabase
        .from('match_preferences')
        .upsert({
          user_id: user.id,
          age_range: { min: ageMin, max: ageMax },
          distance_radius: distance,
          relationship_intent: lookingFor ? [lookingFor] : [],
        });

      if (upsertError) throw upsertError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/profile');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#faf9f7',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.625rem 0.75rem',
        paddingTop: 'calc(0.625rem + env(safe-area-inset-top))',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <button
          onClick={() => navigate('/profile')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827', padding: '0.5rem', borderRadius: '9999px', minWidth: 44, minHeight: 44 }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Dating Preferences</h1>
        <button onClick={handleSave} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', minWidth: 44, minHeight: 44 }}>
          {saving ? '...' : <Save size={20} />}
        </button>
      </header>

      <div style={{ padding: '1rem' }}>
        {success && (
          <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Preferences saved!
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Age Range */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 0.75rem' }}>
            Age Range
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              value={ageMin}
              onChange={(e) => setAgeMin(Number(e.target.value))}
              style={{ flex: 1, padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9375rem', fontFamily: 'inherit' }}
            >
              {Array.from({ length: 43 }, (_, i) => i + 18).map((age) => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
            <span style={{ color: '#9ca3af' }}>to</span>
            <select
              value={ageMax}
              onChange={(e) => setAgeMax(Number(e.target.value))}
              style={{ flex: 1, padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9375rem', fontFamily: 'inherit' }}
            >
              {Array.from({ length: 43 }, (_, i) => i + 18).map((age) => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Distance */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
            Distance
          </h3>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#ef4444' }}
          />
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
            {distance} km
          </p>
        </div>

        {/* Looking For */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 0.75rem' }}>
            Looking For
          </h3>
          <select
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9375rem', fontFamily: 'inherit' }}
          >
            <option value="">Select...</option>
            <option value="serious_relationship">Serious Relationship</option>
            <option value="marriage">Marriage</option>
            <option value="casual_dating">Casual Dating</option>
            <option value="friendship">Friendship</option>
            <option value="long_term">Long Term</option>
            <option value="unsure">Not Sure</option>
          </select>
        </div>
      </div>
    </div>
  );
};


/**
 * LocationSetup Page
 * Location selection during registration
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { Button } from '@dating-app/ui';
import styles from './LocationSetup.module.css';

export const LocationSetup: React.FC = () => {
  const navigate = useNavigate();
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          location: {
            country,
            countryCode: country.substring(0, 2).toUpperCase(),
            state: state || null,
            city: city || null,
          },
        })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      navigate(ROUTES.COMMUNITY);
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Location</h1>
      <p className={styles.subtitle}>
        This helps us connect you with people in your area.
      </p>

      <div className={styles.form}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Country</label>
          <select
            className={styles.select}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Select your country</option>
            <option value="Nigeria">Nigeria</option>
            <option value="Ghana">Ghana</option>
            <option value="South Africa">South Africa</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="United States">United States</option>
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>State/Region</label>
          <input
            className={styles.input}
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>City</label>
          <input
            className={styles.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <Button onClick={handleSubmit} loading={loading} fullWidth disabled={!country}>
          Continue
        </Button>
      </div>
    </div>
  );
};
/**
 * PhoneVerify Page
 * Phone verification during registration
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { Button, Input } from '@dating-app/ui';
import styles from './PhoneVerify.module.css';

export const PhoneVerify: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState < 'phone' | 'code' > ('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
      });
      
      if (error) throw error;
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: code.trim(),
        type: 'sms',
      });
      
      if (error) throw error;
      navigate(ROUTES.KYC);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Verify Your Phone</h1>
      <p className={styles.subtitle}>
        We'll send a verification code to your phone number.
      </p>

      {step === 'phone' ? (
        <div className={styles.form}>
          <Input
            type="tel"
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234 801 234 5678"
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button onClick={handleSendCode} loading={loading} fullWidth>
            Send Code
          </Button>
        </div>
      ) : (
        <div className={styles.form}>
          <Input
            label="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
            maxLength={6}
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button onClick={handleVerifyCode} loading={loading} fullWidth>
            Verify
          </Button>
          <button
            className={styles.resendButton}
            onClick={() => setStep('phone')}
            disabled={loading}
          >
            Change phone number
          </button>
        </div>
      )}
    </div>
  );
};
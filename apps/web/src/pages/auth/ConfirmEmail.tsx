/**
 * ConfirmEmail
 *
 * Two ways to verify:
 *   1. User clicks the link in the email -> Supabase creates a session
 *      automatically. We detect it and route straight to completion.
 *   2. User is on another device and types the 6-digit code -> we call
 *      authService.verifySignupOtp(email, code).
 *
 * On success we always end up at /register/complete so the profile
 * wizard runs if anything is still missing.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/constants';
import { Mail, ArrowLeft } from 'lucide-react';
import styles from './ConfirmEmail.module.css';

const CODE_LENGTH = 6;

export const ConfirmEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuthStore();

  const emailFromUrl = searchParams.get('email') || '';
  const [email] = useState(emailFromUrl);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // ---- Case 1: user clicked the email link, session already exists ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await refreshUser();
        navigate('/register/complete', { replace: true });
        return;
      }
      setCheckingSession(false);
    })();
  }, [navigate, refreshUser]);

  // Focus first input on mount (once we know we're in code-entry mode)
  useEffect(() => {
    if (!checkingSession && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [checkingSession]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept digits
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      // Backspace: clear this digit
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // If user pasted or typed multiple digits, spread them across inputs
    const chars = clean.split('').slice(0, CODE_LENGTH - index);
    const next = [...digits];
    chars.forEach((c, i) => {
      next[index + i] = c;
    });
    setDigits(next);

    // Move focus forward
    const lastFilledIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
    inputsRef.current[lastFilledIndex]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = pasted.split('').concat(Array(CODE_LENGTH - pasted.length).fill(''));
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError('Missing email — go back and register again.');
      return;
    }
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      return;
    }

    setVerifying(true);
    const result = await authService.verifySignupOtp(email, code);
    setVerifying(false);

    if (!result.success) {
      setError(result.error || 'Invalid code');
      return;
    }

    await refreshUser();
    navigate('/register/complete', { replace: true });
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError('Missing email — go back and register again.');
      return;
    }

    setResending(true);
    const result = await authService.resendSignupEmail(email);
    setResending(false);

    if (!result.success) {
      setError(result.error || 'Could not resend');
      return;
    }
    setInfo('New code sent. Check your inbox.');
  };

  if (checkingSession) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.iconWrap}><Mail size={28} /></div>
          <h1 className={styles.title}>Checking your session…</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <button
          className={styles.backButton}
          onClick={() => navigate(ROUTES.LOGIN)}
          aria-label="Back to login"
        >
          <ArrowLeft size={20} />
        </button>

        <div className={styles.iconWrap}><Mail size={28} /></div>

        <h1 className={styles.title}>Confirm your email</h1>
        <p className={styles.subtitle}>
          We sent a 6-digit code to{' '}
          <strong>{email || 'your email'}</strong>. Enter it below to finish setting up your account.
        </p>

        <div className={styles.codeRow}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              className={styles.codeInput}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={verifying}
            />
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {info && <p className={styles.info}>{info}</p>}

        <button
          className={styles.primaryButton}
          onClick={handleVerify}
          disabled={verifying || digits.join('').length !== CODE_LENGTH}
        >
          {verifying ? 'Verifying…' : 'Verify'}
        </button>

        <button
          className={styles.textButton}
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? 'Sending…' : "Didn't get it? Resend code"}
        </button>
      </div>
    </div>
  );
};
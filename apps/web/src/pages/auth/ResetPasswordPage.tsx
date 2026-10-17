import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/config/constants';
import { CheckCircle2, Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import styles from './ResetPasswordPage.module.css';

type Status = 'checking' | 'ready' | 'success' | 'error';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('checking');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // Supabase puts the recovery token in the URL hash. The SDK
      // picks it up automatically. Retry a few times while it settles.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setStatus('ready');
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (cancelled) return;
      setStatus('error');
      setErrorMsg('This password reset link is invalid or has expired. Please request a new one.');
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    const result = await authService.updatePassword(password);
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Could not update password');
      return;
    }

    setStatus('success');
    setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2200);
  };

  // ---------- Checking ----------
  if (status === 'checking') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.iconWrap}>
            <KeyRound size={28} />
          </div>
          <h1 className={styles.title}>Verifying link…</h1>
          <p className={styles.subtitle}>
            One moment while we check your reset link.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Success ----------
  if (status === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successIcon}>
            <CheckCircle2 size={40} />
          </div>
          <h1 className={styles.title}>Password updated</h1>
          <p className={styles.subtitle}>
            Your password has been changed. Taking you to login…
          </p>
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (status === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.iconWrapError}>
            <AlertCircle size={28} />
          </div>
          <h1 className={styles.title}>Link expired</h1>
          <p className={styles.subtitle}>{errorMsg}</p>
          <div className={styles.actions}>
            <Link to={ROUTES.FORGOT_PASSWORD} className={styles.primaryLink}>
              Request new link
            </Link>
            <Link to={ROUTES.LOGIN} className={styles.secondaryLink}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Form ----------
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.iconWrap}>
          <KeyRound size={28} />
        </div>

        <h1 className={styles.title}>Set a new password</h1>
        <p className={styles.subtitle}>
          Choose a strong password you have not used before.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reset-password">
              New password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                className={styles.fieldInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
                disabled={submitting}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reset-confirm">
              Confirm new password
            </label>
            <input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              className={styles.fieldInput}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Repeat your new password"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <button type="submit" className={styles.primaryButton} disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className={styles.footerText}>
          Remembered it? <Link to={ROUTES.LOGIN} className={styles.footerLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

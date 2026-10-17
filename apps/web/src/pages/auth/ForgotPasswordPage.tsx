import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/config/constants';
import { ArrowLeft, Mail, CheckCircle2, Send } from 'lucide-react';
import styles from './ForgotPasswordPage.module.css';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await authService.requestPasswordReset(trimmed);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Could not send reset email');
      return;
    }

    setSent(true);
  };

  // ---------- Success screen ----------
  if (sent) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successIcon}>
            <CheckCircle2 size={40} />
          </div>
          <h1 className={styles.title}>Check your inbox</h1>
          <p className={styles.subtitle}>
            We sent a password reset link to <strong>{email}</strong>.
            Follow the link in that email to set a new password.
          </p>

          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              onClick={() => setSent(false)}
            >
              Use a different email
            </button>
            <Link to={ROUTES.LOGIN} className={styles.primaryLink}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Email entry form ----------
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button
          className={styles.backButton}
          onClick={() => navigate(ROUTES.LOGIN)}
          aria-label="Back to login"
        >
          <ArrowLeft size={20} />
        </button>

        <div className={styles.iconWrap}>
          <Mail size={28} />
        </div>

        <h1 className={styles.title}>Forgot password?</h1>
        <p className={styles.subtitle}>
          Enter the email you used to sign up and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="forgot-email">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              className={styles.fieldInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} />
                Sending…
              </>
            ) : (
              <>
                <Send size={18} />
                Send reset link
              </>
            )}
          </button>
        </form>

        <p className={styles.footerText}>
          Remembered your password?{' '}
          <Link to={ROUTES.LOGIN} className={styles.footerLink}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
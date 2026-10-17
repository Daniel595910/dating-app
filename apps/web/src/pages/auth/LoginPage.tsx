import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/config/constants';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import styles from './LoginPage.module.css';

const REMEMBER_DEVICE_KEY = 'remember_device_pref';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(REMEMBER_DEVICE_KEY);
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resending, setResending] = useState(false);

  const persistRememberPref = (value: boolean) => {
    setRememberDevice(value);
    try {
      localStorage.setItem(REMEMBER_DEVICE_KEY, String(value));
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setError(null);
    setInfo(null);
    setLoading(true);

    // 1. Password sign-in
    const result = await authService.signInWithPassword(email, password);

    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Login failed');
      return;
    }

    // 2. Get the user
    const user = await authService.getUser();

    // 3. Check device trust — only if "remember device" is on
    //    (When off, we still want to verify, so we treat as untrusted.)
    const trusted = rememberDevice && user
      ? await authService.checkDeviceTrust(user.id)
      : false;

    if (trusted) {
      setLoading(false);
      navigate(ROUTES.COMMUNITY, { replace: true });
      return;
    }

    // 4. New device or remember-off → send magic link
    const otpResult = await authService.sendNewDeviceMagicLink(email);
    setLoading(false);

    if (!otpResult.success) {
      setError(otpResult.error || 'Could not send verification email');
      return;
    }

    setOtpSent(true);
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    const result = await authService.sendNewDeviceMagicLink(email);
    setResending(false);
    if (!result.success) {
      setError(result.error || 'Could not resend');
      return;
    }
    setInfo('New verification link sent. Check your inbox.');
  };

  const handleBackToLogin = () => {
    setOtpSent(false);
    setPassword('');
    setInfo(null);
    setError(null);
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    const result = await authService.signInWithGoogle();
    if (!result.success) {
      setGoogleLoading(false);
      setError(result.error || 'Google sign-in failed');
    }
  };

  const handleForgotPassword = () => {
    // Navigate to the dedicated forgot-password page
    navigate(ROUTES.FORGOT_PASSWORD);
  };

  // ---------- Check-your-email screen ----------
  if (otpSent) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.checkEmailContainer}>
            <div className={styles.checkEmailIcon}>
              <Mail size={40} />
            </div>
            <h1 className={styles.checkEmailTitle}>Check your email</h1>
            <p className={styles.checkEmailBody}>
              We sent a sign-in link to <strong>{email}</strong>.
              Open it on this device to verify and finish logging in.
            </p>

            {error && <p className={styles.error} style={{ marginBottom: '1rem' }}>{error}</p>}
            {info && <p className={styles.info} style={{ marginBottom: '1rem' }}>{info}</p>}

            <div className={styles.checkEmailActions}>
              <button
                className={styles.secondaryButton}
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sending…' : 'Resend email'}
              </button>
              <button
                className={styles.textButton}
                onClick={handleBackToLogin}
              >
                Use a different account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Normal login form ----------
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandMark}>SG</div>
          <h1 className={styles.brandName}>Welcome back</h1>
          <p className={styles.brandTagline}>Sign in to continue</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className={styles.googleButton}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          {googleLoading ? 'Opening Google…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <div className={styles.dividerLine} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className={styles.fieldInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className={styles.fieldInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div className={styles.forgotRow}>
            <button
              type="button"
              onClick={handleForgotPassword}
              className={styles.forgotLink}
            >
              Forgot password?
            </button>
          </div>

          {/* Remember device toggle */}
          <label className={styles.rememberRow}>
            <input
              type="checkbox"
              className={styles.rememberCheckbox}
              checked={rememberDevice}
              onChange={(e) => persistRememberPref(e.target.checked)}
              disabled={loading}
            />
            <div className={styles.rememberLabel}>
              <p className={styles.rememberTitle}>Trust this device for 30 days</p>
              <p className={styles.rememberHint}>
                Skip the verification email on this browser. Turn off on shared computers.
              </p>
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}
          {info && <p className={styles.info}>{info}</p>}

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} />
                Signing in…
              </>
            ) : (
              <>
                <Check size={18} />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link to={ROUTES.REGISTER} className={styles.footerLink}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
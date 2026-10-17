import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { ROUTES } from '@/config/constants';
import { Button, Input } from '@dating-app/ui';
import { Mail, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setError(null);
    setInfo(null);
    setLoading(true);

    // Step 1 — password sign-in
    const result = await authService.signInWithPassword(email, password);

    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Login failed');
      return;
    }

    // Step 2 — get the authenticated user
    const user = await authService.getUser();

    // Step 3 — check device trust
    const trusted = user ? await authService.checkDeviceTrust(user.id) : false;

    if (trusted) {
      // Skip OTP for trusted devices
      setLoading(false);
      navigate(ROUTES.COMMUNITY, { replace: true });
      return;
    }

    // Step 4 — new device: send magic link
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
    // On success the browser redirects to Google - no navigate() here.
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Enter your email first, then tap "Forgot password".');
      return;
    }
    const result = await authService.requestPasswordReset(email);
    if (!result.success) {
      setError(result.error || 'Could not send reset email');
      return;
    }
    setInfo('Password reset email sent. Check your inbox.');
  };

  // ---------- Check-your-email screen ----------
  if (otpSent) {
    return (
      <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
        <button
          onClick={handleBackToLogin}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: 0,
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} />
          Back to login
        </button>

        <div
          style={{
            width: 88,
            height: 88,
            marginBottom: '1.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mail size={40} style={{ color: '#ef4444' }} />
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          Check your email
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: '#6b7280',
            lineHeight: 1.55,
            marginBottom: '1.5rem',
          }}
        >
          We sent a sign-in link to <strong style={{ color: '#111827' }}>{email}</strong>.
          Open it on this device to verify and finish logging in.
        </p>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            {error}
          </p>
        )}
        {info && (
          <p style={{ color: '#10b981', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            {info}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            onClick={handleResend}
            loading={resending}
            fullWidth
            variant="secondary"
          >
            Resend email
          </Button>
          <button
            onClick={handleBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '0.5rem',
              fontWeight: 500,
            }}
          >
            Use a different account
          </button>
        </div>
      </div>
    );
  }

  // ---------- Normal login form ----------
  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        Welcome Back
      </h1>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          padding: '12px 16px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: '#111827',
          cursor: googleLoading ? 'wait' : 'pointer',
          marginBottom: '1rem',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        {googleLoading ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1rem 0' }}>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          or
        </span>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Your password"
        />

        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
        {info && <p style={{ color: '#10b981', fontSize: '0.875rem', margin: 0 }}>{info}</p>}

        <Button type="submit" loading={loading} fullWidth>
          Login
        </Button>
      </form>

      <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
        <button
          type="button"
          onClick={handleForgotPassword}
          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}
        >
          Forgot password?
        </button>
      </p>

      <p style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
        Don&apos;t have an account? <Link to={ROUTES.REGISTER}>Register</Link>
      </p>
    </div>
  );
};
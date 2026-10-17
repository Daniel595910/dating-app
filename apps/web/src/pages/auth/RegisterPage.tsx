import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { validateFirstAndLastName } from '@/utils/name-validation';
import { ROUTES } from '@/config/constants';
import { Check, Eye, EyeOff } from 'lucide-react';
import styles from './RegisterPage.module.css';

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const level = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { level, label: labels[level] };
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);

  const validateAll = (): string | null => {
    const nameCheck = validateFirstAndLastName(firstName, lastName);
    if (!nameCheck.valid) return nameCheck.error || 'Invalid name';

    if (!email.trim() || !email.includes('@')) return 'Enter a valid email';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    if (!agreedToTerms) return 'Please agree to the Terms of Service and Privacy Policy';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateAll();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const result = await authService.signUpWithPassword({
      email,
      password,
      firstName,
      lastName,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to register');
      return;
    }

    navigate(`/confirm-email?email=${encodeURIComponent(email)}`, { replace: true });
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const result = await authService.signInWithGoogle();
    if (!result.success) {
      setGoogleLoading(false);
      setError(result.error || 'Google sign-up failed');
    }
  };

  const handleTogglePassword = () => setShowPassword((v) => !v);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandMark}>SG</div>
          <h1 className={styles.brandName}>Create your account</h1>
          <p className={styles.brandTagline}>Join in seconds — it's free</p>
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
          <div className={styles.nameRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reg-first">First name</label>
              <input
                id="reg-first"
                type="text"
                className={styles.fieldInput}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Jane"
                autoComplete="given-name"
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reg-last">Last name</label>
              <input
                id="reg-last"
                type="text"
                className={styles.fieldInput}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe (optional)"
                autoComplete="family-name"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
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
            <label className={styles.fieldLabel} htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className={styles.fieldInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={loading}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {password && (
              <>
                <div className={styles.strengthRow}>
                  <div className={`${styles.strengthBar} ${strength.level >= 1 ? styles.strengthBarActive1 : ''}`} />
                  <div className={`${styles.strengthBar} ${strength.level >= 2 ? styles.strengthBarActive2 : ''}`} />
                  <div className={`${styles.strengthBar} ${strength.level >= 3 ? styles.strengthBarActive3 : ''}`} />
                  <div className={`${styles.strengthBar} ${strength.level >= 4 ? styles.strengthBarActive4 : ''}`} />
                </div>
                <p className={styles.strengthHint}>Password strength: {strength.label}</p>
              </>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              className={styles.fieldInput}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Repeat your password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <label className={styles.termsRow}>
            <input
              type="checkbox"
              className={styles.termsCheckbox}
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={loading}
            />
            <span className={styles.termsLabel}>
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>
                Privacy Policy
              </a>
            </span>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} />
                Creating account…
              </>
            ) : (
              <>
                <Check size={18} />
                Create account
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className={styles.footerLink}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
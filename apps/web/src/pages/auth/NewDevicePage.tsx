/**
 * NewDevicePage
 *
 * The magic-link landing page. After the user clicks the link in the
 * "New device login" email, Supabase redirects here with the session
 * in the URL fragment. We:
 *   1. Wait for the session to be picked up by the SDK
 *   2. Ask the server to trust this device (30-day token)
 *   3. Route to /community (or /register/complete if incomplete)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/constants';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';

type Status = 'verifying' | 'success' | 'error';

export const NewDevicePage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuthStore();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Wait for Supabase to consume the URL fragment / hash. Retry a few times.
      let session = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          session = data.session;
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (cancelled) return;

      if (!session) {
        setStatus('error');
        setErrorMsg(
          'We could not verify your sign-in link. It may have expired — please try again.'
        );
        return;
      }

      // Trust this device
      const ok = await authService.trustCurrentDevice();
      if (cancelled) return;

      if (!ok) {
        setStatus('error');
        setErrorMsg(
          'Sign-in succeeded, but we could not record this device. You may need to verify again next time.'
        );
        // Even on trust failure, the user is signed in — let them continue
        setTimeout(() => navigate(ROUTES.COMMUNITY, { replace: true }), 2500);
        return;
      }

      setStatus('success');
      await refreshUser();

      // Small delay so the success animation is visible
      setTimeout(() => navigate(ROUTES.COMMUNITY, { replace: true }), 800);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshUser]);

  const handleRetry = () => {
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#ffffff',
      }}
    >
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div
              style={{
                width: 88,
                height: 88,
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader2
                size={40}
                style={{
                  color: '#ef4444',
                  animation: 'spin 1s linear infinite',
                }}
              />
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
              Verifying your device…
            </h1>
            <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: 1.5 }}>
              This takes just a moment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              style={{
                width: 88,
                height: 88,
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={40} style={{ color: '#10b981' }} />
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
              Device verified
            </h1>
            <p style={{ fontSize: '0.9375rem', color: '#6b7280', lineHeight: 1.5 }}>
              You won't need to do this again on this device for 30 days. Taking you to the app…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              style={{
                width: 88,
                height: 88,
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldX size={40} style={{ color: '#ef4444' }} />
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
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: '0.9375rem',
                color: '#6b7280',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              {errorMsg}
            </p>
            <button
              onClick={handleRetry}
              style={{
                padding: '0.875rem 2rem',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '0.9375rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to login
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { supabase } from '@/config/supabase.client';

const DISMISS_KEY = 'email-verify-banner-dismissed-at';
const DISMISS_DAYS = 3;

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    const days = (Date.now() - ts) / (24 * 60 * 60 * 1000);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export const EmailVerificationBanner: React.FC = () => {
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Already confirmed -> never show
    if (user.email_confirmed_at) return;
    // Recently dismissed -> respect it
    if (wasRecentlyDismissed()) return;
    setVisible(true);
  }, [user]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const handleResend = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) {
        showToast(error.message || 'Could not send verification email', 'error');
      } else {
        showToast('Verification email sent — check your inbox', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not send verification email', 'error');
    } finally {
      setSending(false);
    }
  };

  // Hide if no user, email already confirmed, or dismissed
  if (!user || user.email_confirmed_at || !visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 0.5rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 1.5rem)',
        maxWidth: 440,
        zIndex: 9998,
        background: '#ffffff',
        borderRadius: '1rem',
        padding: '0.875rem 1rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        animation: 'slideDownPrompt 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Mail size={20} style={{ color: '#3b82f6' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 0.125rem' }}>
          Verify your email
        </p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
          Please confirm your email to unlock all features.
        </p>

        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
          <button
            onClick={handleResend}
            disabled={sending}
            style={{
              padding: '0.375rem 0.75rem',
              background: sending ? '#f3f4f6' : '#3b82f6',
              color: sending ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: sending ? 'wait' : 'pointer',
              minHeight: 32,
            }}
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'none',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 32,
            }}
          >
            Not now
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#9ca3af',
          padding: 4,
          marginLeft: '0.125rem',
          borderRadius: '9999px',
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>

      <style>{`
        @keyframes slideDownPrompt {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};
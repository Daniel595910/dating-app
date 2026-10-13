import React, { useEffect, useState } from 'react';
import { Bell, X, Share2, PlusSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { pushNotificationService } from '../services/push-notification.service';

const DISMISS_KEY = 'notification-prompt-dismissed-at';
const DISMISS_DAYS = 7;

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore — Safari-specific
    (window.navigator as any).standalone === true
  );
}

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

export const NotificationPromptBanner: React.FC = () => {
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [mode, setMode] = useState<'enable' | 'ios-install'>('enable');

  useEffect(() => {
    if (!user) return;

    // Don't show if push isn't supported at all
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // Already granted → nothing to prompt
    if (Notification.permission === 'granted') return;

    // User dismissed recently
    if (wasRecentlyDismissed()) return;

    // iOS Safari not installed as PWA → show install instructions
    if (isIOS() && !isStandalone()) {
      setMode('ios-install');
      setVisible(true);
      return;
    }

    // iOS PWA, Android, desktop → normal enable flow
    setMode('enable');
    setVisible(true);
  }, [user]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const handleEnable = async () => {
    if (!user) return;
    setEnabling(true);
    try {
      const ok = await pushNotificationService.subscribeUser(user.id);
      if (ok) {
        // Clear dismissal — user explicitly enabled
        try { localStorage.removeItem(DISMISS_KEY); } catch {}
        setVisible(false);
      }
    } finally {
      setEnabling(false);
    }
  };

  if (!visible) return null;

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
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Bell size={20} style={{ color: '#ef4444' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {mode === 'enable' ? (
          <>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 0.125rem' }}>
              Stay in the loop
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
              Get notified about messages, matches, and connection requests.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>
              Enable notifications on iPhone
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
              Tap <Share2 size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> Share, then
              {' '}<PlusSquare size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> Add to Home Screen,
              then open the app from your home screen.
            </p>
          </>
        )}

        {mode === 'enable' && (
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleEnable}
              disabled={enabling}
              style={{
                padding: '0.375rem 0.75rem',
                background: enabling ? '#f3f4f6' : '#ef4444',
                color: enabling ? '#9ca3af' : '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: enabling ? 'wait' : 'pointer',
                minHeight: 32,
              }}
            >
              {enabling ? 'Enabling…' : 'Enable'}
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
        )}
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
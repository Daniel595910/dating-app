import React, { useEffect, useState } from 'react';
import { Bell, X, Share2, PlusSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { pushNotificationService } from '../services/push-notification.service';
import styles from './NotificationPromptBanner.module.css';

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
    <div className={styles.banner}>
      <div className={styles.iconWrapper}>
        <Bell size={22} className={styles.icon} />
      </div>

      <div className={styles.content}>
        {mode === 'enable' ? (
          <>
            <p className={styles.title}>Stay in the loop</p>
            <p className={styles.text}>
              Get notified about messages, matches, and connection requests.
            </p>
          </>
        ) : (
          <>
            <p className={styles.title}>Enable notifications on iPhone</p>
            <p className={styles.text}>
              Tap <Share2 size={12} className={styles.inlineIcon} /> Share, then
              {' '}<PlusSquare size={12} className={styles.inlineIcon} /> Add to Home Screen,
              then open the app from your home screen.
            </p>
          </>
        )}

        {mode === 'enable' && (
          <div className={styles.actions}>
            <button
              onClick={handleEnable}
              disabled={enabling}
              className={styles.enableButton}
            >
              {enabling ? 'Enabling…' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className={styles.dismissButton}
            >
              Not now
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={styles.closeButton}
      >
        <X size={18} />
      </button>
    </div>
  );
};
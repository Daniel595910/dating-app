import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { pushNotificationService } from '../../features/notifications/services/push-notification.service';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Bell, BellOff } from 'lucide-react';
import styles from './NotificationSettingsPage.module.css';

export const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationOptions = [
    { id: 'match', label: 'Matches', description: 'When you match or get a connection request' },
    { id: 'message', label: 'Messages', description: 'When you receive a new message' },
    { id: 'like', label: 'Likes', description: 'When someone likes your post' },
    { id: 'comment', label: 'Comments', description: 'When someone comments on your post' },
    { id: 'mention', label: 'Mentions', description: 'When someone mentions you' },
    { id: 'community', label: 'Community', description: 'Community announcements and updates' },
    { id: 'system', label: 'System', description: 'Account, security, and gift notifications' },
  ];

  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    match: true,
    message: true,
    like: true,
    comment: true,
    mention: true,
    community: true,
    system: true,
  });

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') checkPermission(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('type, enabled')
        .eq('user_id', user.id);
      if (data && data.length > 0) {
        const map: Record<string, boolean> = {};
        for (const row of data as any[]) {
          map[row.type] = row.enabled;
        }
        setPreferences((prev) => ({ ...prev, ...map }));
      }
    })();
  }, [user]);

  const savePreference = async (type: string, enabled: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, type, enabled },
        { onConflict: 'user_id,type' }
      );
    if (error) {
      console.error('Failed to save preference:', type, error.message, error.code, error.details);
    }
  };

  const checkPermission = async () => {
    if (!('Notification' in window)) return;
    setPermissionStatus(Notification.permission);

    if (Notification.permission !== 'granted') {
      setPushEnabled(false);
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setPushEnabled(false);
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(Boolean(sub));
    } catch {
      setPushEnabled(false);
    }
  };

  const handleTogglePush = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (pushEnabled) {
        const unsubscribed = await pushNotificationService.unsubscribeUser(user.id);
        if (unsubscribed) {
          setPushEnabled(false);
          setSuccess('Push notifications disabled');
        } else {
          setError('Failed to disable push notifications');
        }
      } else {
        const subscribed = await pushNotificationService.subscribeUser(user.id);
        if (subscribed) {
          setPushEnabled(true);
          setSuccess('Push notifications enabled!');
        } else {
          setError('Failed to enable push notifications — check browser permissions');
        }
      }
      await checkPermission();
    } catch (err: any) {
      setError(err.message || 'Failed to update push notifications');
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  const handleTogglePreference = (id: string) => {
    const next = !preferences[id];
    setPreferences((prev) => ({ ...prev, [id]: next }));
    savePreference(id, next);
  };

  const handleTestNotification = async () => {
    if (!user) return;
    setLoading(true);
    const sent = await pushNotificationService.sendNotification(
      user.id,
      'Test Notification',
      'This is a test notification!'
    );
    setLoading(false);

    if (sent) {
      setSuccess('Test notification sent!');
    } else {
      setError('Failed to send test notification');
    }
    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate('/settings')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Notifications</h1>
      </header>

      <div className={styles.content}>
        {success && <div className={styles.successBanner}>{success}</div>}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Push Notifications Card */}
        <div className={styles.pushCard}>
          <div className={styles.pushRow}>
            <div className={styles.pushInfo}>
              <div className={`${styles.pushIcon} ${pushEnabled ? styles.pushIconActive : ''}`}>
                {pushEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              </div>
              <div>
                <p className={styles.pushLabel}>Push Notifications</p>
                <p className={styles.pushStatus}>{pushEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            <button
              onClick={handleTogglePush}
              disabled={loading}
              className={`${styles.toggle} ${pushEnabled ? styles.toggleOn : ''}`}
              aria-label="Toggle push notifications"
            >
              <span className={`${styles.toggleThumb} ${pushEnabled ? styles.toggleThumbOn : ''}`} />
            </button>
          </div>

          {pushEnabled && (
            <button
              onClick={handleTestNotification}
              disabled={loading}
              className={styles.testButton}
            >
              Send Test Notification
            </button>
          )}
        </div>

        {/* Notification Types List */}
        <h3 className={styles.sectionLabel}>Notification Types</h3>
        <div className={styles.list}>
          {notificationOptions.map((option) => (
            <div key={option.id} className={styles.listRow}>
              <div className={styles.listRowContent}>
                <p className={styles.listRowTitle}>{option.label}</p>
                <p className={styles.listRowSubtitle}>{option.description}</p>
              </div>
              <button
                onClick={() => handleTogglePreference(option.id)}
                className={`${styles.toggle} ${styles.toggleSmall} ${preferences[option.id] ? styles.toggleOn : ''}`}
                aria-label={`Toggle ${option.label}`}
              >
                <span className={`${styles.toggleThumb} ${preferences[option.id] ? styles.toggleThumbOn : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
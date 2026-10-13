import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { pushNotificationService } from '../../features/notifications/services/push-notification.service';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Bell, BellOff, Check } from 'lucide-react';

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

  // Refresh subscription state when the page becomes visible again
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
        {
          user_id: user.id,
          type,
          enabled,
        },
        { onConflict: 'user_id,type' }
      );
    if (error) {
      console.error('Failed to save preference:', type, error.message, error.code, error.details);
    }
  };


  const checkPermission = async () => {
    if (!('Notification' in window)) return;
    setPermissionStatus(Notification.permission);

    // pushEnabled should reflect an ACTIVE SUBSCRIPTION, not just permission
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
    <div style={{ minHeight: '100dvh', backgroundColor: '#faf9f7', maxWidth: 480, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', paddingTop: 'calc(0.625rem + env(safe-area-inset-top))', backgroundColor: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
        <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827', padding: '0.5rem', borderRadius: '9999px', minWidth: 44, minHeight: 44 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Notifications</h1>
      </header>

      <div style={{ padding: '1rem' }}>
        {success && (
          <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Push Notifications Toggle */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {pushEnabled ? <Bell size={20} style={{ color: '#ef4444' }} /> : <BellOff size={20} style={{ color: '#9ca3af' }} />}
              <div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: 0 }}>Push Notifications</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                  {pushEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePush}
              disabled={loading}
              style={{
                width: 48,
                height: 28,
                borderRadius: '9999px',
                backgroundColor: pushEnabled ? '#ef4444' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
              }}
              aria-label="Toggle push notifications"
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: pushEnabled ? 22 : 2,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {pushEnabled && (
            <button
              onClick={handleTestNotification}
              disabled={loading}
              style={{
                marginTop: '0.75rem',
                width: '100%',
                padding: '0.625rem',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Send Test Notification
            </button>
          )}
        </div>

        {/* Notification Preferences */}
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0.25rem' }}>
          Notification Types
        </h3>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', overflow: 'hidden' }}>
          {notificationOptions.map((option, index) => (
            <div
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.875rem 1rem',
                borderBottom: index < notificationOptions.length - 1 ? '1px solid #f9fafb' : 'none',
              }}
            >
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', margin: 0 }}>{option.label}</p>
                <p style={{ fontSize: '0.6875rem', color: '#9ca3af', margin: '2px 0 0' }}>{option.description}</p>
              </div>
              <button
                onClick={() => handleTogglePreference(option.id)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: '9999px',
                  backgroundColor: preferences[option.id] ? '#ef4444' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s ease',
                  flexShrink: 0,
                }}
                aria-label={`Toggle ${option.label}`}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: preferences[option.id] ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    transition: 'left 0.2s ease',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


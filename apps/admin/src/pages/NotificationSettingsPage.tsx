import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Save,
  Upload,
  RefreshCw,
  MessageSquare,
  Heart,
  UserPlus,
  Shield,
  Crown,
  Users,
  Send,
  VolumeX,
  Volume2,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Mail,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import {
  notificationSettingsService,
  NotificationType,
  NotificationTypeSetting,
  NotificationGlobalSettings,
} from '@/services/notification-settings.service';
import styles from './NotificationSettingsPage.module.css';

type Tab = 'types' | 'banner' | 'global';

const TYPE_LABELS: Record<NotificationType, { label: string; icon: React.ReactNode }> = {
  match: { label: 'Match', icon: <Heart size={16} /> },
  message: { label: 'Message', icon: <MessageSquare size={16} /> },
  like: { label: 'Like', icon: <Heart size={16} /> },
  comment: { label: 'Comment', icon: <MessageSquare size={16} /> },
  mention: { label: 'Mention', icon: <MessageSquare size={16} /> },
  system: { label: 'System', icon: <Bell size={16} /> },
  verification: { label: 'Verification', icon: <Shield size={16} /> },
  vip: { label: 'VIP', icon: <Crown size={16} /> },
  report: { label: 'Report', icon: <AlertTriangle size={16} /> },
  community: { label: 'Community', icon: <Users size={16} /> },
};

const ALL_TYPES: NotificationType[] = [
  'match', 'message', 'like', 'comment', 'mention',
  'system', 'verification', 'vip', 'report', 'community',
];

const DEFAULT_TYPE_SETTING = (type: NotificationType): NotificationTypeSetting => ({
  type,
  enabled: true,
  in_app_enabled: true,
  push_enabled: true,
  email_enabled: false,
  custom_title_template: null,
  custom_body_template: null,
  custom_icon_url: null,
  updated_at: new Date().toISOString(),
  updated_by: null,
});

export const NotificationSettingsPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('types');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [typeSettings, setTypeSettings] = useState<Map<NotificationType, NotificationTypeSetting>>(new Map());
  const [globalSettings, setGlobalSettings] = useState<NotificationGlobalSettings | null>(null);

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [types, global] = await Promise.all([
        notificationSettingsService.getTypeSettings(),
        notificationSettingsService.getGlobalSettings(),
      ]);

      const map = new Map<NotificationType, NotificationTypeSetting>();
      ALL_TYPES.forEach((t) => {
        const existing = types.find((s) => s.type === t);
        map.set(t, existing || DEFAULT_TYPE_SETTING(t));
      });
      setTypeSettings(map);
      setGlobalSettings(global);
    } catch (err: any) {
      toast.error('Failed to load settings', err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = (type: NotificationType, field: 'enabled' | 'in_app_enabled' | 'push_enabled' | 'email_enabled') => {
    setTypeSettings((prev) => {
      const next = new Map(prev);
      const current = next.get(type) || DEFAULT_TYPE_SETTING(type);
      next.set(type, { ...current, [field]: !current[field] });
      return next;
    });
  };

  const handleSaveType = async (type: NotificationType) => {
    const setting = typeSettings.get(type);
    if (!setting) return;
    setSaving(true);
    try {
      await notificationSettingsService.updateTypeSetting(type, {
        enabled: setting.enabled,
        in_app_enabled: setting.in_app_enabled,
        push_enabled: setting.push_enabled,
        email_enabled: setting.email_enabled,
      });
      toast.success(`${TYPE_LABELS[type].label} notifications updated`);
    } catch (err: any) {
      toast.error('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobal = async () => {
    if (!globalSettings) return;
    setSaving(true);
    try {
      await notificationSettingsService.updateGlobalSettings({
        push_master_enabled: globalSettings.push_master_enabled,
        quiet_hours_start: globalSettings.quiet_hours_start,
        quiet_hours_end: globalSettings.quiet_hours_end,
        rate_limit_per_hour: globalSettings.rate_limit_per_hour,
      });
      toast.success('Global settings saved');
    } catch (err: any) {
      toast.error('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const url = await notificationSettingsService.uploadAppIcon(file);
      if (globalSettings) {
        await notificationSettingsService.updateGlobalSettings({ app_icon_url: url });
        setGlobalSettings({ ...globalSettings, app_icon_url: url });
      }
      toast.success('App icon uploaded');
    } catch (err: any) {
      toast.error('Upload failed', err.message);
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await notificationSettingsService.uploadDefaultAvatar(file);
      if (globalSettings) {
        await notificationSettingsService.updateGlobalSettings({ default_avatar_url: url });
        setGlobalSettings({ ...globalSettings, default_avatar_url: url });
      }
      toast.success('Default avatar uploaded');
    } catch (err: any) {
      toast.error('Upload failed', err.message);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notification Settings</h1>
          <p className={styles.subtitle}>
            Configure delivery, banner style, and quiet hours
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={16} />}
          onClick={loadData}
          disabled={loading || saving}
        >
          Refresh
        </Button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'types' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('types')}
        >
          <Bell size={16} /> Per-type
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'banner' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('banner')}
        >
          <ImageIcon size={16} /> Banner Style
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'global' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('global')}
        >
          <Shield size={16} /> Global
        </button>
      </div>

      {activeTab === 'types' && (
        <div className={styles.list}>
          {ALL_TYPES.map((type) => {
            const setting = typeSettings.get(type) || DEFAULT_TYPE_SETTING(type);
            const info = TYPE_LABELS[type];
            return (
              <div key={type} className={styles.row}>
                <div className={styles.rowIcon}>{info.icon}</div>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{info.label}</span>
                  <span className={styles.rowMeta}>Notification type</span>
                </div>
                <div className={styles.rowControls}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={setting.enabled}
                      onChange={() => handleToggle(type, 'enabled')}
                    />
                    <span>Enabled</span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={setting.in_app_enabled}
                      onChange={() => handleToggle(type, 'in_app_enabled')}
                      disabled={!setting.enabled}
                    />
                    <span>In-app</span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={setting.push_enabled}
                      onChange={() => handleToggle(type, 'push_enabled')}
                      disabled={!setting.enabled}
                    />
                    <span>Push</span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={setting.email_enabled}
                      onChange={() => handleToggle(type, 'email_enabled')}
                      disabled={!setting.enabled}
                    />
                    <span>Email</span>
                  </label>
                  <Button
                    variant="primary"
                    icon={<Save size={14} />}
                    onClick={() => handleSaveType(type)}
                    disabled={saving}
                    size="small"
                  >
                    Save
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'banner' && globalSettings && (
        <div className={styles.list}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <ImageIcon size={20} />
              <div>
                <h3 className={styles.cardTitle}>App Icon</h3>
                <p className={styles.cardDesc}>Used as the badge and fallback icon in notifications</p>
              </div>
            </div>
            <div className={styles.cardBody}>
              {globalSettings.app_icon_url && (
                <img src={globalSettings.app_icon_url} alt="App icon" className={styles.iconPreview} />
              )}
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                onChange={handleIconUpload}
                style={{ display: 'none' }}
              />
              <Button
                variant="secondary"
                icon={<Upload size={14} />}
                onClick={() => iconInputRef.current?.click()}
                loading={uploadingIcon}
              >
                {globalSettings.app_icon_url ? 'Replace icon' : 'Upload icon'}
              </Button>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Users size={20} />
              <div>
                <h3 className={styles.cardTitle}>Default Avatar Fallback</h3>
                <p className={styles.cardDesc}>Shown when a notification has no user avatar</p>
              </div>
            </div>
            <div className={styles.cardBody}>
              {globalSettings.default_avatar_url && (
                <img src={globalSettings.default_avatar_url} alt="Default avatar" className={styles.iconPreview} />
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
              <Button
                variant="secondary"
                icon={<Upload size={14} />}
                onClick={() => avatarInputRef.current?.click()}
                loading={uploadingAvatar}
              >
                {globalSettings.default_avatar_url ? 'Replace avatar' : 'Upload avatar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'global' && globalSettings && (
        <div className={styles.list}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <AlertTriangle size={20} />
              <div>
                <h3 className={styles.cardTitle}>Push Master Switch</h3>
                <p className={styles.cardDesc}>Emergency kill switch — disables ALL push notifications</p>
              </div>
            </div>
            <div className={styles.cardBody}>
              <label className={styles.switchRow}>
                <span>Push notifications enabled</span>
                <input
                  type="checkbox"
                  checked={globalSettings.push_master_enabled}
                  onChange={(e) =>
                    setGlobalSettings({ ...globalSettings, push_master_enabled: e.target.checked })
                  }
                  className={styles.switch}
                />
              </label>
              {!globalSettings.push_master_enabled && (
                <div className={styles.warningBox}>
                  <AlertTriangle size={14} />
                  <span>Push is currently DISABLED for all users. In-app notifications still work.</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Clock size={20} />
              <div>
                <h3 className={styles.cardTitle}>Quiet Hours</h3>
                <p className={styles.cardDesc}>No push during these hours (user local time)</p>
              </div>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.inlineField}>
                <label>
                  Start hour
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={globalSettings.quiet_hours_start ?? ''}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        quiet_hours_start: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    placeholder="Disabled"
                    className={styles.numberInput}
                  />
                </label>
                <label>
                  End hour
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={globalSettings.quiet_hours_end ?? ''}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        quiet_hours_end: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    placeholder="Disabled"
                    className={styles.numberInput}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <VolumeX size={20} />
              <div>
                <h3 className={styles.cardTitle}>Rate Limit</h3>
                <p className={styles.cardDesc}>Max push notifications per user per hour</p>
              </div>
            </div>
            <div className={styles.cardBody}>
              <input
                type="number"
                min="1"
                max="500"
                value={globalSettings.rate_limit_per_hour}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    rate_limit_per_hour: parseInt(e.target.value, 10) || 30,
                  })
                }
                className={styles.numberInput}
              />
            </div>
          </div>

          <div className={styles.saveFooter}>
            <Button variant="primary" icon={<Save size={16} />} onClick={handleSaveGlobal} loading={saving}>
              Save Global Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

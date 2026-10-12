import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ToggleLeft,
  ToggleRight,
  Save,
  RefreshCw,

  Shield,
  Zap,
  Users,

  AlertCircle,

} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { settingsService, Setting, SettingUpdate } from '@/services/settings.service';
import styles from './SettingsPage.module.css';

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  general: {
    label: 'General',
    icon: <SettingsIcon size={18} />,
    description: 'App name, support contact, and general settings',
  },
  features: {
    label: 'Features',
    icon: <Zap size={18} />,
    description: 'Enable or disable platform features',
  },
  safety: {
    label: 'Safety & Moderation',
    icon: <Shield size={18} />,
    description: 'Content moderation and user safety',
  },
  limits: {
    label: 'Limits & Quotas',
    icon: <Users size={18} />,
    description: 'Rate limits and usage quotas',
  },
};

export const SettingsPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [groupedSettings, setGroupedSettings] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string>('general');

  const loadSettings = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const grouped = await settingsService.getGroupedByCategory();
      setGroupedSettings(grouped);
      setPendingChanges(new Map());
      setHasChanges(false);
    } catch (err: any) {
      toast.error('Failed to load settings', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSettings(false);
    toast.success('Settings refreshed');
  };

  const handleChange = (key: string, value: any) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) return;

    setSaving(true);
    try {
      const updates: SettingUpdate[] = Array.from(pendingChanges.entries()).map(([key, value]) => ({
        key,
        value,
      }));

      await settingsService.updateMany(updates);

      // Update local state
      setGroupedSettings((prev) => {
        const next = { ...prev };
        for (const category of Object.keys(next)) {
          next[category] = (next[category] ?? []).map((s) =>
            pendingChanges.has(s.key) ? { ...s, value: pendingChanges.get(s.key) } : s
          );
        }
        return next;
      });

      toast.success(`${pendingChanges.size} setting${pendingChanges.size > 1 ? 's' : ''} saved`);
      setPendingChanges(new Map());
      setHasChanges(false);
    } catch (err: any) {
      toast.error('Failed to save settings', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPendingChanges(new Map());
    setHasChanges(false);
  };

  const getValue = (setting: Setting) => {
    if (pendingChanges.has(setting.key)) {
      return pendingChanges.get(setting.key);
    }
    return setting.value;
  };

  const isBoolean = (setting: Setting) => {
    const value = getValue(setting);
    return typeof value === 'boolean';
  };

  const isNumber = (setting: Setting) => {
    const value = getValue(setting);
    return typeof value === 'number';
  };

    const hasPermissionToEdit = hasPermission('SETTINGS_EDIT');
  const categories = Object.keys(groupedSettings).filter((c) => CATEGORY_INFO[c]);
  const settings = groupedSettings[activeCategory] || [];

  if (loading) return <Loader fullScreen text="Loading settings..." />;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Configure platform features and behavior</p>
        </div>

        <div className={styles.headerActions}>
          {hasChanges && (
            <>
              <button className={styles.resetButton} onClick={handleReset} disabled={saving}>
                Reset
              </button>
              <Button
                icon={<Save size={16} />}
                onClick={handleSave}
                loading={saving}
                disabled={!hasPermissionToEdit}
              >
                Save Changes ({pendingChanges.size})
              </Button>
            </>
          )}
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {!hasPermissionToEdit && (
        <div className={styles.warning}>
          <AlertCircle size={16} />
          <span>You have read-only access to settings</span>
        </div>
      )}

      {/* Layout */}
      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {categories.map((category) => {
            const info = CATEGORY_INFO[category];
            const count = groupedSettings[category]?.length || 0;
            const changedCount = (groupedSettings[category] || []).filter((s) =>
              pendingChanges.has(s.key)
            ).length;

            return (
              <button
                key={category}
                className={`${styles.categoryButton} ${activeCategory === category ? styles.categoryButtonActive : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                <span className={styles.categoryIcon}>{info?.icon}</span>
                <div className={styles.categoryInfo}>
                  <span className={styles.categoryLabel}>{info?.label}</span>
                  <span className={styles.categoryCount}>
                    {count} setting{count !== 1 ? 's' : ''}
                  </span>
                </div>
                {changedCount > 0 && (
                  <span className={styles.categoryBadge}>{changedCount}</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h2 className={styles.contentTitle}>{CATEGORY_INFO[activeCategory]?.label}</h2>
            <p className={styles.contentDescription}>
              {CATEGORY_INFO[activeCategory]?.description}
            </p>
          </div>

          <div className={styles.settingsList}>
            {settings.length === 0 ? (
              <div className={styles.empty}>
                <p>No settings in this category</p>
              </div>
            ) : (
              settings.map((setting) => {
                const value = getValue(setting);
                const isChanged = pendingChanges.has(setting.key);

                return (
                  <div
                    key={setting.id}
                    className={`${styles.settingRow} ${isChanged ? styles.settingRowChanged : ''}`}
                  >
                    <div className={styles.settingInfo}>
                      <div className={styles.settingLabelRow}>
                        <span className={styles.settingLabel}>{setting.label}</span>
                        {isChanged && (
                          <Badge variant="warning" size="sm">
                            Unsaved
                          </Badge>
                        )}
                      </div>
                      {setting.description && (
                        <p className={styles.settingDescription}>{setting.description}</p>
                      )}
                      <span className={styles.settingKey}>{setting.key}</span>
                    </div>

                    <div className={styles.settingControl}>
                      {isBoolean(setting) ? (
                        <button
                          className={`${styles.toggle} ${value ? styles.toggleActive : ''}`}
                          onClick={() => handleChange(setting.key, !value)}
                          disabled={!hasPermissionToEdit}
                          aria-label={`Toggle ${setting.label}`}
                        >
                          {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                      ) : isNumber(setting) ? (
                        <input
                          type="number"
                          className={styles.numberInput}
                          value={value}
                          onChange={(e) =>
                            handleChange(setting.key, parseInt(e.target.value) || 0)
                          }
                          disabled={!hasPermissionToEdit}
                        />
                      ) : (
                        <input
                          type="text"
                          className={styles.textInput}
                          value={value || ''}
                          onChange={(e) => handleChange(setting.key, e.target.value)}
                          disabled={!hasPermissionToEdit}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * SettingsPage Component
 * Application settings
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { Button } from '@dating-app/ui';
import styles from './SettingsPage.module.css';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Save settings
      // This would typically call a settings service
      console.log('Saving settings:', {
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        showOnlineStatus,
      });
      
      navigate(ROUTES.PROFILE);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(ROUTES.LOGIN);
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.settingsGroup}>
        <h2 className={styles.groupTitle}>Notifications</h2>
        <label className={styles.settingItem}>
          <span className={styles.settingLabel}>Enable Notifications</span>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
            className={styles.checkbox}
          />
        </label>
        <label className={styles.settingItem}>
          <span className={styles.settingLabel}>Email Notifications</span>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            className={styles.checkbox}
          />
        </label>
        <label className={styles.settingItem}>
          <span className={styles.settingLabel}>Push Notifications</span>
          <input
            type="checkbox"
            checked={pushNotifications}
            onChange={(e) => setPushNotifications(e.target.checked)}
            className={styles.checkbox}
          />
        </label>
      </div>

      <div className={styles.settingsGroup}>
        <h2 className={styles.groupTitle}>Privacy</h2>
        <label className={styles.settingItem}>
          <span className={styles.settingLabel}>Show Online Status</span>
          <input
            type="checkbox"
            checked={showOnlineStatus}
            onChange={(e) => setShowOnlineStatus(e.target.checked)}
            className={styles.checkbox}
          />
        </label>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <Button onClick={handleSave} loading={loading} fullWidth>
        Save Settings
      </Button>

      <Button variant="danger" onClick={handleLogout} fullWidth>
        Logout
      </Button>
    </div>
  );
};
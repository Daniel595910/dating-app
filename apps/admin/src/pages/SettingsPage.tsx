import React, { useState } from 'react';
import { Button, Input, Card } from '@dating-app/ui';
import styles from './SettingsPage.module.css';

export const SettingsPage: React.FC = () => {
  const [appName, setAppName] = useState('Dating App');
  const [supportEmail, setSupportEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    // Save settings logic here
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <Card title="General Settings">
        <div className={styles.form}>
          <Input
            label="Application Name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
          <Input
            type="email"
            label="Support Email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@datingapp.com"
          />
          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
};
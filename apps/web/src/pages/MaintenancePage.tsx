import React, { useEffect, useState } from 'react';
import { Wrench, Clock } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import styles from './MaintenancePage.module.css';

export const MaintenancePage: React.FC = () => {
  const appName = useSettings((s) => s.settings['general.app_name']) || 'Dating App';
  const logoUrl = useSettings((s) => s.settings['general.logo_url']) || null;
  const message = useSettings((s) => s.settings['general.maintenance_message']) || 'We are performing scheduled maintenance. Please check back shortly.';
  const endsAt = useSettings((s) => s.settings['general.maintenance_ends_at']) || null;

  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Just finishing up...');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (hours > 0) setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      else if (minutes > 0) setCountdown(`${minutes}m ${seconds}s`);
      else setCountdown(`${seconds}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className={styles.page}>
      <div className={styles.bgBlob1} aria-hidden="true" />
      <div className={styles.bgBlob2} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.brand}>
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className={styles.brandLogo} />
          ) : (
            <div className={styles.brandMark}>{(appName || 'SG').slice(0, 2).toUpperCase()}</div>
          )}
          <span className={styles.brandName}>{appName}</span>
        </div>

        <div className={styles.iconWrap}>
          <Wrench size={32} />
        </div>

        <h1 className={styles.title}>We'll be right back</h1>
        <p className={styles.message}>{message}</p>

        {countdown && (
          <div className={styles.countdown}>
            <Clock size={16} />
            <span>Back in {countdown}</span>
          </div>
        )}

        <p className={styles.footer}>
          Thanks for your patience — we are making things better.
        </p>
      </div>
    </div>
  );
};

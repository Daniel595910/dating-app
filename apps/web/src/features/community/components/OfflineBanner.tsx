import React from 'react';
import { WifiOff } from 'lucide-react';
import styles from '../styles/OfflineBanner.module.css';

interface OfflineBannerProps {
  isOffline: boolean;
  hasCachedFeed: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, hasCachedFeed }) => {
  if (!isOffline) return null;

  return (
    <div className={styles.banner}>
      <WifiOff size={14} />
      <span>
        {hasCachedFeed
          ? "You're offline. Showing your latest cached content."
          : "You're offline. Some features may be unavailable."}
      </span>
    </div>
  );
};

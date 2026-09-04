import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
  hasCachedFeed: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, hasCachedFeed }) => {
  if (!isOffline) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        fontSize: '13px',
        fontWeight: 500,
        borderBottom: '1px solid #fde68a',
        justifyContent: 'center',
      }}
    >
      <WifiOff size={14} />
      <span>
        {hasCachedFeed
          ? "You're offline. Showing your latest cached content."
          : "You're offline. Some features may be unavailable."}
      </span>
    </div>
  );
};

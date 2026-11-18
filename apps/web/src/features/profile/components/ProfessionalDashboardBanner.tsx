import React from 'react';
import styles from './ProfessionalDashboardBanner.module.css';

interface ProfessionalDashboardBannerProps {
  onOpenStudio: () => void;
}

export const ProfessionalDashboardBanner: React.FC<ProfessionalDashboardBannerProps> = ({ onOpenStudio }) => {
  return (
    <div className={styles.banner}>
      <div className={styles.chartIcon} aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="26" width="6" height="10" rx="1.5" fill="rgba(255,255,255,0.55)" />
          <rect x="14" y="18" width="6" height="18" rx="1.5" fill="rgba(255,255,255,0.75)" />
          <rect x="24" y="10" width="6" height="26" rx="1.5" fill="rgba(255,255,255,0.95)" />
          <path d="M6 24 L17 15 L27 8" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="27" cy="8" r="2" fill="#FFFFFF" />
        </svg>
      </div>
      <div className={styles.textColumn}>
        <span className={styles.title}>Professional Dashboard</span>
        <span className={styles.subtitle}>Track your growth, reach more people and monetize your content.</span>
      </div>
      <button type="button" className={styles.openButton} onClick={onOpenStudio}>
        Open Studio
        <span className={styles.arrow}>→</span>
      </button>
    </div>
  );
};

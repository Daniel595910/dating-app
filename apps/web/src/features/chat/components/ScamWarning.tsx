import React from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { RiskLevel } from '../services/safety.service';
import styles from '../styles/ScamWarning.module.css';

interface ScamWarningProps {
  riskLevel: RiskLevel;
  message: string;
  onDismiss: () => void;
  onReport: () => void;
}

export const ScamWarning: React.FC<ScamWarningProps> = ({
  riskLevel,
  message,
  onDismiss,
  onReport,
}) => {
  if (riskLevel === 'LOW') return null;

  const isCritical = riskLevel === 'CRITICAL';
  const isHigh = riskLevel === 'HIGH';

  return (
    <div className={`${styles.warning} ${isCritical ? styles.critical : isHigh ? styles.high : styles.medium}`}>
      <div className={styles.header}>
        {isCritical ? (
          <ShieldAlert size={18} className={styles.icon} />
        ) : (
          <AlertTriangle size={18} className={styles.icon} />
        )}
        <span className={styles.title}>
          {isCritical ? 'Safety Alert' : 'Safety Reminder'}
        </span>
        <button className={styles.dismissButton} onClick={onDismiss} aria-label="Dismiss warning">
          <X size={14} />
        </button>
      </div>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button className={styles.dismissAction} onClick={onDismiss}>
          Got it
        </button>
        <button className={styles.reportAction} onClick={onReport}>
          Report
        </button>
      </div>
    </div>
  );
};

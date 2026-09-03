/**
 * VipStatus Component
 * Displays VIP membership status
 */

import React from 'react';
import { VipLevel } from '@dating-app/types';
import { Badge, Card } from '@dating-app/ui';
import styles from './VipStatus.module.css';

interface VipStatusProps {
  level: VipLevel;
  pointsBalance: number;
  planExpiresAt?: string | null;
}

export const VipStatus: React.FC<VipStatusProps> = ({
  level,
  pointsBalance,
  planExpiresAt,
}) => {
  const getLevelConfig = () => {
    switch (level) {
      case 'vip':
        return { variant: 'success' as const, label: 'VIP Member' };
      case 'premium':
        return { variant: 'info' as const, label: 'Premium Member' };
      case 'basic':
        return { variant: 'warning' as const, label: 'Basic Member' };
      case 'free':
      default:
        return { variant: 'neutral' as const, label: 'Free Member' };
    }
  };

  const config = getLevelConfig();

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>VIP Status</h3>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
      <div className={styles.points}>
        <span className={styles.pointsLabel}>Points Balance:</span>
        <span className={styles.pointsValue}>{pointsBalance.toLocaleString()}</span>
      </div>
      {planExpiresAt && (
        <p className={styles.expiry}>
          Plan expires: {new Date(planExpiresAt).toLocaleDateString()}
        </p>
      )}
    </Card>
  );
};
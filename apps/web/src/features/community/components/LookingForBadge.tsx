import React from 'react';
import { Heart, Crown, Handshake, MessageCircle } from 'lucide-react';
import { LookingForData } from '../../types/community.types';
import styles from '../styles/LookingForBadge.module.css';

interface LookingForBadgeProps {
  lookingFor: LookingForData;
}

const getBadgeConfig = (type: string) => {
  switch (type) {
    case 'marriage':
      return { icon: Crown, color: '#f59e0b', bg: '#fef3c7', border: '#fde68a' };
    case 'relationship':
      return { icon: Heart, color: '#ef4444', bg: '#fee2e2', border: '#fecaca' };
    case 'friendship':
      return { icon: Handshake, color: '#10b981', bg: '#d1fae5', border: '#a7f3d0' };
    case 'conversation':
      return { icon: MessageCircle, color: '#3b82f6', bg: '#dbeafe', border: '#bfdbfe' };
    default:
      return { icon: Heart, color: '#ef4444', bg: '#fee2e2', border: '#fecaca' };
  }
};

export const LookingForBadge: React.FC<LookingForBadgeProps> = ({ lookingFor }) => {
  const config = getBadgeConfig(lookingFor.type);
  const Icon = config.icon;

  return (
    <div
      className={styles.badge}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
    >
      <Icon size={12} className={styles.icon} />
      <span className={styles.label}>Looking for {lookingFor.label}</span>
    </div>
  );
};

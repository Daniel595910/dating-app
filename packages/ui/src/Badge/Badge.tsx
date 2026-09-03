import React from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  variant ? : BadgeVariant;
  children: React.ReactNode;
  className ? : string;
  icon ? : React.ReactNode;
}

export const Badge: React.FC < BadgeProps > = ({ variant = 'default', children, className, icon }) => {
  const badgeClasses = [styles.badge, styles[variant], className || '']
    .filter(Boolean)
    .join(' ');
  
  return (
    <span className={badgeClasses}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
};
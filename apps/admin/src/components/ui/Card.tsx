import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  padding = 'md',
  className = '',
}) => {
  const hasHeader = title || subtitle || actions;

  return (
    <div className={`${styles.card} ${className}`}>
      {hasHeader && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={`${styles.content} ${styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`]}`}>
        {children}
      </div>
    </div>
  );
};

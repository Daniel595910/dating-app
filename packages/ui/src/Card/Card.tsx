import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  clickable?: boolean;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  children,
  header,
  footer,
  clickable = false,
  onClick,
  loading = false,
  className,
}) => {
  const cardClasses = [
    styles.card,
    clickable ? styles.clickable : '',
    loading ? styles.loading : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const CardWrapper = clickable ? 'button' : 'div';
  const wrapperProps = clickable
    ? { onClick, type: 'button' as const, className: cardClasses }
    : { className: cardClasses };

  return (
    <CardWrapper {...(wrapperProps as any)}>
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}
      {(header || title || description) && (
        <div className={styles.header}>
          {header || (
            <>
              {title && <h3 className={styles.title}>{title}</h3>}
              {description && <p className={styles.description}>{description}</p>}
            </>
          )}
        </div>
      )}
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </CardWrapper>
  );
};
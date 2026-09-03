import React from 'react';
import styles from './Spinner.module.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size ? : SpinnerSize;
  label ? : string;
  inline ? : boolean;
  className ? : string;
}

export const Spinner: React.FC < SpinnerProps > = ({ size = 'md', label = 'Loading...', inline = false, className }) => {
  const spinnerClasses = [styles.spinner, styles[size], className || '']
    .filter(Boolean)
    .join(' ');
  
  if (inline) {
    return (
      <span className={styles.inlineWrapper}>
        <span className={spinnerClasses} role="status" aria-label={label} />
      </span>
    );
  }
  
  return (
    <div className={styles.wrapper} role="status" aria-label={label}>
      <div className={spinnerClasses} />
      <span className={styles.label}>{label}</span>
    </div>
  );
};
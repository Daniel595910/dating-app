import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  fullScreen = false,
  text,
}) => {
  if (fullScreen) {
    return (
      <div className={styles.fullScreen}>
        <div className={`${styles.spinner} ${styles[size]}`} />
        {text && <p className={styles.text}>{text}</p>}
      </div>
    );
  }

  return (
    <div className={styles.inline}>
      <div className={`${styles.spinner} ${styles[size]}`} />
      {text && <span className={styles.text}>{text}</span>}
    </div>
  );
};

import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  online,
}) => {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={`${styles.wrapper} ${styles[size]}`}>
      <div className={styles.avatar}>
        {src ? <img src={src} alt={name || ''} /> : <span className={styles.fallback}>{initial}</span>}
      </div>
      {online !== undefined && (
        <span className={`${styles.status} ${online ? styles.online : styles.offline}`} />
      )}
    </div>
  );
};

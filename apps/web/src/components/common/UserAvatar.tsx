/**
 * UserAvatar Component
 * Displays user avatar with fallback
 */

import React, { useState } from 'react';
import styles from './UserAvatar.module.css';

interface UserAvatarProps {
  src ? : string | null;
  name: string;
  size ? : 'sm' | 'md' | 'lg' | 'xl';
  online ? : boolean;
  verified ? : boolean;
  className ? : string;
}

export const UserAvatar: React.FC < UserAvatarProps > = ({
  src,
  name,
  size = 'md',
  online,
  verified,
  className,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0] !.slice(0, 2).toUpperCase();
    }
    return (words[0] ![0] + words[1] ![0]).toUpperCase();
  };
  
  const avatarClasses = [
      styles.avatar,
      styles[size],
      className || '',
    ]
    .filter(Boolean)
    .join(' ');
  
  return (
    <div className={styles.wrapper}>
      <div className={avatarClasses}>
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            className={styles.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.fallback} role="img" aria-label={name}>
            {getInitials(name)}
          </div>
        )}
      </div>
      {online !== undefined && (
        <span
          className={`${styles.indicator} ${online ? styles.online : styles.offline}`}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
      {verified && (
        <span className={styles.verified} aria-label="Verified">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
        </span>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import styles from './Avatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src ? : string | null;
  alt: string;
  size ? : AvatarSize;
  online ? : boolean;
  verified ? : boolean;
  className ? : string;
}

export const Avatar: React.FC < AvatarProps > = ({
  src,
  alt,
  size = 'md',
  online,
  verified,
  className,
}) => {
  const [imageError, setImageError] = useState(false);
  
  const avatarClasses = [styles.avatar, styles[size], className || '']
    .filter(Boolean)
    .join(' ');
  
  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0] !.slice(0, 2).toUpperCase();
    }
    return (words[0] ![0] + words[1] ![0]).toUpperCase();
  };
  
  return (
    <div className={styles.wrapper}>
      <div className={avatarClasses}>
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className={styles.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.fallback} aria-label={alt} role="img">
            {getInitials(alt)}
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
        </span>
      )}
    </div>
  );
};
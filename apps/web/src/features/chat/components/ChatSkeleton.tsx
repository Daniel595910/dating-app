import React from 'react';
import styles from '../styles/ChatSkeleton.module.css';

interface ChatSkeletonProps {
  rows?: number;
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ rows = 6 }) => {
  return (
    <div className={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.avatar} />
          <div className={styles.info}>
            <div className={styles.header}>
              <div className={styles.name} />
              <div className={styles.time} />
            </div>
            <div className={styles.preview} />
          </div>
        </div>
      ))}
    </div>
  );
};
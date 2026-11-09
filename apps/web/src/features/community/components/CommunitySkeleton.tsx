import React from 'react';
import styles from '../styles/CommunitySkeleton.module.css';

export const CommunitySkeleton: React.FC = () => {
  return (
    <div className={styles.skeletonPage}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.postSkeleton}>
          <div className={styles.postHeaderSkeleton}>
            <div className={styles.avatarSkeleton} />
            <div className={styles.postHeaderText}>
              <div className={styles.nameSkeleton} />
              <div className={styles.locationSkeleton} />
            </div>
          </div>
          <div className={styles.contentSkeleton} />
          <div className={styles.contentSkeletonShort} />
          {i === 1 && <div className={styles.mediaSkeleton} />}
          <div className={styles.actionsSkeleton}>
            <div className={styles.actionIconSkeleton} />
            <div className={styles.actionIconSkeleton} />
            <div className={styles.actionIconSkeleton} />
          </div>
        </div>
      ))}
    </div>
  );
};
import React from 'react';
import { PostMedia as PostMediaType } from '../../types/community.types';
import styles from '../styles/PostMedia.module.css';

interface PostMediaProps {
  media: PostMediaType[];
  onImageClick: (index: number) => void;
}

export const PostMedia: React.FC<PostMediaProps> = ({ media, onImageClick }) => {
  if (media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0]!;
    return (
      <div className={styles.singleContainer} onClick={() => onImageClick(0)} style={{ cursor: 'pointer' }}>
        <img
          src={item.thumbnailUrl || item.url}
          alt=""
          loading="lazy"
          className={styles.singleImage}
        />
      </div>
    );
  }

  return (
    <div className={styles.multiContainer}>
      {media.map((item, index) => (
        <img
          key={item.id || index}
          src={item.thumbnailUrl || item.url}
          alt=""
          loading="lazy"
          className={styles.multiImage}
          onClick={() => onImageClick(index)}
          style={{ cursor: 'pointer' }}
        />
      ))}
      {media.length > 5 && (
        <span className={styles.imageCountBadge}>+{media.length - 5}</span>
      )}
    </div>
  );
};

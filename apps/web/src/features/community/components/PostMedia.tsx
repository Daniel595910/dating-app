import React from 'react';
import { Play } from 'lucide-react';
import { PostMedia as PostMediaType } from '../types/community.types';
import styles from '../styles/PostMedia.module.css';

interface PostMediaProps {
  media: PostMediaType[];
  onImageClick: (index: number) => void;
}

function isVideo(item: PostMediaType): boolean {
  return item.type === 'video';
}

export const PostMedia: React.FC<PostMediaProps> = ({ media, onImageClick }) => {
  if (media.length === 0) return null;

  // ── Single media ─────────────────────────────────────────
  if (media.length === 1) {
    const item = media[0]!;

    if (isVideo(item)) {
      return (
        <div className={styles.singleContainer}>
          <video
            src={item.url}
            poster={item.thumbnailUrl ?? undefined}
            controls
            preload="none"
            className={styles.singleVideo}
            playsInline
          />
        </div>
      );
    }

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

  // ── Multi media ──────────────────────────────────────────
  return (
    <div className={styles.multiContainer}>
      {media.map((item, index) => {
        if (isVideo(item)) {
          return (
            <div key={item.id || index} className={styles.multiVideoWrapper}>
              <video
                src={item.url}
                poster={item.thumbnailUrl ?? undefined}
                controls
                preload="none"
                className={styles.multiVideo}
                playsInline
              />
              <span className={styles.videoBadge}>
                <Play size={10} fill="#fff" /> Video
              </span>
            </div>
          );
        }

        return (
          <img
            key={item.id || index}
            src={item.thumbnailUrl || item.url}
            alt=""
            loading="lazy"
            className={styles.multiImage}
            onClick={() => onImageClick(index)}
            style={{ cursor: 'pointer' }}
          />
        );
      })}
      {media.length > 5 && (
        <span className={styles.imageCountBadge}>+{media.length - 5}</span>
      )}
    </div>
  );
};

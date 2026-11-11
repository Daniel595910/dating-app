import { useEffect, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import type { PostMedia } from '../../types/community.types';
import styles from './Composer.module.css';

interface MediaPreviewGridProps {
  media: PostMedia[];
  onRemove: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Renders image + video previews in a wrapping grid.
 * Video tiles show a black background with a play icon + duration badge.
 */
export function MediaPreviewGrid({ media, onRemove }: MediaPreviewGridProps) {
  if (media.length === 0) return null;

  return (
    <div className={styles.mediaPreview}>
      {media.map((m) => (
        <MediaTile key={m.id} item={m} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface MediaTileProps {
  item: PostMedia;
  onRemove: (id: string) => void;
}

function MediaTile({ item, onRemove }: MediaTileProps) {
  const [durationLabel, setDurationLabel] = useState<string | null>(null);

  useEffect(() => {
    if (item.type !== 'video') return;
    let cancelled = false;

    // getVideoDuration requires a File, not a URL.
    // For already-uploaded videos we derive duration from the URL via a temp video element.
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      if (cancelled) return;
      const d = video.duration;
      if (Number.isFinite(d) && d > 0) setDurationLabel(formatDuration(d));
    };
    video.onerror = () => { /* keep durationLabel null on error */ };
    video.src = item.url;

    return () => {
      cancelled = true;
      video.src = '';
    };
  }, [item.url, item.type]);

  return (
    <div className={styles.mediaPreviewItem}>
      {item.type === 'video' ? (
        <div
          className={styles.mediaPreviewImage}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            position: 'relative',
          }}
        >
          <Play size={20} color="#fff" />
          {durationLabel && (
            <span
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {durationLabel}
            </span>
          )}
        </div>
      ) : (
        <img src={item.url} alt="" className={styles.mediaPreviewImage} />
      )}
      <button
        className={styles.mediaRemoveButton}
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.type}`}
        type="button"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

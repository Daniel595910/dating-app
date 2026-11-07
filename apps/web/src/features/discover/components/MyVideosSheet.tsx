import React from 'react';
import { X, Plus, Video } from 'lucide-react';
import styles from './MyVideosSheet.module.css';

interface MyVideo {
  video_id: string;
  video_url: string;
  thumbnail_url?: string | null;
  status: 'approved' | 'pending' | 'removed' | string;
  created_at?: string;
}

interface MyVideosSheetProps {
  open: boolean;
  videos: MyVideo[];
  theme?: 'light' | 'dark';
  onClose: () => void;
  onUploadClick: () => void;
  onVideoClick: (video: MyVideo) => void;
}

export const MyVideosSheet: React.FC<MyVideosSheetProps> = ({
  open,
  videos,
  theme,
  onClose,
  onUploadClick,
  onVideoClick,
}) => {
  if (!open) return null;

  const getStatusClass = (status: string): string => {
    if (status === 'approved') return styles.statusApproved;
    if (status === 'pending') return styles.statusPending;
    return styles.statusHidden;
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'approved') return 'Approved';
    if (status === 'pending') return 'Pending';
    return 'Hidden';
  };

  return (
    <div className={styles.backdrop} onClick={onClose} onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <div
        className={styles.sheet}
        data-theme={theme || undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.grabber} />

        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            My Videos
            <span className={styles.headerCount}>{videos.length}</span>
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.scrollArea}>
          {videos.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <Video size={32} />
              </div>
              <div>
                <p className={styles.emptyTitle}>No videos yet</p>
                <p className={styles.emptyText}>Upload your first video to appear in Discover</p>
              </div>
              <button className={styles.uploadCta} onClick={onUploadClick}>
                Upload Video
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {videos.map((video) => (
                <div
                  key={video.video_id}
                  className={styles.cell}
                  onClick={() => onVideoClick(video)}
                >
                  <video
                    src={video.video_url}
                    muted
                    playsInline
                    className={styles.cellVideo}
                  />
                  <span className={`${styles.statusBadge} ${getStatusClass(video.status)}`}>
                    {getStatusLabel(video.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {videos.length > 0 && (
          <button className={styles.uploadFab} onClick={onUploadClick} aria-label="Upload new video">
            <Plus size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

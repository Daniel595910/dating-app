import React, { useEffect, useRef } from 'react';
import { X, Trash2, ArrowLeft, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';
import styles from './VideoPreviewModal.module.css';

interface PreviewVideo {
  video_id: string;
  video_url: string;
  status: 'approved' | 'pending' | 'removed' | string;
}

interface VideoPreviewModalProps {
  video: PreviewVideo | null;
  onClose: () => void;
  onToggleVisibility: (videoId: string, currentStatus: string) => void;
  onDelete: (videoId: string) => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  video,
  onClose,
  onToggleVisibility,
  onDelete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(true);
  const [muted, setMuted] = React.useState(true);

  useEffect(() => {
    if (!video) return;
    setPlaying(true);
    setMuted(true);
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, [video?.video_id]);

  if (!video) return null;

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const isHidden = video.status === 'removed';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          src={video.video_url}
          autoPlay
          playsInline
          loop
          muted
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={styles.video}
          onClick={handlePlayPause}
        />

        <button
          className={styles.playPauseBtn}
          onClick={handlePlayPause}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.87l11.13-6.86a1 1 0 0 0 0-1.74L9.5 4.27A1 1 0 0 0 8 5.14z" />
            </svg>
          )}
        </button>

        <button
          className={styles.backBtn}
          onClick={onClose}
          aria-label="Close preview"
        >
          <ArrowLeft size={24} />
        </button>

        <button
          className={styles.muteBtn}
          onClick={handleToggleMute}
          aria-label={muted ? 'Unmute video' : 'Mute video'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        <div className={styles.actionsRow}>
          <button
            className={`${styles.actionBtn} ${styles.hideShowBtn} ${isHidden ? styles.hideShowBtnActive : ''}`}
            onClick={() => {
              onToggleVisibility(video.video_id, video.status);
              onClose();
            }}
          >
            {isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
            {isHidden ? 'Show' : 'Hide'}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={() => {
              if (window.confirm('Delete this video permanently?')) {
                onDelete(video.video_id);
                onClose();
              }
            }}
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import styles from './VideoPreviewModal.module.css';

interface VideoPreviewModalProps {
  video: {
    id: string;
    video_url: string;
    privacy?: string;
    like_count?: number;
    view_count?: number;
    caption?: string;
    duration_seconds?: number;
  } | null;
  onClose: () => void;
  isOwner: boolean;
  onUpdatePrivacy?: (videoId: string, privacy: string) => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  video,
  onClose,
  isOwner,
  onUpdatePrivacy,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isOpen = !!video;

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Reset state when video changes
  useEffect(() => {
    if (!video) return;
    setLoading(true);
    setError(false);
    setProgress(0);
    setDuration(0);
    setPlaying(false);
  }, [video?.id]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); }
    else { el.pause(); }
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.duration) {
      setProgress((el.currentTime / el.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
    setLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const pct = Number(e.target.value);
    el.currentTime = (pct / 100) * el.duration;
    setProgress(pct);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    resetControlsTimer();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (dy > 100) { onClose(); }
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2500);
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + sec.toString().padStart(2, '0');
  };

  if (!isOpen || !video) return null;

  return (
    <div
      className={styles.overlay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={onClose}
    >
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          src={video.video_url}
          autoPlay
          loop
          playsInline
          muted={muted}
          className={styles.video}
          onPlay={() => { setPlaying(true); resetControlsTimer(); }}
          onPause={() => { setPlaying(false); setShowControls(true); }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onClick={togglePlay}
        />

        {loading && (
          <div className={styles.spinnerWrap}>
            <Loader2 size={48} className={styles.spinner} />
          </div>
        )}

        {error && (
          <div className={styles.errorMsg}>
            <p>Failed to load video</p>
          </div>
        )}

        {!playing && !loading && !error && (
          <div className={styles.centerPlay} onClick={togglePlay}>
            <div className={styles.playCircle}>
              <Play size={40} fill="#ffffff" />
            </div>
          </div>
        )}

        <div className={styles.controls + (showControls ? '' : ' ' + styles.controlsHidden)} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>

          <button className={styles.muteBtn} onClick={toggleMute} aria-label="Toggle mute">
            {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>

          <div className={styles.bottomBar}>
            <button className={styles.playBtn} onClick={togglePlay} aria-label="Play/pause">
              {playing ? <Pause size={20} /> : <Play size={20} fill="#ffffff" />}
            </button>
            <span className={styles.time}>{formatTime(videoRef.current?.currentTime || 0)}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeek}
              className={styles.seek}
              aria-label="Seek"
            />
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>

          {isOwner && onUpdatePrivacy && (
            <div className={styles.privacyBar}>
              <span className={styles.privacyLabel}>Visibility</span>
              <select
                value={video.privacy || 'public'}
                onChange={(e) => onUpdatePrivacy(video.id, e.target.value)}
                className={styles.privacySelect}
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Only Me</option>
              </select>
            </div>
          )}

          {video.caption && (
            <div className={styles.captionWrap}>
              <p className={styles.caption}>{video.caption}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Loader2, ChevronUp } from 'lucide-react';
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
  allVideos?: Array<any>;
  onClose: () => void;
  onChangeVideo?: (video: any) => void;
  isOwner: boolean;
  onUpdatePrivacy?: (videoId: string, privacy: string) => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  video,
  allVideos = [],
  onClose,
  onChangeVideo,
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
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const controlsTimer = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const isOpen = !!video;
  const currentIdx = video && allVideos.length > 0 ? allVideos.findIndex((v) => v.id === video.id) : -1;
  const hasNext = currentIdx !== -1 && currentIdx < allVideos.length - 1;
  const hasPrev = currentIdx !== -1 && currentIdx > 0;

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

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

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2500);
  }, []);

  const goNext = useCallback(() => {
    if (!hasNext || !onChangeVideo) return;
    onChangeVideo(allVideos[currentIdx + 1]);
  }, [hasNext, currentIdx, allVideos, onChangeVideo]);

  const goPrev = useCallback(() => {
    if (!hasPrev || !onChangeVideo) return;
    onChangeVideo(allVideos[currentIdx - 1]);
  }, [hasPrev, currentIdx, allVideos, onChangeVideo]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, togglePlay, goNext, goPrev]);

  useEffect(() => {
    if (!video) return;
    setLoading(true);
    setError(false);
    setProgress(0);
    setDuration(0);
    setPlaying(false);
    setCaptionExpanded(false);
    setPrivacyOpen(false);
  }, [video?.id]);

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.duration) setProgress((el.currentTime / el.duration) * 100);
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
    touchStartX.current = e.touches[0].clientX;
    resetControlsTimer();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartY.current = null;
    touchStartX.current = null;

    // Only respond to vertical swipes with clear vertical intent
    if (Math.abs(dy) < 80 || Math.abs(dy) < Math.abs(dx)) return;

    // Swipe up = next (dy negative)
    if (dy < -80 && hasNext) { goNext(); return; }
    // Swipe down = prev (dy positive)
    if (dy > 80 && hasPrev) { goPrev(); return; }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + sec.toString().padStart(2, '0');
  };

  const currentPrivacyLabel =
    video?.privacy === 'friends' ? 'Friends Only' :
    video?.privacy === 'private' ? 'Only Me' :
    'Public';

  const setPrivacy = (value: string) => {
    if (video && onUpdatePrivacy) onUpdatePrivacy(video.id, value);
    setPrivacyOpen(false);
  };

  if (!isOpen || !video) return null;

  const captionIsLong = video.caption ? video.caption.length > 100 : false;
  const showCounter = allVideos.length > 1 && currentIdx >= 0;

  return (
    <div
      className={styles.overlay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.container}>
        <video
          ref={videoRef}
          key={video.id}
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

        <div className={styles.controls + (showControls ? '' : ' ' + styles.controlsHidden)}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>

          {showCounter && (
            <div className={styles.videoCounter}>
              {currentIdx + 1} / {allVideos.length}
            </div>
          )}

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

          {video.caption && (
            <div className={styles.captionPill + (captionExpanded ? ' ' + styles.captionPillExpanded : '')}>
              <p className={styles.captionText}>{video.caption}</p>
              {captionIsLong && (
                <button
                  className={styles.captionToggle}
                  onClick={() => setCaptionExpanded((v) => !v)}
                >
                  {captionExpanded ? 'Read Less' : 'Read More'}
                  <ChevronUp size={14} className={captionExpanded ? styles.chevronRotated : ''} />
                </button>
              )}
            </div>
          )}

          {isOwner && onUpdatePrivacy && (
            <div className={styles.privacyWrap}>
              <button
                className={styles.privacyBtn}
                onClick={() => setPrivacyOpen((v) => !v)}
                aria-label="Change visibility"
              >
                <span>{currentPrivacyLabel}</span>
                <ChevronUp size={14} className={privacyOpen ? styles.chevronRotated : ''} />
              </button>
              {privacyOpen && (
                <div className={styles.privacyMenu}>
                  <button
                    className={styles.privacyMenuItem + (video.privacy === 'public' || !video.privacy ? ' ' + styles.privacyMenuItemActive : '')}
                    onClick={() => setPrivacy('public')}
                  >
                    Public
                  </button>
                  <button
                    className={styles.privacyMenuItem + (video.privacy === 'friends' ? ' ' + styles.privacyMenuItemActive : '')}
                    onClick={() => setPrivacy('friends')}
                  >
                    Friends Only
                  </button>
                  <button
                    className={styles.privacyMenuItem + (video.privacy === 'private' ? ' ' + styles.privacyMenuItemActive : '')}
                    onClick={() => setPrivacy('private')}
                  >
                    Only Me
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './GroupVideoViewer.module.css';

interface GroupVideoViewerProps {
  videos: string[];
  initialIndex: number;
  onClose: () => void;
}

const formatTime = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const GroupVideoViewer: React.FC<GroupVideoViewerProps> = ({ videos, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number>(0);

  const hasMultiple = videos.length > 1;

  // Load new video when index changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    v.load();
    const playPromise = v.play();
    if (playPromise) {
      playPromise.then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [index]);

  // Hide controls after 2.5s of playing
  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing && showControls) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing, showControls]);

  // Keyboard: Esc closes, Left/Right navigates
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && index > 0) goPrev();
      else if (e.key === 'ArrowRight' && index < videos.length - 1) goNext();
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, videos.length]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    else { v.pause(); setPlaying(false); }
    setShowControls(true);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    v.currentTime = t;
    setCurrentTime(t);
  };

  const goPrev = () => { if (index > 0) setIndex(index - 1); };
  const goNext = () => { if (index < videos.length - 1) setIndex(index + 1); };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 60) return;
    if (dx > 0) goPrev();
    else goNext();
  };

  return (
    <div
      className={styles.overlay}
      onClick={() => { if (showControls) onClose(); else setShowControls(true); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        {hasMultiple && (
          <div className={styles.counter}>{index + 1} / {videos.length}</div>
        )}

        {hasMultiple && index > 0 && (
          <button type="button" className={`${styles.navBtn} ${styles.navPrev}`} onClick={goPrev} aria-label="Previous video">
            <ChevronLeft size={32} />
          </button>
        )}
        {hasMultiple && index < videos.length - 1 && (
          <button type="button" className={`${styles.navBtn} ${styles.navNext}`} onClick={goNext} aria-label="Next video">
            <ChevronRight size={32} />
          </button>
        )}

        <video
          ref={videoRef}
          src={videos[index]}
          className={styles.video}
          playsInline
          autoPlay
          muted={muted}
          onClick={togglePlay}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => { setPlaying(false); setShowControls(true); }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {showControls && (
          <div className={styles.controls}>
            <button type="button" className={styles.ctrlBtn} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <input
              type="range"
              className={styles.seekbar}
              min="0"
              max="100"
              value={duration > 0 ? (currentTime / duration) * 100 : 0}
              onChange={seek}
              aria-label="Seek"
            />
            <span className={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>
            <button type="button" className={styles.ctrlBtn} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
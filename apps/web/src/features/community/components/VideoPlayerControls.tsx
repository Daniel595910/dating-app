import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import styles from '../styles/VideoPlayerControls.module.css';

interface VideoPlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  onPlayingChange?: (playing: boolean) => void;
  autoHideMs?: number;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

export function VideoPlayerControls({
  videoRef,
  containerRef,
  onPlayingChange,
  autoHideMs = 3000,
}: VideoPlayerControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(true);
  const seekTrackRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Attach listeners to the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => { setPlaying(true); onPlayingChange?.(true); };
    const handlePause = () => { setPlaying(false); onPlayingChange?.(false); };
    const handleTimeUpdate = () => {
      if (!dragging) setCurrentTime(video.currentTime);
    };
    const handleDurationChange = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };
    const handleVolumeChange = () => setMuted(video.muted);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);

    // Initialize state from video element (in case it's already playing)
    if (video.duration && Number.isFinite(video.duration)) setDuration(video.duration);
    if (!video.paused) setPlaying(true);
    setMuted(video.muted);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [videoRef, onPlayingChange, dragging]);

  // Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls when playing and idle
  const resetHideTimer = useCallback(() => {
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (autoHideMs > 0 && playing && !dragging) {
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, autoHideMs);
    }
  }, [autoHideMs, playing, dragging]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      // Only handle if video is the "active" focus context
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
      } else if (e.key === 'm') {
        e.preventDefault();
        video.muted = !video.muted;
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoRef, containerRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    resetHideTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    resetHideTimer();
  };

  const toggleFullscreen = () => {
    const target = containerRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    resetHideTimer();
  };

  const seekTo = (clientX: number) => {
    const track = seekTrackRef.current;
    const video = videoRef.current;
    if (!track || !video || !duration) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekTo(e.clientX);
  };

  const handleSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    seekTo(e.clientX);
  };

  const handleSeekPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    resetHideTimer();
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`${styles.controlsBar} ${visible ? styles.visible : styles.hidden}`}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={resetHideTimer}
      onPointerLeave={() => {
        if (playing && !dragging) {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          hideTimerRef.current = setTimeout(() => setVisible(false), autoHideMs);
        }
      }}
    >
      {/* Seek bar (full width, above buttons) */}
      <div
        className={styles.seekTrack}
        ref={seekTrackRef}
        onPointerDown={handleSeekPointerDown}
        onPointerMove={handleSeekPointerMove}
        onPointerUp={handleSeekPointerUp}
        role="slider"
        aria-label="Seek video"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        tabIndex={0}
      >
        <div className={styles.seekFill} style={{ width: progressPct + '%' }} />
        <div className={styles.seekThumb} style={{ left: progressPct + '%' }} />
      </div>

      {/* Button row */}
      <div className={styles.buttonRow}>
        <button
          type="button"
          onClick={togglePlay}
          className={styles.iconButton}
          aria-label={playing ? 'Pause video' : 'Play video'}
        >
          {playing ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" />}
        </button>

        <span className={styles.timeDisplay}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className={styles.spacer} />

        <button
          type="button"
          onClick={toggleMute}
          className={styles.iconButton}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className={styles.iconButton}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </div>
  );
}

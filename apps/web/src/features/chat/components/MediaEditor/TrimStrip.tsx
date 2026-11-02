import React, { useCallback, useEffect, useRef, useState } from 'react';
import { extractFrames, TrimRange } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface TrimStripProps {
  videoUrl: string;
  duration: number;
  trimRange: TrimRange;
  currentTime: number;
  onChange: (range: TrimRange) => void;
  onSeek: (time: number) => void;
  disabled?: boolean;
  maxTrimSeconds?: number;
}

const MIN_TRIM_SECONDS = 1;

export const TrimStrip: React.FC<TrimStripProps> = ({
  videoUrl,
  duration,
  trimRange,
  currentTime,
  onChange,
  onSeek,
  disabled = false,
  maxTrimSeconds = 60,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(true);
  const [extractFailed, setExtractFailed] = useState(false);
  const dragging = useRef<'start' | 'end' | null>(null);

  // Extract frames once when the URL is available
  useEffect(() => {
    let cancelled = false;
    setExtracting(true);
    setExtractFailed(false);
    extractFrames(videoUrl, 8).then((result) => {
      if (cancelled) return;
      setExtracting(false);
      if (result.success && result.thumbnails.length > 0) {
        setFrames(result.thumbnails);
      } else {
        setExtractFailed(true);
      }
    });
    return () => { cancelled = true; };
  }, [videoUrl]);

  const pct = (seconds: number) => (duration > 0 ? (seconds / duration) * 100 : 0);

  const clampHandle = (which: 'start' | 'end', seconds: number): number => {
    if (which === 'start') {
      // Start handle cannot push past end - MIN, and must leave room for at least
      // a full selection on the end side (end - start <= maxTrimSeconds)
      const maxStart = Math.min(trimRange.end - MIN_TRIM_SECONDS, trimRange.end - MIN_TRIM_SECONDS);
      const minStart = Math.max(0, trimRange.end - maxTrimSeconds);
      return Math.max(minStart, Math.min(seconds, maxStart));
    }
    // End handle cannot exceed start + maxTrimSeconds, and cannot exceed duration
    return Math.max(
      trimRange.start + MIN_TRIM_SECONDS,
      Math.min(seconds, Math.min(duration, trimRange.start + maxTrimSeconds))
    );
  };

  const timeFromEvent = (e: React.PointerEvent): number => {
    const el = stripRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  };

  const handleDown = (which: 'start' | 'end') => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = which;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!dragging.current || disabled) return;
    e.preventDefault();
    const t = timeFromEvent(e);
    const clamped = clampHandle(dragging.current, t);
    const next = dragging.current === 'start'
      ? { ...trimRange, start: clamped }
      : { ...trimRange, end: clamped };
    onChange(next);
  };

  const handleUp = () => {
    dragging.current = null;
  };

  // Tap on strip (outside handles) seeks the playhead to that position
  const handleStripClick = (e: React.PointerEvent) => {
    if (dragging.current || disabled) return;
    const t = timeFromEvent(e);
    onSeek(Math.max(trimRange.start, Math.min(trimRange.end, t)));
  };

  const startPct = pct(trimRange.start);
  const endPct = pct(trimRange.end);
  const playheadPct = pct(currentTime);

  return (
    <div className={styles.trimStripWrapper} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp}>
      <div
        ref={stripRef}
        className={styles.trimStripFilmstrip}
        onPointerDown={handleStripClick}
      >
        {extracting ? (
          <div className={styles.trimStripExtracting}>Extracting frames...</div>
        ) : extractFailed || frames.length === 0 ? (
          <div className={styles.trimStripFallback} />
        ) : (
          frames.map((url, i) => (
            <div key={i} className={styles.trimStripFrame} style={{ backgroundImage: `url(${url})` }} />
          ))
        )}

        {/* Dim before trim range */}
        <div className={styles.trimStripDim} style={{ left: 0, width: `${startPct}%` }} />
        {/* Dim after trim range */}
        <div className={styles.trimStripDim} style={{ left: `${endPct}%`, right: 0 }} />
        {/* Selection border */}
        <div
          className={styles.trimStripSelection}
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {/* Playhead */}
        {playheadPct >= startPct && playheadPct <= endPct && (
          <div className={styles.trimStripPlayhead} style={{ left: `${playheadPct}%` }} />
        )}

        {/* Start handle */}
        <div
          className={`${styles.trimHandle} ${styles.trimHandleLeft}`}
          style={{ left: `${startPct}%` }}
          onPointerDown={handleDown('start')}
        />
        {/* End handle */}
        <div
          className={`${styles.trimHandle} ${styles.trimHandleRight}`}
          style={{ left: `${endPct}%` }}
          onPointerDown={handleDown('end')}
        />
      </div>
    </div>
  );
};
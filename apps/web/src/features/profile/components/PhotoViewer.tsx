import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import styles from './PhotoViewer.module.css';

interface PhotoViewerProps {
  photos: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isOpen = photos.length > 0 && currentIndex !== null;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(false);
  }, [currentIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && currentIndex !== null && currentIndex < photos.length - 1) onNext();
      else if (e.key === 'ArrowLeft' && currentIndex !== null && currentIndex > 0) onPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentIndex, photos.length, onClose, onNext, onPrev]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaY) > 80 && deltaY > 0) { onClose(); return; }
    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0 && currentIndex !== null && currentIndex < photos.length - 1) onNext();
    else if (deltaX > 0 && currentIndex !== null && currentIndex > 0) onPrev();
  }, [currentIndex, photos.length, onNext, onPrev, onClose]);

  if (!isOpen) return null;
  const idx = currentIndex as number;
  const hasPrev = idx > 0;
  const hasNext = idx < photos.length - 1;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.topBar} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>
        {photos.length > 1 && (
          <span className={styles.counter}>{idx + 1} / {photos.length}</span>
        )}
        <div className={styles.topSpacer} />
      </div>

      {loading && (
        <div className={styles.spinnerWrap}>
          <Loader2 size={40} className={styles.spinner} />
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>Failed to load image</p>
        </div>
      )}

      <img
        key={photos[idx]}
        src={photos[idx]}
        alt=""
        className={styles.image}
        style={{ opacity: loading || error ? 0 : 1 }}
        onClick={(e) => e.stopPropagation()}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        draggable={false}
      />

      {photos.length > 1 && hasPrev && (
        <button
          className={styles.navBtn + ' ' + styles.navLeft}
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous"
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {photos.length > 1 && hasNext && (
        <button
          className={styles.navBtn + ' ' + styles.navRight}
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {photos.length > 1 && photos.length <= 10 && (
        <div className={styles.dots} onClick={(e) => e.stopPropagation()}>
          {photos.map((_, i) => (
            <span
              key={i}
              className={styles.dot + (i === idx ? ' ' + styles.dotActive : '')}
            />
          ))}
        </div>
      )}
    </div>
  );
};
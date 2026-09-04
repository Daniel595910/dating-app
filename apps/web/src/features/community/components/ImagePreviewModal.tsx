import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../styles/ImagePreviewModal.module.css';

interface ImagePreviewModalProps {
  open: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  open,
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}) => {
  if (!open) return null;

  const currentImage = images[currentIndex];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeButton} onClick={onClose} aria-label="Close preview">
        <X size={24} />
      </button>

      {images.length > 1 && (
        <div className={styles.counter}>
          {currentIndex + 1} / {images.length}
        </div>
      )}

      <img src={currentImage} alt="" className={styles.image} onClick={(e) => e.stopPropagation()} />

      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button className={styles.navButtonLeft} onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous image">
              <ChevronLeft size={24} />
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button className={styles.navButtonRight} onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next image">
              <ChevronRight size={24} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

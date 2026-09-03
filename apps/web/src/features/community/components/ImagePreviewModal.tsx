import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.95)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close preview"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          cursor: 'pointer',
          color: '#ffffff',
          padding: '12px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
          zIndex: 2,
        }}
      >
        <X size={24} />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '6px 12px',
            borderRadius: '9999px',
          }}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Image */}
      <img
        src={currentImage}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90%',
          maxHeight: '80dvh',
          objectFit: 'contain',
          borderRadius: '8px',
        }}
      />

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              aria-label="Previous image"
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label="Next image"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
              }}
            >
              <ChevronRight size={24} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

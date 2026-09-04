import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  if (photos.length === 0 || currentIndex === null) return null;

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
      <button
        onClick={onClose}
        aria-label="Close"
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
          minWidth: 44,
          minHeight: 44,
        }}
      >
        <X size={24} />
      </button>

      {photos.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
        }}>
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      <img
        src={photos[currentIndex]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90%',
          maxHeight: '80dvh',
          objectFit: 'contain',
          borderRadius: '8px',
        }}
      />

      {photos.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous"
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
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {photos.length > 1 && currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next"
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
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
};


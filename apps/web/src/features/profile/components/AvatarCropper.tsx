import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCcw } from 'lucide-react';

interface AvatarCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
}

export const AvatarCropper: React.FC<AvatarCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

  const onCropCompleteHandler = useCallback(
    (_croppedArea: any, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = async () => {
    if (!croppedAreaPixels) return;

    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 256; // Output size
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      size,
      size
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ffffff',
            padding: '0.5rem',
            borderRadius: '9999px',
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <X size={24} />
        </button>
        <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600 }}>
          Crop Profile Photo
        </span>
        <button
          onClick={createCroppedImage}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ef4444',
            padding: '0.5rem',
            borderRadius: '9999px',
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <Check size={24} />
        </button>
      </div>

      {/* Cropper */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropCompleteHandler}
        />
      </div>

      {/* Zoom Controls */}
      <div
        style={{
          padding: '1rem',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <RotateCcw size={18} style={{ color: '#ffffff' }} />
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: '#ef4444',
          }}
        />
        <span style={{ color: '#ffffff', fontSize: '0.75rem' }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
};

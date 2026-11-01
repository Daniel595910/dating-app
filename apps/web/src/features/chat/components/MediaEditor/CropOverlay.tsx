import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { RotateCw, Check, X } from 'lucide-react';
import { CropRect } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface CropOverlayProps {
  imageUrl: string;
  onCropComplete: (croppedAreaPixels: CropRect, rotation: number) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
  disabled = false,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropRect | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const handleCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: CropRect) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleDone = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels, rotation);
    }
  };

  return (
    <div className={styles.cropFullscreenOverlay}>
      <div className={styles.cropTopBar}>
        <button className={styles.cropIconBtn} onClick={onCancel} disabled={disabled}>
          <X size={24} />
        </button>
        <span className={styles.cropTitle}>Crop</span>
        <button className={styles.cropDoneBtn} onClick={handleDone} disabled={disabled || !croppedAreaPixels}>
          Done
        </button>
      </div>

      <div className={styles.cropContainer}>
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={handleCropComplete}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          showGrid={true}
          restrictPosition={true}
          classes={{
            containerClassName: styles.cropContainerInner,
            cropAreaClassName: styles.cropArea,
          }}
        />
      </div>

      <div className={styles.cropBottomBar}>
        <div className={styles.cropAspectBtns}>
          <button className={`${styles.cropAspectBtn} ${aspect === undefined ? styles.cropAspectBtnActive : ''}`} onClick={() => setAspect(undefined)}>Free</button>
          <button className={`${styles.cropAspectBtn} ${aspect === 1 ? styles.cropAspectBtnActive : ''}`} onClick={() => setAspect(1)}>1:1</button>
          <button className={`${styles.cropAspectBtn} ${aspect === 4/5 ? styles.cropAspectBtnActive : ''}`} onClick={() => setAspect(4/5)}>4:5</button>
          <button className={`${styles.cropAspectBtn} ${aspect === 16/9 ? styles.cropAspectBtnActive : ''}`} onClick={() => setAspect(16/9)}>16:9</button>
        </div>
        
        <div className={styles.cropControls}>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={styles.cropSlider}
            disabled={disabled}
          />
          <button
            className={styles.cropRotateBtn}
            onClick={() => setRotation((r) => r + 90)}
            disabled={disabled}
          >
            <RotateCw size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
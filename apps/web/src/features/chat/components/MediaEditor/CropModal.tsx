import React, { useState, useRef } from 'react';
import { Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { RotateCw, RotateCcw, RefreshCw, FlipHorizontal, FlipVertical } from 'lucide-react';
import styles from './CropModal.module.css';

interface CropModalProps {
  imageUrl: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const CropModal: React.FC<CropModalProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
  disabled = false,
}) => {
  const cropperRef = useRef<any>(null);
  const [activeAspect, setActiveAspect] = useState<string>('Free');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });

  const handleAspectChange = (aspect: string, ratio: number | undefined) => {
    setActiveAspect(aspect);
    if (cropperRef.current) {
      cropperRef.current.setStencilProps({
        aspectRatio: ratio,
      });
    }
  };

  const handleDone = async () => {
    if (!cropperRef.current || disabled || isProcessing) return;
    setIsProcessing(true);

    try {
      const canvas = cropperRef.current.getCanvas();
      if (!canvas) throw new Error('No canvas generated');

      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          setIsProcessing(false);
          return;
        }
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        onCropComplete(file);
      }, 'image/jpeg', 0.92);
    } catch (err) {
      console.error('Crop export failed', err);
      setIsProcessing(false);
    }
  };

  const rotate = (deg: number) => {
    setRotation(prev => prev + deg);
  };

  const flipX = () => {
    setFlip(prev => ({ ...prev, horizontal: !prev.horizontal }));
  };

  const flipY = () => {
    setFlip(prev => ({ ...prev, vertical: !prev.vertical }));
  };

  const reset = () => {
    setRotation(0);
    setActiveAspect('Free');
    setFlip({ horizontal: false, vertical: false });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <button className={styles.textBtn} onClick={onCancel} disabled={disabled || isProcessing}>Cancel</button>
        <span className={styles.title}>Edit Photo</span>
        <button className={`${styles.textBtn} ${styles.doneBtn}`} onClick={handleDone} disabled={disabled || isProcessing}>
          {isProcessing ? 'Saving...' : 'Done'}
        </button>
      </div>

      <div className={styles.viewport}>
        <Cropper
          ref={cropperRef}
          src={imageUrl}
          className={styles.cropperInstance}
          imageClassName={styles.cropperImage}
          stencilProps={{
            aspectRatio: activeAspect === 'Free' ? undefined : 
                         activeAspect === '1:1' ? 1 :
                         activeAspect === '4:5' ? 4/5 :
                         activeAspect === '16:9' ? 16/9 : undefined,
            movable: true,
            resizable: true,
            grid: true,
          }}
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`,
          }}
          minZoom={1}
          maxZoom={3}
        />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolRow}>
          <div className={styles.toolGroup}>
            <button className={styles.iconBtn} onClick={() => rotate(-90)} title="Rotate Left"><RotateCcw size={20} /></button>
            <button className={styles.iconBtn} onClick={() => rotate(90)} title="Rotate Right"><RotateCw size={20} /></button>
            <button className={`${styles.iconBtn} ${flip.horizontal ? styles.iconBtnActive : ''}`} onClick={flipX} title="Flip Horizontal"><FlipHorizontal size={20} /></button>
            <button className={`${styles.iconBtn} ${flip.vertical ? styles.iconBtnActive : ''}`} onClick={flipY} title="Flip Vertical"><FlipVertical size={20} /></button>
            <button className={styles.iconBtn} onClick={reset} title="Reset"><RefreshCw size={20} /></button>
          </div>
        </div>

        <div className={styles.toolRow}>
          <div className={styles.toolGroup}>
            <button className={`${styles.aspectBtn} ${activeAspect === 'Free' ? styles.aspectBtnActive : ''}`} onClick={() => handleAspectChange('Free', undefined)}>Free</button>
            <button className={`${styles.aspectBtn} ${activeAspect === '1:1' ? styles.aspectBtnActive : ''}`} onClick={() => handleAspectChange('1:1', 1)}>1:1</button>
            <button className={`${styles.aspectBtn} ${activeAspect === '4:5' ? styles.aspectBtnActive : ''}`} onClick={() => handleAspectChange('4:5', 4/5)}>4:5</button>
            <button className={`${styles.aspectBtn} ${activeAspect === '16:9' ? styles.aspectBtnActive : ''}`} onClick={() => handleAspectChange('16:9', 16/9)}>16:9</button>
          </div>
        </div>
      </div>
    </div>
  );
};
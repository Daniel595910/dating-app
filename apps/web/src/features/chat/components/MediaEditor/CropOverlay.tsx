import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CropRect, AspectPreset, computeCropRect, scaleCropToScreen, scaleCropToNatural } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface CropOverlayProps {
  imageUrl: string;
  naturalW: number;
  naturalH: number;
  cropRect: CropRect;
  onCropChange: (rect: CropRect) => void;
  aspectPreset: AspectPreset;
  onAspectChange: (preset: AspectPreset) => void;
  disabled?: boolean;
}

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const MIN_SIZE_NATURAL = 50;
const ASPECT_PRESETS: Array<{ value: AspectPreset; label: string }> = [
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '16:9', label: '16:9' },
  { value: 'original', label: 'Original' },
  { value: 'free', label: 'Free' },
];

const ratioOf = (preset: AspectPreset): number | null => {
  if (preset === 'original' || preset === 'free') return null;
  const [rw, rh] = preset.split(':').map(Number);
  return rw / rh;
};

// Clamp a crop rect to image bounds and min-size. If `ratio` is non-null,
// enforce the aspect ratio by adjusting the dimension that wasn't dragged.
function constrainCrop(
  rect: CropRect,
  imageW: number,
  imageH: number,
  ratio: number | null
): CropRect {
  let { x, y, width, height } = rect;

  if (ratio !== null) {
    // Preserve ratio: width is truth, height follows (or vice versa depending
    // on which dimension is larger relative to image). Simpler: always derive
    // height from width, unless width would overflow, in which case derive
    // width from height.
    if (width / height > ratio) {
      // too wide → shrink width
      width = height * ratio;
    } else if (width / height < ratio) {
      // too tall → shrink height
      height = width / ratio;
    }
  }

  // Min size
  if (width < MIN_SIZE_NATURAL) {
    width = MIN_SIZE_NATURAL;
    if (ratio !== null) height = width / ratio;
  }
  if (height < MIN_SIZE_NATURAL) {
    height = MIN_SIZE_NATURAL;
    if (ratio !== null) width = height * ratio;
  }

  // Clamp to image bounds (shift, don't just shrink, so the rect stays useful)
  if (width > imageW) { width = imageW; if (ratio !== null) height = width / ratio; }
  if (height > imageH) { height = imageH; if (ratio !== null) width = height * ratio; }
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + width > imageW) x = imageW - width;
  if (y + height > imageH) y = imageH - height;

  return { x, y, width, height };
}

export const CropOverlay: React.FC<CropOverlayProps> = ({
  imageUrl,
  naturalW,
  naturalH,
  cropRect,
  onCropChange,
  aspectPreset,
  onAspectChange,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const dragRef = useRef<{ handle: HandleId; startX: number; startY: number; startRect: CropRect } | null>(null);

  // Measure the rendered image content area — the container has no padding,
  // so its contentRect is the image content dimensions.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setRendered({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const screenRect = rendered.w > 0
    ? scaleCropToScreen(cropRect, rendered.w, rendered.h, naturalW, naturalH)
    : null;

  const handleAspectClick = (preset: AspectPreset) => {
    if (disabled) return;
    onAspectChange(preset);
    onCropChange(computeCropRect(naturalW, naturalH, preset));
  };

  const onPointerDown = useCallback(
    (handle: HandleId) => (e: React.PointerEvent) => {
      if (disabled || rendered.w === 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: cropRect,
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [disabled, rendered.w, cropRect]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || rendered.w === 0) return;
      const scaleX = naturalW / rendered.w;
      const scaleY = naturalH / rendered.h;
      const dx = (e.clientX - drag.startX) * scaleX;
      const dy = (e.clientY - drag.startY) * scaleY;
      const r = drag.startRect;
      let next: CropRect = { ...r };

      switch (drag.handle) {
        case 'nw': next = { x: r.x + dx, y: r.y + dy, width: r.width - dx, height: r.height - dy }; break;
        case 'n':  next = { x: r.x, y: r.y + dy, width: r.width, height: r.height - dy }; break;
        case 'ne': next = { x: r.x, y: r.y + dy, width: r.width + dx, height: r.height - dy }; break;
        case 'e':  next = { x: r.x, y: r.y, width: r.width + dx, height: r.height }; break;
        case 'se': next = { x: r.x, y: r.y, width: r.width + dx, height: r.height + dy }; break;
        case 's':  next = { x: r.x, y: r.y, width: r.width, height: r.height + dy }; break;
        case 'sw': next = { x: r.x + dx, y: r.y, width: r.width - dx, height: r.height + dy }; break;
        case 'w':  next = { x: r.x + dx, y: r.y, width: r.width - dx, height: r.height }; break;
      }

      // Negative dimensions: flip the anchor
      if (next.width < 0) { next.x += next.width; next.width = -next.width; }
      if (next.height < 0) { next.y += next.height; next.height = -next.height; }

      const ratio = ratioOf(aspectPreset);
      next = constrainCrop(next, naturalW, naturalH, ratio);
      onCropChange(next);
    },
    [rendered.w, rendered.h, naturalW, naturalH, aspectPreset, onCropChange]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  if (!screenRect) {
    return <div ref={containerRef} className={styles.cropOverlay} />;
  }

  const handles: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <div className={styles.cropOverlay}>
      <div className={styles.aspectBar}>
        {ASPECT_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`${styles.aspectButton} ${aspectPreset === p.value ? styles.aspectButtonActive : ''}`}
            onClick={() => handleAspectClick(p.value)}
            disabled={disabled}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className={styles.cropStage}>
        <img src={imageUrl} alt="" className={styles.cropStageImg} draggable={false} />

        {/* Dim outside crop: 4 shading rects around the crop box */}
        <div className={styles.cropDim} style={{ left: 0, top: 0, right: 0, height: screenRect.y }} />
        <div className={styles.cropDim} style={{ left: 0, top: screenRect.y + screenRect.height, right: 0, bottom: 0 }} />
        <div className={styles.cropDim} style={{ left: 0, top: screenRect.y, width: screenRect.x, height: screenRect.height }} />
        <div className={styles.cropDim} style={{ left: screenRect.x + screenRect.width, top: screenRect.y, right: 0, height: screenRect.height }} />

        {/* Crop box with border + grid */}
        <div
          className={styles.cropRect}
          style={{ left: screenRect.x, top: screenRect.y, width: screenRect.width, height: screenRect.height }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className={styles.cropGrid}>
            <div className={styles.cropGridV} style={{ left: '33.33%' }} />
            <div className={styles.cropGridV} style={{ left: '66.66%' }} />
            <div className={styles.cropGridH} style={{ top: '33.33%' }} />
            <div className={styles.cropGridH} style={{ top: '66.66%' }} />
          </div>

          {handles.map((h) => (
            <div
              key={h}
              className={`${styles.cropHandle} ${styles[`cropHandle_${h}`]}`}
              onPointerDown={onPointerDown(h)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
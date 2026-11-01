import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Stroke, StrokePoint, renderMarkupToCanvas, BrushType } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface MarkupCanvasProps {
  imageUrl: string;
  naturalW: number;
  naturalH: number;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  color: string;
  brushType: BrushType;
  brushSize: number;
  disabled?: boolean;
}

export interface MarkupCanvasHandle {
  /** Synchronous source of truth for all committed strokes. */
  getStrokes: () => Stroke[];
}

export const MarkupCanvas = forwardRef<MarkupCanvasHandle, MarkupCanvasProps>(({
  imageUrl,
  naturalW,
  naturalH,
  strokes,
  onStrokesChange,
  color,
  brushType,
  brushSize,
  disabled = false,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageElRef = useRef<HTMLImageElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);
  const [renderedW, setRenderedW] = useState(0);
  const [renderedH, setRenderedH] = useState(0);
  const [imageLoadedTick, setImageLoadedTick] = useState(0);

  // --- Synchronous source of truth (avoids React state-batching races) ---
  const currentPointsRef = useRef<StrokePoint[]>([]);
  const strokesRef = useRef<Stroke[]>(strokes);

  // Keep the ref in sync with the prop, but never rely on this for export.
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useImperativeHandle(ref, () => ({
    getStrokes: () => strokesRef.current,
  }), []);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !naturalW || !naturalH) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const scale = Math.min(rect.width / naturalW, rect.height / naturalH);
      setRenderedW(naturalW * scale);
      setRenderedH(naturalH * scale);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalW, naturalH]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageElRef.current;
    if (!canvas || !img || renderedW <= 0 || renderedH <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = renderedW;
    canvas.height = renderedH;
    ctx.clearRect(0, 0, renderedW, renderedH);
    ctx.drawImage(img, 0, 0, renderedW, renderedH);

    renderMarkupToCanvas(ctx, strokes, naturalW, naturalH, renderedW, renderedH);

    if (currentPoints.length > 0) {
      renderMarkupToCanvas(
        ctx,
        [{ points: currentPoints, color, width: brushSize, brushType }],
        naturalW,
        naturalH,
        renderedW,
        renderedH
      );
    }
  }, [renderedW, renderedH, naturalW, naturalH, strokes, currentPoints, color, brushSize, brushType]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      imageElRef.current = img;
      setImageLoadedTick((t) => t + 1);
    };
    img.src = imageUrl;
    return () => { cancelled = true; };
  }, [imageUrl]);

  useEffect(() => { redraw(); }, [redraw, imageLoadedTick]);

  const getNaturalPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * naturalW;
    const y = ((e.clientY - rect.top) / rect.height) * naturalH;
    return { x, y };
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      e.preventDefault();
      const p = getNaturalPoint(e);
      setDrawing(true);
      currentPointsRef.current = [p];
      setCurrentPoints([p]);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [disabled, naturalW, naturalH]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing || disabled) return;
      e.preventDefault();
      const p = getNaturalPoint(e);
      currentPointsRef.current = [...currentPointsRef.current, p];
      setCurrentPoints(currentPointsRef.current);
    },
    [drawing, disabled, naturalW, naturalH]
  );

  const commitStroke = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);

    const points = currentPointsRef.current;
    if (points.length > 0) {
      const nextStrokes: Stroke[] = [
        ...strokesRef.current,
        { points, color, width: brushSize, brushType },
      ];
      // 1) Update the synchronous ref FIRST - export reads this.
      strokesRef.current = nextStrokes;
      // 2) Then notify the parent (for toolbar undo/clear parity + redraw).
      onStrokesChange(nextStrokes);
    }
    currentPointsRef.current = [];
    setCurrentPoints([]);
  }, [drawing, color, brushSize, brushType, onStrokesChange]);

  if (renderedW <= 0 || renderedH <= 0) {
    return <div ref={containerRef} className={styles.markupContainerPlaceholder} />;
  }

  return (
    <div ref={containerRef} className={styles.markupContainerPlaceholder}>
      <div style={{ position: 'relative', width: renderedW, height: renderedH }}>
        <div className={styles.markupOverlay}>
          <canvas
            ref={canvasRef}
            className={styles.markupCanvas}
            style={{ width: renderedW, height: renderedH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={commitStroke}
            onPointerCancel={commitStroke}
          />
        </div>
      </div>
    </div>
  );
});
MarkupCanvas.displayName = 'MarkupCanvas';

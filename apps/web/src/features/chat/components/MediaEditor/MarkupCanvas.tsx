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
  const [renderedW, setRenderedW] = useState(0);
  const [renderedH, setRenderedH] = useState(0);
  const [imageLoadedTick, setImageLoadedTick] = useState(0);

  // Synchronous source of truth — pointer handlers NEVER read React state
  const drawingRef = useRef(false);
  const currentPointsRef = useRef<StrokePoint[]>([]);
  const strokesRef = useRef<Stroke[]>(strokes);

  // Keep the ref in sync with the prop for external updates (undo/clear)
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

  // Load the image once per imageUrl change
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

  // Full redraw — image + all committed strokes. Does NOT draw in-progress stroke
  // (that's handled synchronously in pointermove via canvas ctx).
  const fullRedraw = useCallback(() => {
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
  }, [renderedW, renderedH, naturalW, naturalH, strokes]);

  // Full redraw whenever strokes / image / dims change
  useEffect(() => {
    fullRedraw();
  }, [fullRedraw, imageLoadedTick]);

  // Convert screen coords → natural image coords
  const getNaturalPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * naturalW;
    const y = ((e.clientY - rect.top) / rect.height) * naturalH;
    return { x, y };
  };

  // Live in-progress stroke draw — bypasses React entirely
  const drawInProgressStroke = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw committed strokes over the image each frame
    const img = imageElRef.current;
    if (!img) return;
    ctx.clearRect(0, 0, renderedW, renderedH);
    ctx.drawImage(img, 0, 0, renderedW, renderedH);
    renderMarkupToCanvas(ctx, strokesRef.current, naturalW, naturalH, renderedW, renderedH);
    // Draw the in-progress stroke
    if (currentPointsRef.current.length > 0) {
      renderMarkupToCanvas(
        ctx,
        [{ points: currentPointsRef.current, color, width: brushSize, brushType }],
        naturalW,
        naturalH,
        renderedW,
        renderedH
      );
    }
  }, [renderedW, renderedH, naturalW, naturalH, color, brushSize, brushType]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      e.preventDefault();
      const p = getNaturalPoint(e);
      drawingRef.current = true;
      currentPointsRef.current = [p];
      (e.target as Element).setPointerCapture?.(e.pointerId);
      drawInProgressStroke();
    },
    [disabled, naturalW, naturalH, drawInProgressStroke]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || disabled) return;
      e.preventDefault();
      const p = getNaturalPoint(e);
      currentPointsRef.current = [...currentPointsRef.current, p];
      drawInProgressStroke();
    },
    [disabled, naturalW, naturalH, drawInProgressStroke]
  );

  const commitStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const points = currentPointsRef.current;
    currentPointsRef.current = [];
    if (points.length === 0) return;

    const nextStrokes: Stroke[] = [
      ...strokesRef.current,
      { points, color, width: brushSize, brushType },
    ];
    strokesRef.current = nextStrokes;
    onStrokesChange(nextStrokes);
  }, [color, brushSize, brushType, onStrokesChange]);

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
            style={{ width: renderedW, height: renderedH, touchAction: 'none' }}
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
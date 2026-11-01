import React, { useCallback, useEffect, useRef, useState } from 'react';
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

export const MarkupCanvas: React.FC<MarkupCanvasProps> = ({
  imageUrl,
  naturalW,
  naturalH,
  strokes,
  onStrokesChange,
  color,
  brushType,
  brushSize,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageElRef = useRef<HTMLImageElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);
  const [renderedW, setRenderedW] = useState(0);
  const [renderedH, setRenderedH] = useState(0);

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
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imageElRef.current = img; redraw(); };
    img.src = imageUrl;
  }, [imageUrl, redraw]);

  useEffect(() => { redraw(); }, [redraw]);

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
      setCurrentPoints((prev) => [...prev, p]);
    },
    [drawing, disabled, naturalW, naturalH]
  );

  const onPointerUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    if (currentPoints.length > 0) {
      onStrokesChange([
        ...strokes,
        { points: currentPoints, color, width: brushSize, brushType },
      ]);
    }
    setCurrentPoints([]);
  }, [drawing, currentPoints, strokes, color, brushSize, brushType, onStrokesChange]);

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
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>
    </div>
  );
};
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stroke, StrokePoint, renderMarkupToCanvas } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface MarkupCanvasProps {
  imageUrl: string;
  naturalW: number;
  naturalH: number;
  renderedW: number;
  renderedH: number;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  color: string;
  disabled?: boolean;
}

const STROKE_WIDTH_NATURAL = 8; // width in natural pixels

export const MarkupCanvas: React.FC<MarkupCanvasProps> = ({
  imageUrl,
  naturalW,
  naturalH,
  renderedW,
  renderedH,
  strokes,
  onStrokesChange,
  color,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);

  // Redraw on every state change: image, existing strokes, in-progress stroke
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || renderedW <= 0 || renderedH <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = renderedW;
    canvas.height = renderedH;
    ctx.clearRect(0, 0, renderedW, renderedH);

    // Draw image scaled to rendered size
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, renderedW, renderedH);
      // Draw committed strokes
      renderMarkupToCanvas(ctx, strokes, naturalW, naturalH, renderedW, renderedH);
      // Draw in-progress stroke
      if (currentPoints.length > 0) {
        renderMarkupToCanvas(
          ctx,
          [{ points: currentPoints, color, width: STROKE_WIDTH_NATURAL }],
          naturalW,
          naturalH,
          renderedW,
          renderedH
        );
      }
    };
    img.src = imageUrl;
  }, [imageUrl, renderedW, renderedH, naturalW, naturalH, strokes, currentPoints, color]);

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
        { points: currentPoints, color, width: STROKE_WIDTH_NATURAL },
      ]);
    }
    setCurrentPoints([]);
  }, [drawing, currentPoints, strokes, color, onStrokesChange]);

  return (
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
  );
};
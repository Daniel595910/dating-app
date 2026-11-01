import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Timer, Sliders, Crop, Pencil } from 'lucide-react';
import { AdjustmentPanel } from './AdjustmentPanel';
import { Adjustments, DEFAULT_ADJUSTMENTS, isDefaultAdjustments, cssFilterFromAdjustments, CropRect, AspectPreset, computeCropRect, exportImage, Stroke, BrushType } from '../../utils/mediaEditor';
import { CaptionInput } from './CaptionInput';
import styles from './MediaEditor.module.css';
import { CropOverlay } from './CropOverlay';
import { MarkupCanvas } from './MarkupCanvas';
import { MarkupToolbar } from './MarkupToolbar';

export interface MediaEditorResult {
  file: File;
  quality: 'hd' | 'sd';
  caption: string;
}

interface MediaEditorProps {
  file: File;
  initialQuality: 'hd' | 'sd';
  onCancel: () => void;
  onConfirm: (opts: MediaEditorResult) => void;
}

export const MediaEditor: React.FC<MediaEditorProps> = ({
  file,
  initialQuality,
  onCancel,
  onConfirm,
}) => {
  const [caption, setCaption] = useState('');
  const [quality, setQuality] = useState<'hd' | 'sd'>(initialQuality);
  const [sending, setSending] = useState(false);
  const [adjustments, setAdjustments] = useState<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
  const [activeTab, setActiveTab] = useState<'adjust' | 'crop' | 'markup' | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('free');
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number } | null>(null);
  const [renderedDims, setRenderedDims] = useState<{ w: number; h: number } | null>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [markupPreview, setMarkupPreview] = useState<string | null>(null);
  const [markupColor, setMarkupColor] = useState('#ef4444');
  const [markupBrush, setMarkupBrush] = useState<BrushType>('pen');
  const [markupSize, setMarkupSize] = useState(8);

  const isVideo = file.type.startsWith('video/');
  const [objectUrl, setObjectUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDims({ w: img.naturalWidth, h: img.naturalHeight });
  };

  useEffect(() => {
    const el = previewAreaRef.current;
    if (!el || !naturalDims) return;
    const measure = () => {
      const containerW = el.clientWidth;
      const containerH = el.clientHeight;
      const scale = Math.min(containerW / naturalDims.w, containerH / naturalDims.h);
      setRenderedDims({ w: naturalDims.w * scale, h: naturalDims.h * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalDims]);

  useEffect(() => {
    if (!naturalDims) return;
    setCropRect(computeCropRect(naturalDims.w, naturalDims.h, aspectPreset));
  }, [naturalDims, aspectPreset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, sending]);

  const handleConfirm = async () => {
    if (sending || !naturalDims) return;
    setSending(true);
    try {
      let outFile = file;
      const hasCrop = cropRect !== null;
      const hasAdjust = !isDefaultAdjustments(adjustments);
      const hasMarkup = strokes.length > 0;
      if (!isVideo && (hasCrop || hasAdjust || hasMarkup)) {
        outFile = await exportImage(file, {
          crop: cropRect,
          adjustments,
          markup: strokes,
        });
      }
      onConfirm({ file: outFile, quality, caption: caption.trim() });
    } catch (err) {
      console.error('[MediaEditor] Export failed:', err);
      setSending(false);
    }
  };

  return (
    <>
      {/* 1. MARKUP STUDIO (Full-screen modal) */}
      {activeTab === 'markup' && !isVideo && (
        <div className={styles.markupFullscreenOverlay}>
          <div className={styles.markupImageContainer}>
              <MarkupCanvas
                imageUrl={objectUrl}
                naturalW={naturalDims.w}
                naturalH={naturalDims.h}
                strokes={strokes}
                onStrokesChange={setStrokes}
                color={markupColor}
                brushType={markupBrush}
                brushSize={markupSize}
                disabled={sending}
              />
          </div>
          <MarkupToolbar
            color={markupColor}
            brushType={markupBrush}
            onBrushTypeChange={setMarkupBrush}
            brushSize={markupSize}
            onBrushSizeChange={setMarkupSize}
            onDone={() => {
              if (strokes.length > 0) {
                exportImage(file, { crop: null, adjustments: DEFAULT_ADJUSTMENTS, markup: strokes })
                  .then(previewFile => setMarkupPreview(URL.createObjectURL(previewFile)))
                  .catch(err => console.error('Preview failed', err));
              }
              setActiveTab(null);
            }}
            onColorChange={setMarkupColor}
            strokes={strokes}
            onStrokesChange={setStrokes}
            disabled={sending}
          />
        </div>
      )}

      {/* 2. STANDARD MEDIA EDITOR */}
      {activeTab !== 'markup' && (
        <div className={styles.overlay} onClick={() => { if (!sending) onCancel(); }}>
          <div className={styles.container} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <button type="button" className={styles.cancelBtn} onClick={() => { if (!sending) onCancel(); }} aria-label="Cancel">
                <X size={20} />
              </button>
              <span className={styles.headerTitle}>Send Media</span>
              <button type="button" className={styles.sendBtn} onClick={handleConfirm} disabled={sending || !naturalDims} aria-label="Send">
                {sending ? 'Sending...' : <><Send size={16} /><span>Send</span></>}
              </button>
            </div>

            <div className={styles.previewArea} ref={previewAreaRef}>
              {isVideo ? (
                <video src={objectUrl} className={styles.media} controls playsInline autoPlay muted />
              ) : (
                <img
                  src={markupPreview || objectUrl}
                  alt="Preview"
                  className={styles.media}
                  onLoad={onImageLoad}
                  style={{
                    ...(!isDefaultAdjustments(adjustments) ? { filter: cssFilterFromAdjustments(adjustments) } : {}),
                    opacity: (activeTab === 'crop' || activeTab === 'markup') && !isVideo ? 0 : 1,
                  }}
                />
              )}
            </div>

            {activeTab === 'adjust' && !isVideo && (
              <AdjustmentPanel adjustments={adjustments} onChange={setAdjustments} disabled={sending} />
            )}

            {activeTab === 'crop' && !isVideo && naturalDims && renderedDims && cropRect && (
              <CropOverlay
                imageUrl={markupPreview || objectUrl}
                naturalW={naturalDims.w}
                naturalH={naturalDims.h}
                renderedW={renderedDims.w}
                renderedH={renderedDims.h}
                cropRect={cropRect}
                onCropChange={setCropRect}
                aspectPreset={aspectPreset}
                onAspectChange={setAspectPreset}
                disabled={sending}
              />
            )}

            <div className={styles.footer}>
              <CaptionInput value={caption} onChange={setCaption} disabled={sending} />

              <div className={styles.tabBar}>
                <button type="button" className={`${styles.tabButton} ${activeTab === 'adjust' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab(activeTab === 'adjust' ? null : 'adjust')} disabled={sending || isVideo}>
                  <Sliders size={14} /><span>Adjust</span>
                </button>
                <button type="button" className={`${styles.tabButton} ${activeTab === 'crop' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab(activeTab === 'crop' ? null : 'crop')} disabled={sending || isVideo}>
                  <Crop size={14} /><span>Crop</span>
                </button>
                <button type="button" className={`${styles.tabButton} ${activeTab === 'markup' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab('markup')} disabled={sending || isVideo}>
                  <Pencil size={14} /><span>Markup</span>
                </button>
              </div>

              <div className={styles.controlsRow}>
                <div className={styles.qualityToggle} role="group" aria-label="Quality">
                  <button type="button" className={`${styles.qualityOption} ${quality === 'sd' ? styles.qualityOptionActive : ''}`} onClick={() => setQuality('sd')} aria-pressed={quality === 'sd'} disabled={sending}>SD</button>
                  <button type="button" className={`${styles.qualityOption} ${quality === 'hd' ? styles.qualityOptionActive : ''}`} onClick={() => setQuality('hd')} aria-pressed={quality === 'hd'} disabled={sending}>HD</button>
                </div>
                <div className={styles.disappearHint} title="Disappearing is controlled by chat settings">
                  <Timer size={14} /><span>Auto-delete follows chat setting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Timer, Sliders, Crop, Pencil } from 'lucide-react';
import { AdjustmentPanel } from './AdjustmentPanel';
import { Adjustments, DEFAULT_ADJUSTMENTS, isDefaultAdjustments, cssFilterFromAdjustments, exportImage, Stroke, BrushType } from '../../utils/mediaEditor';
import { CaptionInput } from './CaptionInput';
import styles from './MediaEditor.module.css';
import { CropModal } from './CropModal';
import { MarkupCanvas, MarkupCanvasHandle } from './MarkupCanvas';
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

  const [currentFile, setCurrentFile] = useState<File>(file);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentDims, setCurrentDims] = useState<{ w: number; h: number } | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [markupColor, setMarkupColor] = useState('#ef4444');
  const [markupBrush, setMarkupBrush] = useState<BrushType>('pen');
  const [markupSize, setMarkupSize] = useState(8);
  const markupCanvasRef = useRef<MarkupCanvasHandle>(null);

  const isVideo = file.type.startsWith('video/');
  const prevUrlRef = useRef<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(currentFile);
    setCurrentUrl(url);

    if (isVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => setCurrentDims({ w: video.videoWidth, h: video.videoHeight });
    } else {
      const img = new Image();
      img.onload = () => setCurrentDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
    }

    // No URL.revokeObjectURL — let GC handle it. Revoking causes ERR_FILE_NOT_FOUND.
  }, [currentFile, isVideo]);

  const handleConfirm = async () => {
    if (sending) return;
    setSending(true);
    try {
      let finalFile = currentFile;
      if (!isVideo && !isDefaultAdjustments(adjustments)) {
        finalFile = await exportImage(currentFile, {
          crop: null,
          rotation: 0,
          adjustments,
          markup: null,
        });
      }
      onConfirm({ file: finalFile, quality, caption: caption.trim() });
    } catch (err) {
      console.error('[MediaEditor] Send failed:', err);
      setSending(false);
    }
  };

  return (
    <>
      {/* 1. MARKUP STUDIO (full-screen) */}
      {activeTab === 'markup' && !isVideo && currentDims && (
        <div className={styles.markupFullscreenOverlay}>
          <div className={styles.markupImageContainer}>
              <MarkupCanvas
                ref={markupCanvasRef}
                imageUrl={currentUrl}
                naturalW={currentDims.w}
                naturalH={currentDims.h}
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
            onDone={async () => {
              const latestStrokes = markupCanvasRef.current?.getStrokes() ?? [];
              if (latestStrokes.length > 0) {
                try {
                  const markedUpFile = await exportImage(currentFile, {
                    crop: null,
                    rotation: 0,
                    adjustments: DEFAULT_ADJUSTMENTS,
                    markup: latestStrokes,
                  });
                  setCurrentFile(markedUpFile);
                  setStrokes([]);
                } catch (err) {
                  console.error('Markup export failed', err);
                }
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

      {/* 2. CROP MODAL (full-screen, sibling to everything else) */}
      {activeTab === 'crop' && !isVideo && currentDims && (
        <CropModal
          imageUrl={currentUrl}
                onCropComplete={(croppedFile) => {
                  setCurrentFile(croppedFile);
                  setActiveTab(null);
                }}
          onCancel={() => setActiveTab(null)}
          disabled={sending}
        />
      )}

      {/* 3. STANDARD MEDIA EDITOR (hidden when crop or markup is active) */}
      {activeTab !== 'markup' && activeTab !== 'crop' && (
        <div className={styles.overlay} onClick={() => { if (!sending) onCancel(); }}>
          <div className={styles.container} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <button type="button" className={styles.cancelBtn} onClick={() => { if (!sending) onCancel(); }} aria-label="Cancel">
                <X size={20} />
              </button>
              <span className={styles.headerTitle}>Send Media</span>
              <button type="button" className={styles.sendBtn} onClick={handleConfirm} disabled={sending || !currentDims} aria-label="Send">
                {sending ? 'Sending...' : <><Send size={16} /><span>Send</span></>}
              </button>
            </div>

            <div className={styles.previewArea}>
              {isVideo ? (
                <video src={currentUrl} className={styles.media} controls playsInline autoPlay muted />
              ) : (
                <img
                  key={currentUrl}
                  src={currentUrl}
                  alt="Preview"
                  className={styles.media}
                  style={!isDefaultAdjustments(adjustments) ? { filter: cssFilterFromAdjustments(adjustments) } : undefined}
                />
              )}
            </div>

            {activeTab === 'adjust' && !isVideo && (
              <AdjustmentPanel adjustments={adjustments} onChange={setAdjustments} disabled={sending} />
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

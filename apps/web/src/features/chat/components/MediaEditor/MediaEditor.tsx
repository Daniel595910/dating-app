import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Timer, Sliders, Crop, Pencil } from 'lucide-react';
import { AdjustmentPanel } from './AdjustmentPanel';
import { Adjustments, DEFAULT_ADJUSTMENTS, isDefaultAdjustments, cssFilterFromAdjustments, exportImage, Stroke, BrushType, TrimRange } from '../../utils/mediaEditor';
import { CaptionInput } from './CaptionInput';
import styles from './MediaEditor.module.css';
import { CropModal } from './CropModal';
import { MarkupCanvas, MarkupCanvasHandle } from './MarkupCanvas';
import { MarkupToolbar } from './MarkupToolbar';
import { TrimStrip } from './TrimStrip';

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
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setCurrentDims({ w: video.videoWidth, h: video.videoHeight });
        } else {
          setCurrentDims({ w: 1, h: 1 });
        }
      };
      video.onerror = () => {
        setCurrentDims({ w: 1, h: 1 });
      };
      video.src = url;
      video.load();
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

      {/* 1b. ADJUST SUB-MODAL (bottom sheet) */}
      {/* ADJUST SUB-MODAL */}
      {activeTab === 'adjust' && !isVideo && (
        <AdjustmentPanel
          imageUrl={currentUrl}
          adjustments={adjustments}
          onChange={setAdjustments}
          onDone={() => setActiveTab(null)}
          disabled={sending}
        />
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
      {activeTab !== 'markup' && activeTab !== 'crop' && activeTab !== 'adjust' && (
        <div className={styles.overlay} onClick={() => { if (!sending) onCancel(); }}>
          <div className={styles.container} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <div style={{ width: 36, height: 36 }} />
              <span className={styles.headerTitle}>Send Media</span>
              <button type="button" className={styles.cancelBtn} onClick={() => { if (!sending) onCancel(); }} aria-label="Cancel">
                <X size={20} />
              </button>
            </div>

            <div className={styles.previewArea}>
              {isVideo ? (
                <VideoPlayer src={currentUrl} />
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
            <div className={styles.footer}>
              <div className={styles.captionRow}>
                <CaptionInput value={caption} onChange={setCaption} disabled={sending} />
                <button type="button" className={styles.inlineSendBtn} onClick={handleConfirm} disabled={sending || !currentDims} aria-label="Send">
                  {sending ? (
                    <div className={styles.spinner} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>

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

// ============================================================================
// VideoPlayer sub-component (Phase 1 — custom controls, no trim yet)
// ============================================================================

interface VideoPlayerProps {
  src: string;
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 0 });
  const hideChromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-play muted on mount (matches previous behaviour)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = true;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [src]);

  // Fade out chrome while playing — user can tap video to bring it back
  useEffect(() => {
    if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
    if (playing) {
      hideChromeTimer.current = setTimeout(() => setShowChrome(false), 2000);
    } else {
      setShowChrome(true);
    }
    return () => {
      if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
    };
  }, [playing]);

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    // If playhead has passed the trim end, loop back to trim start
    if (v.currentTime >= trimRange.end && trimRange.end > 0) {
      v.pause();
      v.currentTime = trimRange.start;
      setCurrentTime(trimRange.start);
      setPlaying(false);
      return;
    }
    setCurrentTime(v.currentTime);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration || 0;
    setDuration(d);
    setTrimRange({ start: 0, end: Math.min(d, 60) });
  };

  const handleVideoClick = () => {
    // Toggle play/pause
    handlePlayPause();
    // Show chrome briefly on any click
    setShowChrome(true);
    if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
    if (!videoRef.current?.paused) {
      hideChromeTimer.current = setTimeout(() => setShowChrome(false), 2000);
    }
  };

  const seekTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    v.currentTime = ratio * duration;
    setCurrentTime(v.currentTime);
  };

  const handleScrubDown = (e: React.PointerEvent<HTMLDivElement>) => {
    seekTo(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    setShowChrome(true);
    if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
  };

  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    seekTo(e);
  };

  const handleScrubUp = () => {
    if (!videoRef.current?.paused) {
      hideChromeTimer.current = setTimeout(() => setShowChrome(false), 2000);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.videoPlayerWrapper}>
      <video
        ref={videoRef}
        src={src}
        className={styles.videoElement}
        playsInline
        muted
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        onClick={handleVideoClick}
      />

      {/* Play/pause overlay button */}
      <button
        type="button"
        className={`${styles.videoCenterBtn} ${playing && !showChrome ? styles.videoCenterBtnHidden : ''}`}
        onClick={handlePlayPause}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      {/* Duration badge */}
      <div className={`${styles.videoDurationBadge} ${playing && !showChrome ? styles.videoDurationBadgeHidden : ''}`}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Trim strip (replaces scrub bar) */}
      {duration > 0 && (
        <TrimStrip
          videoUrl={src}
          duration={duration}
          trimRange={trimRange}
          currentTime={currentTime}
          onChange={setTrimRange}
          onSeek={(t) => {
            const v = videoRef.current;
            if (v) {
              v.currentTime = t;
              setCurrentTime(t);
            }
          }}
          disabled={false}
          maxTrimSeconds={60}
        />
      )}
    </div>
  );
};

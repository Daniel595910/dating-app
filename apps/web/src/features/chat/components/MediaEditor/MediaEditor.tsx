import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Timer, Sliders, Crop, Pencil, Plus } from 'lucide-react';
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
  isLast: boolean;
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
  const [edits, setEdits] = useState<Record<number, { file: File; adjustments: Adjustments }>>({});
  const [activeTab, setActiveTab] = useState<'adjust' | 'crop' | 'markup' | null>(null);

  const [currentFile, setCurrentFile] = useState<File>(file);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentDims, setCurrentDims] = useState<{ w: number; h: number } | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [markupColor, setMarkupColor] = useState('#ef4444');
  const [markupBrush, setMarkupBrush] = useState<BrushType>('pen');
  const [markupSize, setMarkupSize] = useState(8);
  const markupCanvasRef = useRef<MarkupCanvasHandle>(null);
  const [files, setFiles] = useState<File[]>([file]);
  const [activeIndex, setActiveIndex] = useState(0);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const [thumbUrls, setThumbUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const isVid = (f: File) => f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|quicktime|avi|mkv)$/i.test(f.name);
    const extract = (f: File): Promise<string> => {
      if (!isVid(f)) {
        return Promise.resolve(URL.createObjectURL(f));
      }
      return new Promise<string>((resolve) => {
        const videoUrl = URL.createObjectURL(f);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.playsInline = true;
        let settled = false;
        const finish = (result: string) => {
          if (settled) return;
          settled = true;
          URL.revokeObjectURL(videoUrl);
          resolve(result);
        };
        const fail = () => {
          if (settled) return;
          settled = true;
          URL.revokeObjectURL(videoUrl);
          resolve('');
        };
        v.onloadeddata = () => {
          v.currentTime = 0.1;
        };
        v.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = v.videoWidth || 320;
            canvas.height = v.videoHeight || 240;
            const ctx = canvas.getContext('2d');
            if (!ctx) { fail(); return; }
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            finish(dataUrl);
          } catch {
            fail();
          }
        };
        v.onerror = fail;
        setTimeout(fail, 3000);
        v.src = videoUrl;
      });
    };
    Promise.all(files.map(extract)).then((results) => {
      if (!cancelled) setThumbUrls(results);
    });
    return () => {
      cancelled = true;
      setThumbUrls((prev) => {
        prev.forEach((u) => {
          if (u && u.startsWith('blob:')) URL.revokeObjectURL(u);
        });
        return [];
      });
    };
  }, [files]);

  const handleAddMore = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const room = 4 - files.length;
    if (room <= 0) return;
    const toAdd: File[] = [];
    for (let i = 0; i < picked.length && toAdd.length < room; i++) {
      const f = picked[i];
      const isVideo = f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|quicktime|avi|mkv)$/i.test(f.name);
      const isImage = f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(f.name);
      const isHeic = /\.(heic|heif)$/i.test(f.name) || f.type === 'image/heic' || f.type === 'image/heif';
      if (isHeic) continue;
      if (!isVideo && !isImage) continue;
      if (isImage && f.size > 20 * 1024 * 1024) continue;
      if (isVideo && f.size > 100 * 1024 * 1024) continue;
      toAdd.push(f);
    }
    if (toAdd.length > 0) setFiles(prev => [...prev, ...toAdd]);
    if (addMoreInputRef.current) addMoreInputRef.current.value = '';
  };

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < files.length) {
      const saved = edits[activeIndex];
      setCurrentFile(saved?.file || files[activeIndex]);
      setAdjustments(saved?.adjustments || { ...DEFAULT_ADJUSTMENTS });
    }
  }, [activeIndex, files, edits]);

  const handleRemoveFile = (i: number) => {
    if (files.length <= 1) {
      onCancel();
      return;
    }
    const next = files.slice(0, i).concat(files.slice(i + 1));
    setEdits((prev) => {
      const remapped: typeof prev = {};
      for (const key of Object.keys(prev)) {
        const k = Number(key);
        if (k < i) remapped[k] = prev[k];
        else if (k > i) remapped[k - 1] = prev[k];
      }
      return remapped;
    });
    if (i < activeIndex) {
      setActiveIndex(activeIndex - 1);
    } else if (i === activeIndex) {
      setActiveIndex(Math.min(activeIndex, next.length - 1));
    }
    setFiles(next);
  };

  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|quicktime|avi|mkv)$/i.test(file.name);
  const currentIsVideo = currentFile.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|quicktime|avi|mkv)$/i.test(currentFile.name);
  const prevUrlRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    setCurrentUrl('');
    setCurrentDims(null);

    const objectUrl = URL.createObjectURL(currentFile);
    setCurrentUrl(objectUrl);

    if (currentIsVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () => {
        if (cancelled) return;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setCurrentDims({ w: video.videoWidth, h: video.videoHeight });
        }
      };
      video.onerror = () => {
        if (cancelled) return;
        console.error('[MediaEditor] Video metadata decode failed. Codec may need server transcode.');
        setCurrentDims({ w: 1, h: 1 });
      };
      video.src = objectUrl;
      video.load();
    } else {
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setCurrentDims({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => {
        if (!cancelled) {
          console.error('[MediaEditor] Image failed to decode. File may be HEIC or corrupt.');
          setCurrentDims({ w: 1, h: 1 });
        }
      };
      img.src = objectUrl;
    }

    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [currentFile, currentIsVideo]);

  const handleConfirm = async () => {
    if (sending) return;
    setSending(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const edited = edits[i];
        const f = edited?.file || files[i];
        const adj = edited?.adjustments || { ...DEFAULT_ADJUSTMENTS };
        const fIsVideo = f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|quicktime|avi|mkv)$/i.test(f.name);
        let finalFile = f;
        if (!fIsVideo && !isDefaultAdjustments(adj)) {
          finalFile = await exportImage(f, {
            crop: null,
            rotation: 0,
            adjustments: adj,
            markup: null,
          });
        }
        onConfirm({
          file: finalFile,
          quality,
          caption: i === files.length - 1 ? caption.trim() : '',
          isLast: i === files.length - 1,
        });
      }
    } catch (err) {
      console.error('[MediaEditor] Send failed:', err);
      setSending(false);
    }
  };

  return (
    <>
      {/* 1. MARKUP STUDIO (full-screen) */}
      {activeTab === 'markup' && !currentIsVideo && currentDims && (
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
                  setEdits((prev) => ({
                    ...prev,
                    [activeIndex]: { file: markedUpFile, adjustments: { ...adjustments } },
                  }));
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
      {activeTab === 'adjust' && !currentIsVideo && (
        <AdjustmentPanel
          imageUrl={currentUrl}
          adjustments={adjustments}
          onChange={(adj) => {
            setAdjustments(adj);
            setEdits((prev) => ({
              ...prev,
              [activeIndex]: { file: currentFile, adjustments: adj },
            }));
          }}
          onDone={() => setActiveTab(null)}
          disabled={sending}
        />
      )}
      {/* 2. CROP MODAL (full-screen, sibling to everything else) */}
      {activeTab === 'crop' && !currentIsVideo && currentDims && (
        <CropModal
          imageUrl={currentUrl}
                onCropComplete={(croppedFile) => {
                  setCurrentFile(croppedFile);
                  setEdits((prev) => ({
                    ...prev,
                    [activeIndex]: { file: croppedFile, adjustments: { ...adjustments } },
                  }));
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
              {currentIsVideo ? (
                <VideoPlayer key={currentUrl} src={currentUrl} />
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
            {files.length > 1 && (
              <div className={styles.thumbStrip}>
                {files.map((f, i) => (
                  <div
                    key={i}
                      className={`${styles.thumb} ${i === activeIndex ? styles.thumbActive : ''}`}
                    onClick={() => setActiveIndex(i)}
                  >
                    {thumbUrls[i] && (
                      <img src={thumbUrls[i]} alt="" className={styles.thumbImg} />
                    )}
                    <button
                      type="button"
                      className={styles.thumbRemove}
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                      disabled={sending}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.footer}>
              <div className={styles.captionRow}>
                <CaptionInput value={caption} onChange={setCaption} disabled={sending} />
                <button
                  type="button"
                  className={styles.addMoreBtn}
                  onClick={() => addMoreInputRef.current?.click()}
                  disabled={sending || files.length >= 4}
                  aria-label="Add more media"
                >
                  <Plus size={20} />
                </button>
                <input
                  ref={addMoreInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleAddMore(e.target.files)}
                  style={{ display: 'none' }}
                />
                <button type="button" className={styles.inlineSendBtn} onClick={handleConfirm} disabled={sending || !currentDims} aria-label="Send">
                  {sending ? (
                    <div className={styles.spinner} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>

              <div className={styles.tabBar}>
                <button type="button" className={`${styles.tabButton} ${activeTab === 'adjust' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab(activeTab === 'adjust' ? null : 'adjust')} disabled={sending || currentIsVideo}>
                  <Sliders size={14} /><span>Adjust</span>
                </button>
                <button type="button" className={`${styles.tabButton} ${activeTab === 'crop' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab(activeTab === 'crop' ? null : 'crop')} disabled={sending || currentIsVideo}>
                  <Crop size={14} /><span>Crop</span>
                </button>
                <button type="button" className={`${styles.tabButton} ${activeTab === 'markup' ? styles.tabButtonActive : ''}`} onClick={() => setActiveTab('markup')} disabled={sending || currentIsVideo}>
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
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [muted, setMuted] = useState(true);
  const hideChromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Attach src via useEffect — some browsers (iOS Safari) need this after mount
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setLoadState('loading');
    setErrorMessage('');
    setDuration(0);
    setCurrentTime(0);
    setPlaying(false);

    v.pause();
    v.removeAttribute('src');
    v.load();
    v.src = src;
    v.load();

    const onLoadedMetadata = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
      }
      setLoadState('ready');
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    const onError = () => {
      const err = v.error;
      let msg = 'This video format is not supported on this device.';
      if (err) {
        switch (err.code) {
          case 1: msg = 'Video loading was aborted.'; break;
          case 2: msg = 'Network error while loading video.'; break;
          case 3: msg = 'This video format is not supported on this device.'; break;
          case 4: msg = 'This video format is not supported by your browser (likely H.265/HEVC or MOV). Try converting to MP4 (H.264) first.'; break;
        }
      }
      setErrorMessage(msg);
      setLoadState('error');
    };

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('error', onError);

    return () => {
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('error', onError);
      try { v.pause(); } catch { /* ignore */ }
    };
  }, [src]);

  // Fade out chrome while playing
  useEffect(() => {
    if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
    if (playing && loadState === 'ready') {
      hideChromeTimer.current = setTimeout(() => setShowChrome(false), 2000);
    } else {
      setShowChrome(true);
    }
    return () => {
      if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
    };
  }, [playing, loadState]);

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v || loadState !== 'ready') return;
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
    setCurrentTime(v.currentTime);
  };

  const handleVideoClick = () => {
    if (loadState !== 'ready') return;
    handlePlayPause();
    setShowChrome(true);
    if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
    if (!videoRef.current?.paused) {
      hideChromeTimer.current = setTimeout(() => setShowChrome(false), 2000);
    }
  };

  const seekTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration || loadState !== 'ready') return;
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

  if (loadState === 'error') {
    return (
      <div className={styles.videoPlayerWrapper}>
        <div className={styles.videoErrorState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className={styles.videoErrorMessage}>{errorMessage}</div>
          <div className={styles.videoErrorHint}>Try sending a different video or a photo instead.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.videoPlayerWrapper}>
      <video
        ref={videoRef}
        className={styles.videoElement}
        playsInline
        muted={muted}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        onClick={handleVideoClick}
      />

      {loadState === 'loading' && (
        <div className={styles.videoLoadingOverlay}>
          <div className={styles.videoLoadingSpinner} />
        </div>
      )}

      {loadState === 'ready' && (
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
      )}

      {loadState === 'ready' && (
        <div className={`${styles.videoDurationBadge} ${playing && !showChrome ? styles.videoDurationBadgeHidden : ''}`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      )}

      {loadState === 'ready' && (
        <button
          type="button"
          className={`${styles.videoMuteBtn} ${playing && !showChrome ? styles.videoMuteBtnHidden : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            const next = !muted;
            setMuted(next);
            if (videoRef.current) videoRef.current.muted = next;
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      )}

      {loadState === 'ready' && (
        <div
          className={styles.videoProgressBar}
          onPointerDown={handleScrubDown}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubUp}
          onPointerCancel={handleScrubUp}
        >
          <div className={styles.videoProgressTrack}>
            <div className={styles.videoProgressFill} style={{ width: `${progress}%` }} />
            <div className={styles.videoProgressThumb} style={{ left: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};



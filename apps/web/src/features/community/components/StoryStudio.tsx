import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Camera, Image as ImageIcon, Video, RefreshCw,
  Loader2, Zap, ZapOff, Type, Square,
} from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { mediaService } from '../services/media.service';
import styles from '../styles/StoryStudio.module.css';

interface StoryStudioProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onStoryCreated: () => void;
}

type Stage = 'capture' | 'edit' | 'preview';
type Mode = 'photo' | 'video';
type FacingMode = 'user' | 'environment';

interface Draft {
  url: string;
  file: File;
  type: 'image' | 'video';
  durationSeconds: number | null;
}

const MAX_VIDEO_SECONDS = 15;
const MAX_OVERLAY_CHARS = 140;

function pickVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of candidates) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* ignore */ }
  }
  return '';
}

export const StoryStudio: React.FC<StoryStudioProps> = ({
  open,
  onClose,
  userId,
  onStoryCreated,
}) => {
  const [stage, setStage] = useState<Stage>('capture');
  const [mode, setMode] = useState<Mode>('photo');
  const [facing, setFacing] = useState<FacingMode>('environment');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [textOverlay, setTextOverlay] = useState('');
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [cameraState, setCameraState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastPickedThumb, setLastPickedThumb] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordSecondsRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
      streamRef.current = null;
    }
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
  }, []);

  const stopRecordingTimers = useCallback(() => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
  }, []);

  const startCamera = useCallback(async (mode: FacingMode) => {
    setCameraState('loading');
    setCameraError('');
    stopStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API unavailable');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === 'environment' ? { ideal: 'environment' } : 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      // Inspect track capabilities for torch + log actual resolution
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(Boolean(caps?.torch));
      setTorchOn(false);
      const settings = track?.getSettings?.();
      console.info('[camera] actual', { w: settings?.width, h: settings?.height, fps: settings?.frameRate, torch: caps?.torch });
      setCameraState('ready');
    } catch (err: any) {
      const name = err?.name || '';
      let msg = 'Camera unavailable. Pick from your library instead.';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        msg = 'Camera access denied. Pick from your library instead.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        msg = 'No camera found. Pick from your library instead.';
      } else if (name === 'NotReadableError') {
        msg = 'Camera is in use by another app. Pick from your library instead.';
      }
      setCameraError(msg);
      setCameraState('error');
    }
  }, [stopStream]);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStage('capture');
    setMode('photo');
    setFacing('environment');
    setDraft(null);
    setTextOverlay('');
    setShowTextPanel(false);
    setError(null);
    setUploading(false);
    setProgress(0);
    setRecording(false);
    setRecordSeconds(0);
    try {
      const saved = localStorage.getItem('storyStudio.lastPickerThumb');
      if (saved) setLastPickedThumb(saved);
    } catch { /* localStorage blocked */ }
    startCamera('environment');
    return () => {
      stopStream();
      stopRecordingTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup on close
  useEffect(() => {
    if (open) return;
    stopStream();
    stopRecordingTimers();
  }, [open, stopStream, stopRecordingTimers]);

  // Attach stream to rendered <video> after cameraState becomes ready
  useEffect(() => {
    if (cameraState !== 'ready') return;
    if (!videoPreviewRef.current || !streamRef.current) return;
    videoPreviewRef.current.srcObject = streamRef.current;
    videoPreviewRef.current.play().catch(() => { /* autoplay guard */ });
  }, [cameraState]);


  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) {
        if (recording) stopVideoRecording();
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uploading, recording, onClose]);

  if (!open) return null;

  const openPicker = () => {
    setError(null);
    // Release camera while library picker is open
    stopStream();
    if (mode === 'photo') imageInputRef.current?.click();
    else videoInputRef.current?.click();
  };

  const resumeCamera = () => {
    if (stage === 'capture' && cameraState !== 'ready') {
      startCamera(facing);
    } else if (stage === 'capture' && !streamRef.current) {
      startCamera(facing);
    }
  };

  const handleImage = (file: File) => {
    setError(null);
    const url = URL.createObjectURL(file);
    setDraft({ url, file, type: 'image', durationSeconds: null });
    setStage('edit');
    // Save a small preview of the picked photo for the gallery thumbnail
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          localStorage.setItem('storyStudio.lastPickerThumb', reader.result);
          setLastPickedThumb(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } catch { /* ignore */ }
  };

  const handleVideoFile = (file: File) => {
    setError(null);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const dur = Math.round(video.duration);
      URL.revokeObjectURL(video.src);
      if (!Number.isFinite(dur) || dur <= 0) {
        setError('Could not read video duration.');
        return;
      }
      if (dur > MAX_VIDEO_SECONDS) {
        setError(`Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter (this is ${dur}s).`);
        return;
      }
      setDraft({ url: URL.createObjectURL(file), file, type: 'video', durationSeconds: dur });
      setStage('edit');
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      setError('Could not load this video.');
    };
  };

  const onFile = (files: FileList | null, kind: 'image' | 'video') => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (kind === 'image') handleImage(file);
    else handleVideoFile(file);
  };

  // Photo capture from live stream
  const capturePhoto = () => {
    if (!videoPreviewRef.current) { console.warn('[capture] video ref null'); setError('Camera not ready. Try again.'); return; }
    const video = videoPreviewRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('[capture] videoWidth/Height 0', { w: video.videoWidth, h: video.videoHeight, readyState: video.readyState });
      setError('Camera not ready yet. Try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Capture failed.'); return; }
    // Mirror front-camera capture
    if (facing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) { setError('Capture failed.'); return; }
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `story-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
      stopStream();
      handleImage(file);
    }, 'image/jpeg', 0.92);
  };

  // Video record from live stream
  const startVideoRecording = () => {
    if (!streamRef.current) { setError('Camera not ready.'); return; }
    const mimeType = pickVideoMimeType();
    if (!mimeType) { setError('Video recording not supported in this browser.'); return; }

    // Need audio too for video — request a new stream with audio
    (async () => {
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing === 'environment' ? { ideal: 'environment' } : 'user',
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: { ideal: 9 / 16 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
        streamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
        setCameraState('ready');

        chunksRef.current = [];
        const rec = new MediaRecorder(stream, { mimeType });
        recorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `story-${Date.now()}.${ext}`, { type: mimeType });
          stopRecordingTimers();
          setRecording(false);
          setRecordSeconds(0);
          stopStream();
          // Use actual recorded duration
          setDraft({ url: URL.createObjectURL(file), file, type: 'video', durationSeconds: Math.max(1, recordSecondsRef.current) });
          setStage('edit');
        };
        rec.start();

        setRecording(true);
        setRecordSeconds(0);
        recordTimerRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
          recordSecondsRef.current = recordSecondsRef.current + 1;
        }, 1000);
        autoStopRef.current = setTimeout(() => {
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
          }
        }, MAX_VIDEO_SECONDS * 1000);
      } catch (err: any) {
        setError(err?.message || 'Could not start recording.');
        setRecording(false);
      }
    })();
  };

  const stopVideoRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      const rec = recorderRef.current;
      // Flush media chunks before stopping — prevents truncated files
      setTimeout(() => {
        try { if (rec && rec.state !== 'inactive') rec.stop(); } catch {}
      }, 300);
    }
    stopRecordingTimers();
  };

  const handleShutter = () => {
    if (cameraState !== 'ready') { openPicker(); return; }
    if (mode === 'photo') {
      capturePhoto();
    } else {
      if (recording) stopVideoRecording();
      else startVideoRecording();
    }
  };

  const flipCamera = async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    await startCamera(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    if (!caps?.torch) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch (err) {
      console.warn('[torch] failed', err);
    }
  };

  const resetToCapture = () => {
    if (draft?.url) URL.revokeObjectURL(draft.url);
    setDraft(null);
    setTextOverlay('');
    setShowTextPanel(false);
    setStage('capture');
    setError(null);
    // Reinit camera
    startCamera(facing);
  };

  const handlePublish = async () => {
    if (!draft || uploading) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const purpose = draft.type === 'image' ? 'story_image' : 'story_video';
      const result =
        draft.type === 'image'
          ? await mediaService.uploadImage(draft.file, userId, purpose)
          : await mediaService.uploadVideo(draft.file, userId, purpose, (p) => setProgress(p));

      if (!result.success || !result.media) {
        setError(result.error || 'Upload failed');
        setUploading(false);
        return;
      }

      const { error: insertErr } = await supabase.from('stories').insert({
        user_id: userId,
        media_url: result.media.url,
        media_type: draft.type,
        text_overlay: textOverlay.trim() || null,
        duration_seconds: draft.durationSeconds,
      });

      if (insertErr) {
        setError(insertErr.message || 'Failed to save story');
        setUploading(false);
        return;
      }

      setUploading(false);
      onStoryCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      setUploading(false);
    }
  };

  const timerLabel = recording
    ? `00:${recordSeconds.toString().padStart(2, '0')}`
    : '00:00';

  return (
    <div className={styles.overlay}>
      <div className={styles.studio}>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files, 'video')}
        />

        {/* Top bar */}
        <div className={styles.topBar}>
          <button
            className={styles.iconBtn}
            onClick={stage === 'capture' ? onClose : resetToCapture}
            aria-label={stage === 'capture' ? 'Close' : 'Back'}
            disabled={uploading}
          >
            <ArrowLeft size={20} />
          </button>

          <div className={styles.timerPill}>
            {recording && <span className={styles.recordingDot} />}
            {timerLabel}
          </div>

          <button
            className={`${styles.iconBtn} ${torchOn ? styles.iconBtnActive : ''}`}
            onClick={toggleTorch}
            disabled={!torchSupported || cameraState !== 'ready' || recording}
            aria-label={torchOn ? 'Turn off flash' : 'Turn on flash'}
            title={torchSupported ? (torchOn ? 'Turn off flash' : 'Turn on flash') : 'Flash not available on this device'}
          >
            {torchOn ? <Zap size={18} fill="currentColor" /> : <ZapOff size={18} />}
          </button>
        </div>

        {/* Camera area / preview */}
        <div className={styles.cameraArea}>
          {stage === 'capture' && (
            <>
              {cameraState === 'loading' && (
                <div className={styles.cameraLoading}>
                  <Loader2 size={28} className={styles.spin} />
                  <span>Starting camera…</span>
                </div>
              )}

              {cameraState === 'error' && (
                <div className={styles.cameraError}>
                  <Camera size={40} />
                  <p className={styles.cameraErrorTitle}>Camera unavailable</p>
                  <p className={styles.cameraErrorText}>{cameraError}</p>
                  <button className={styles.cameraErrorBtn} onClick={openPicker}>
                    Open library
                  </button>
                </div>
              )}

              {cameraState === 'ready' && (
                <video
                  ref={videoPreviewRef}
                  className={`${styles.cameraVideo} ${facing === 'environment' ? styles.cameraVideoRear : ''}`}
                  autoPlay
                  muted
                  playsInline
                  onClick={handleShutter}
                />
              )}

              {/* Self view PIP for front camera / decorative for rear */}
              {cameraState === 'ready' && (
                <div className={styles.selfView}>
                  {facing === 'environment' ? (
                    <Camera size={32} />
                  ) : (
                    <video
                      className={styles.selfViewVideo}
                      ref={(el) => {
                        if (el && streamRef.current) el.srcObject = streamRef.current;
                      }}
                      autoPlay
                      muted
                      playsInline
                    />
                  )}
                </div>
              )}
            </>
          )}

          {stage !== 'capture' && draft && (
              <>
                {/* Blurred background fill */}
                <div className={styles.blurFill} aria-hidden="true">
                  {draft.type === 'image' ? (
                    <img src={draft.url} alt="" className={styles.blurFillMedia} />
                  ) : (
                    <video src={draft.url} className={styles.blurFillMedia} autoPlay muted loop playsInline />
                  )}
                </div>
                {/* Foreground contained media */}
                {draft.type === 'image' ? (
                  <img src={draft.url} alt="" className={styles.cameraPreviewMedia} />
                ) : (
                  <video src={draft.url} className={styles.cameraPreviewMedia} autoPlay muted loop playsInline />
                )}
                {textOverlay && (
                  <div className={styles.textOverlayOnPreview}>{textOverlay}</div>
                )}
              </>
          )}

          {stage === 'edit' && showTextPanel && (
            <div className={styles.overlayPanel}>
              <textarea
                className={styles.overlayTextArea}
                placeholder="Add text to your story…"
                value={textOverlay}
                maxLength={MAX_OVERLAY_CHARS}
                onChange={(e) => setTextOverlay(e.target.value)}
                rows={2}
                autoFocus
              />
              <div className={styles.overlayCharCount}>
                {textOverlay.length} / {MAX_OVERLAY_CHARS}
              </div>
            </div>
          )}

          {stage === 'edit' && !showTextPanel && (
            <button
              className={styles.editTextBtn}
              onClick={() => setShowTextPanel(true)}
            >
              <Type size={14} />
              {textOverlay ? 'Edit text' : 'Add text'}
            </button>
          )}
        </div>

        {/* Bottom bar */}
        {stage === 'capture' && (
          <>
            <div className={styles.bottomBar}>
              <button
                className={styles.libraryThumb}
                onClick={openPicker}
                aria-label="Open library"
              >
                {lastPickedThumb ? (
                  <img src={lastPickedThumb} alt="" />
                ) : (
                  <ImageIcon size={22} />
                )}
              </button>

              <button
                className={`${styles.shutterBtn} ${recording ? styles.shutterRecording : ''}`}
                onClick={handleShutter}
                aria-label={mode === 'video' && recording ? 'Stop recording' : 'Capture'}
              >
                <div className={styles.shutterInner} aria-hidden="true">
                  {mode === 'video' && recording && (
                    <Square size={28} fill="#fff" color="#fff" />
                  )}
                </div>
              </button>

              <button
                className={styles.flipBtn}
                onClick={flipCamera}
                disabled={cameraState !== 'ready' || recording}
                aria-label="Flip camera"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            <div className={styles.modeTabs}>
              <button className={styles.modeTab} disabled>Live</button>
              <button
                className={`${styles.modeTab} ${mode === 'photo' ? styles.modeTabActive : ''}`}
                onClick={() => { if (!recording) setMode('photo'); }}
                disabled={recording}
              >
                Photo
              </button>
              <button
                className={`${styles.modeTab} ${mode === 'video' ? styles.modeTabActive : ''}`}
                onClick={() => { if (!recording) setMode('video'); }}
                disabled={recording}
              >
                Video
              </button>
            </div>
          </>
        )}

        {stage === 'edit' && (
          <div className={styles.publishBar}>
            <button
              className={styles.cancelBtn}
              onClick={resetToCapture}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              className={styles.publishBtn}
              onClick={() => { setShowTextPanel(false); setStage('preview'); }}
              disabled={uploading}
            >
              Preview
            </button>
          </div>
        )}

        {stage === 'preview' && (
          <div className={styles.publishBar}>
            <button
              className={styles.cancelBtn}
              onClick={() => setStage('edit')}
              disabled={uploading}
            >
              Back
            </button>
            <button
              className={styles.publishBtn}
              onClick={handlePublish}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className={styles.spin} />
                  Publishing…
                </>
              ) : (
                'Publish Story'
              )}
            </button>
          </div>
        )}

        {error && <div className={styles.errorToast}>{error}</div>}

        {uploading && (
          <div className={styles.progressOverlay}>
            <div className={styles.progressBarOuter}>
              <div className={styles.progressBarInner} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressLabel}>
              {draft?.type === 'video' ? `Uploading… ${progress}%` : 'Publishing…'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

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

  // Platform detection: iOS records mp4 (WebKit only), Android records webm (reliable)
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const candidates = isIOS
    ? ['video/mp4']
    : [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
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
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [filterId, setFilterId] = useState<'normal'|'warm'|'cool'|'bw'|'vivid'|'fade'>('normal');
  const [speed, setSpeed] = useState(1);
  const FILTERS = [
    { id: 'normal' as const, label: 'Normal', css: 'none' },
    { id: 'warm' as const, label: 'Warm', css: 'sepia(0.2) saturate(1.3) hue-rotate(-10deg)' },
    { id: 'cool' as const, label: 'Cool', css: 'saturate(1.1) hue-rotate(15deg) brightness(1.05)' },
    { id: 'bw' as const, label: 'B&W', css: 'grayscale(1) contrast(1.1)' },
    { id: 'vivid' as const, label: 'Vivid', css: 'saturate(1.5) contrast(1.1)' },
    { id: 'fade' as const, label: 'Fade', css: 'saturate(0.7) brightness(1.15) contrast(0.9)' },
  ];

  const SPEEDS = [0.5, 1, 1.5, 2];
  const [previewVideoRef, setPreviewVideoRef] = useState<HTMLVideoElement | null>(null);
  const [speedPickerOpen, setSpeedPickerOpen] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordRafRef = useRef<number | null>(null);
  const recordDestStreamRef = useRef<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordSecondsRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const torchOnRef = useRef(false);

  useEffect(() => { torchOnRef.current = torchOn; }, [torchOn]);

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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          zoom: { ideal: 1 },
          focusMode: { ideal: 'continuous' },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      // Inspect track capabilities for torch + log actual resolution
      const track = stream.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() || {}) as any;
      const settings = track?.getSettings?.() || {};
      console.info('[camera] actual', { w: settings.width, h: settings.height, fps: settings.frameRate, torch: caps.torch });

      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const torchOk = !isIOS && mode === 'environment' && caps?.torch === true;
      setTorchSupported(torchOk);
      if (!torchOk) setTorchOn(false);

      if (torchOnRef.current && torchOk && track) {
        try { await track.applyConstraints({ advanced: [{ torch: true } as any] }); }
        catch { /* ignore */ }
      }
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

  // Initialize trim range once per draft — do NOT reset on <video> remount
  useEffect(() => {
    if (!draft || draft.type !== 'video') return;
    const d = draft.durationSeconds;
    if (d && d > 0) {
      setTrimEnd(d);
      setTrimStart(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.url]);

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
    stopStream();
    mediaInputRef.current?.click();
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

  const onFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (file.type.startsWith('video/')) handleVideoFile(file);
    else handleImage(file);
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

    // Portrait-locked canvas: 1080x1920, center-cropped from the landscape sensor
    const TARGET_W = 1080;
    const TARGET_H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Capture failed.'); return; }

    // Center-crop math: fit the landscape source into a portrait target
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const targetAspect = TARGET_W / TARGET_H;
    const srcAspect = srcW / srcH;
    let cropW, cropH, cropX, cropY;
    if (srcAspect > targetAspect) {
      // Source is wider than target — crop sides
      cropH = srcH;
      cropW = srcH * targetAspect;
      cropX = (srcW - cropW) / 2;
      cropY = 0;
    } else {
      // Source is taller than target — crop top/bottom
      cropW = srcW;
      cropH = srcW / targetAspect;
      cropX = 0;
      cropY = (srcH - cropH) / 2;
    }

    if (facing === 'user') {
      ctx.translate(TARGET_W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, TARGET_W, TARGET_H);

    canvas.toBlob((blob) => {
      if (!blob) { setError('Capture failed.'); return; }
      const file = new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopStream();
      handleImage(file);
    }, 'image/jpeg', 0.92);
  };

  // Video record from live stream
  const startVideoRecording = () => {
    if (!streamRef.current) { setError('Camera not ready.'); return; }
    const livePreview = videoPreviewRef.current;
    if (!livePreview || !livePreview.videoWidth || !livePreview.videoHeight) {
      setError('Camera not ready yet. Try again.');
      return;
    }
    const mimeType = pickVideoMimeType();
    if (!mimeType) { setError('Video recording not supported in this browser.'); return; }

    (async () => {
      try {
        // IMPORTANT: do NOT call stopStream() here — that is what caused the blackout.
        // We record from the already-live <video> element via canvas, so the preview
        // stays visible the whole time.

        // Portrait-locked canvas 1080x1920
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setError('Canvas unavailable.'); return; }
        recordCanvasRef.current = canvas;

        const drawFrame = () => {
          // Use the live preview element every frame — it never goes away
          const src = videoPreviewRef.current;
          if (!src || !src.videoWidth || !src.videoHeight) {
            recordRafRef.current = requestAnimationFrame(drawFrame);
            return;
          }
          const srcW = src.videoWidth;
          const srcH = src.videoHeight;
          const targetAspect = 1080 / 1920;
          const srcAspect = srcW / srcH;
          let cropW: number, cropH: number, cropX: number, cropY: number;
          if (srcAspect > targetAspect) {
            cropH = srcH; cropW = srcH * targetAspect; cropX = (srcW - cropW) / 2; cropY = 0;
          } else {
            cropW = srcW; cropH = srcW / targetAspect; cropX = 0; cropY = (srcH - cropH) / 2;
          }
          if (facing === 'user') {
            ctx.save();
            ctx.translate(1080, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, 1080, 1920);
            ctx.restore();
          } else {
            ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, 1080, 1920);
          }
          recordRafRef.current = requestAnimationFrame(drawFrame);
        };
        recordRafRef.current = requestAnimationFrame(drawFrame);

        // Canvas video track + a SEPARATE audio-only stream (never touches the preview)
        const canvasStream = canvas.captureStream(30);
        let audioOnlyStream: MediaStream | null = null;
        try {
          audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const audioTrack = audioOnlyStream.getAudioTracks()[0];
          if (audioTrack) canvasStream.addTrack(audioTrack);
        } catch (audioErr) {
          console.warn('[record] audio unavailable, recording silent video', audioErr);
        }

        recordDestStreamRef.current = canvasStream;

        chunksRef.current = [];
        const rec = new MediaRecorder(canvasStream, { mimeType });
        recorderRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          if (recordRafRef.current !== null) { cancelAnimationFrame(recordRafRef.current); recordRafRef.current = null; }
          // Stop ONLY the recording-side tracks. The preview stream is untouched.
          try { canvasStream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
          if (audioOnlyStream) { try { audioOnlyStream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ } }
          recordDestStreamRef.current = null;
          stopRecordingTimers();
          setRecording(false);
          setRecordSeconds(0);
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], 'story-' + Date.now() + '.' + ext, { type: mimeType });
          setDraft({ url: URL.createObjectURL(file), file, type: 'video', durationSeconds: Math.max(1, recordSecondsRef.current) });
          setStage('edit');
        };
        rec.start();

        setRecording(true);
        setRecordSeconds(0);
        recordSecondsRef.current = 0;
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
        if (recordRafRef.current !== null) { cancelAnimationFrame(recordRafRef.current); recordRafRef.current = null; }
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
    const next = !torchOn;
    try {
      await track.applyConstraints({ torch: next } as any);
      setTorchOn(next);
      return;
    } catch { /* fall through */ }
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch (err) {
      console.warn('[torch] both attempts failed', err);
      setTorchSupported(false);
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
        metadata: {
          filter: filterId,
          speed,
          trim_start: trimStart,
          trim_end: trimEnd || draft.durationSeconds || 0,
        },
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
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={(e) => onFile(e.target.files)}
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

          {torchSupported ? (
            <button
              className={`${styles.iconBtn} ${torchOn ? styles.iconBtnActive : ''}`}
              onClick={toggleTorch}
              disabled={cameraState !== 'ready'}
              aria-label={torchOn ? 'Turn off flash' : 'Turn on flash'}
              title={torchOn ? 'Turn off flash' : 'Turn on flash'}
            >
              {torchOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
            </button>
          ) : (
            <button
              className={styles.iconBtn}
              disabled
              aria-label="Flash unavailable on this camera"
              title="Flash unavailable on this camera"
            >
              <ZapOff size={20} />
            </button>
          )}
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
              {/* Foreground contained media with filter applied */}
              {draft.type === 'image' ? (
                <img
                  src={draft.url}
                  alt=""
                  className={styles.cameraPreviewMedia}
                  style={{ filter: FILTERS.find((f) => f.id === filterId)?.css || 'none' }}
                />
              ) : (
                <video
                  ref={(el) => { if (el) { setPreviewVideoRef(el); el.playbackRate = speed; } }}
                  src={draft.url}
                  className={styles.cameraPreviewMedia}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ filter: FILTERS.find((f) => f.id === filterId)?.css || 'none' }}
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    try { v.playbackRate = speed; } catch { /* ignore */ }
                  }}
                />
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
            <>
              <button
                className={styles.editTextBtn}
                onClick={() => setShowTextPanel(true)}
              >
                <Type size={14} />
                {textOverlay ? 'Edit text' : 'Add text'}
              </button>

              {draft && (
                <div className={styles.editToolsPanel}>
                  {/* Filter strip */}
                  <div className={styles.filterStrip}>
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={[styles.filterChip, filterId === f.id ? styles.filterChipActive : ''].filter(Boolean).join(' ')}
                        onClick={() => setFilterId(f.id)}
                      >
                        <span
                          className={styles.filterChipSwatch}
                          style={{ filter: f.css }}
                        />
                        <span className={styles.filterChipLabel}>{f.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Trim slider (video only) */}
                  {draft.type === 'video' && (
                    <div className={styles.trimStrip}>
                      <div className={styles.trimLabel}>
                        <span>Trim</span>
                        <span className={styles.trimValue}>
                          {trimStart.toFixed(1)}s – {trimEnd.toFixed(1)}s
                        </span>
                      </div>
                      <div className={styles.trimTrack}>
                        <div
                          className={styles.trimSelection}
                          style={{
                            left: `calc(12px + (100% - 24px) * ${trimEnd > 0 ? trimStart / trimEnd : 0})`,
                            right: `calc(12px + (100% - 24px) * ${trimEnd > 0 ? (1 - (trimStart > 0 ? 1 - trimEnd / trimEnd : 1)) : 1})`,
                          }}
                        />
                        <input
                          type="range"
                          className={`${styles.trimHandle} ${styles.trimHandleLeft}`}
                          min={0}
                          max={Math.max(0.5, (trimEnd || draft.durationSeconds || 15) - 0.5)}
                          step={0.1}
                          value={trimStart}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (v < trimEnd - 0.5) setTrimStart(v);
                          }}
                        />
                        <input
                          type="range"
                          className={`${styles.trimHandle} ${styles.trimHandleRight}`}
                          min={trimStart + 0.5}
                          max={draft.durationSeconds || 15}
                          step={0.1}
                          value={trimEnd}
                          onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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
          <div className={styles.editBar}>
            <button
              className={styles.cancelBtn}
              onClick={resetToCapture}
              disabled={uploading}
            >
              Cancel
            </button>
            <div className={styles.editToolsInline}>
              <button
                type="button"
                className={styles.editToolBtn}
                onClick={() => setShowTextPanel(true)}
                aria-label="Add text"
              >
                <Type size={18} />
              </button>
              <button
                type="button"
                className={`${styles.editToolBtn} ${speed !== 1 ? styles.editToolBtnActive : ''}`}
                onClick={() => setSpeedPickerOpen((v) => !v)}
                aria-label={`Speed: ${speed}x`}
              >
                <span className={styles.speedLabel}>{speed}x</span>
              </button>
              {speedPickerOpen && (
                <div className={styles.speedPicker} role="menu">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.speedOption} ${s === speed ? styles.speedOptionActive : ''}`}
                      onClick={() => {
                        setSpeed(s);
                        if (previewVideoRef) { try { previewVideoRef.playbackRate = s; } catch {} }
                        setSpeedPickerOpen(false);
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={styles.publishBtn}
              onClick={() => { setShowTextPanel(false); setStage('preview'); }}
              disabled={uploading}
            >
              Next
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

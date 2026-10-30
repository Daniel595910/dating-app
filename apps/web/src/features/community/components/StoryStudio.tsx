import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Camera, Image as ImageIcon, Video, RefreshCw,
  Loader2, Sparkles, Type, X,
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

interface Draft {
  url: string;
  file: File;
  type: 'image' | 'video';
  durationSeconds: number | null;
}

const MAX_VIDEO_SECONDS = 15;
const MAX_OVERLAY_CHARS = 140;

export const StoryStudio: React.FC<StoryStudioProps> = ({
  open,
  onClose,
  userId,
  onStoryCreated,
}) => {
  const [stage, setStage] = useState<Stage>('capture');
  const [mode, setMode] = useState<Mode>('photo');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [textOverlay, setTextOverlay] = useState('');
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStage('capture');
    setMode('photo');
    setDraft(null);
    setTextOverlay('');
    setShowTextPanel(false);
    setError(null);
    setUploading(false);
    setProgress(0);
  }, [open]);

  // Escape closes (unless uploading)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, uploading, onClose]);

  if (!open) return null;

  const openPicker = () => {
    setError(null);
    if (mode === 'photo') imageInputRef.current?.click();
    else videoInputRef.current?.click();
  };

  const handleImage = (file: File) => {
    setError(null);
    setDraft({ url: URL.createObjectURL(file), file, type: 'image', durationSeconds: null });
    setStage('edit');
  };

  const handleVideo = (file: File) => {
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
    else handleVideo(file);
  };

  const resetToCapture = () => {
    if (draft?.url) URL.revokeObjectURL(draft.url);
    setDraft(null);
    setTextOverlay('');
    setShowTextPanel(false);
    setStage('capture');
    setError(null);
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

  return (
    <div className={styles.overlay}>
      <div className={styles.studio}>
        {/* Hidden file inputs */}
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

          <div className={styles.timerPill}>00:00</div>

          <button
            className={styles.iconBtn}
            disabled
            aria-label="Grid (coming soon)"
            title="Grid overlay — coming soon"
          >
            <Sparkles size={18} />
          </button>
        </div>

        {/* Camera area / preview */}
        <div className={styles.cameraArea}>
          {stage === 'capture' && (
            <div className={styles.cameraPlaceholder}>
              <Camera size={40} />
              <p className={styles.cameraPlaceholderTitle}>Add to Story</p>
              <p className={styles.cameraPlaceholderText}>
                Pick a photo or video from your library. Live camera capture is coming in a future update.
              </p>
            </div>
          )}

          {stage !== 'capture' && draft && (
            <>
              {draft.type === 'image' ? (
                <img src={draft.url} alt="" className={styles.cameraPreviewMedia} />
              ) : (
                <video
                  src={draft.url}
                  className={styles.cameraPreviewMedia}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              )}
              {textOverlay && (
                <div className={styles.textOverlayOnPreview}>{textOverlay}</div>
              )}
            </>
          )}

          {/* Self-view decorative circle */}
          {stage === 'capture' && (
            <div className={styles.selfView}>
              <Camera size={32} />
            </div>
          )}

          {/* Text edit panel (edit stage) */}
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

          {/* Edit-text button (edit stage, when panel closed) */}
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

        {/* Bottom bar — differs by stage */}
        {stage === 'capture' && (
          <>
            <div className={styles.bottomBar}>
              <button
                className={styles.libraryThumb}
                onClick={openPicker}
                aria-label="Open library"
              >
                <ImageIcon size={22} />
              </button>

              <button
                className={styles.shutterBtn}
                onClick={openPicker}
                aria-label="Capture"
              >
                <div className={styles.shutterInner}>
                  {mode === 'photo' ? <Camera size={26} /> : <Video size={26} />}
                </div>
              </button>

              <button
                className={styles.flipBtn}
                disabled
                aria-label="Flip camera (coming soon)"
                title="Camera flip — coming soon"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            <div className={styles.modeTabs}>
              <button className={styles.modeTab} disabled>Live</button>
              <button
                className={`${styles.modeTab} ${mode === 'photo' ? styles.modeTabActive : ''}`}
                onClick={() => setMode('photo')}
              >
                Photo
              </button>
              <button
                className={`${styles.modeTab} ${mode === 'video' ? styles.modeTabActive : ''}`}
                onClick={() => setMode('video')}
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

        {/* Error toast */}
        {error && <div className={styles.errorToast}>{error}</div>}

        {/* Upload progress overlay */}
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
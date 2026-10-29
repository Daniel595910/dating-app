import React, { useEffect, useRef, useState } from 'react';
import { X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { mediaService } from '../services/media.service';
import styles from '../styles/StoryCreator.module.css';

interface StoryCreatorProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onStoryCreated: () => void;
}

type Step = 'pick' | 'overlay' | 'preview';

interface DraftMedia {
  url: string;
  file: File;
  type: 'image' | 'video';
  durationSeconds: number | null;
}

const MAX_VIDEO_SECONDS = 15;
const MAX_OVERLAY_CHARS = 140;

export const StoryCreator: React.FC<StoryCreatorProps> = ({
  open,
  onClose,
  userId,
  onStoryCreated,
}) => {
  const [step, setStep] = useState<Step>('pick');
  const [draft, setDraft] = useState<DraftMedia | null>(null);
  const [textOverlay, setTextOverlay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Reset every time the sheet opens
  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setDraft(null);
    setTextOverlay('');
    setError(null);
    setUploading(false);
    setProgress(0);
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, uploading, onClose]);

  if (!open) return null;

  const handleImage = (file: File) => {
    setError(null);
    setDraft({ url: URL.createObjectURL(file), file, type: 'image', durationSeconds: null });
    setStep('overlay');
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
      setStep('overlay');
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
    <div className={styles.overlay} onClick={() => { if (!uploading) onClose(); }}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <button
            onClick={onClose}
            aria-label="Close"
            className={styles.closeBtn}
            disabled={uploading}
          >
            <X size={20} />
          </button>
          <h3 className={styles.title}>
            {step === 'pick' && 'Add to Story'}
            {step === 'overlay' && 'Add Text'}
            {step === 'preview' && 'Preview'}
          </h3>
          <div className={styles.headerSpacer} />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {step === 'pick' && (
          <div className={styles.pickRow}>
            <button
              className={styles.pickCard}
              onClick={() => imageInputRef.current?.click()}
              type="button"
            >
              <ImageIcon size={32} />
              <span>Photo</span>
            </button>
            <button
              className={styles.pickCard}
              onClick={() => videoInputRef.current?.click()}
              type="button"
            >
              <Video size={32} />
              <span>Video (≤{MAX_VIDEO_SECONDS}s)</span>
            </button>
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
          </div>
        )}

        {step === 'overlay' && draft && (
          <div className={styles.overlayStep}>
            <div className={styles.mediaPreviewWrap}>
              {draft.type === 'image' ? (
                <img src={draft.url} alt="" className={styles.mediaPreview} />
              ) : (
                <video src={draft.url} className={styles.mediaPreview} autoPlay muted loop playsInline />
              )}
              {textOverlay && (
                <div className={styles.overlayPreview}>{textOverlay}</div>
              )}
            </div>
            <textarea
              className={styles.overlayInput}
              placeholder="Add text (optional)"
              value={textOverlay}
              maxLength={MAX_OVERLAY_CHARS}
              onChange={(e) => setTextOverlay(e.target.value)}
              rows={2}
            />
            <div className={styles.overlayCharCount}>
              {textOverlay.length} / {MAX_OVERLAY_CHARS}
            </div>
            <div className={styles.buttonRow}>
              <button className={styles.ghostBtn} onClick={() => { setDraft(null); setStep('pick'); }}>
                Back
              </button>
              <button className={styles.primaryBtn} onClick={() => setStep('preview')}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && draft && (
          <div className={styles.previewStep}>
            <div className={styles.mediaPreviewWrap}>
              {draft.type === 'image' ? (
                <img src={draft.url} alt="" className={styles.mediaPreview} />
              ) : (
                <video src={draft.url} className={styles.mediaPreview} autoPlay muted loop playsInline />
              )}
              {textOverlay && (
                <div className={styles.overlayPreview}>{textOverlay}</div>
              )}
            </div>

            {uploading && (
              <div className={styles.progressWrap}>
                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.progressLabel}>Uploading… {progress}%</span>
              </div>
            )}

            <p className={styles.disclosure}>
              Your story is visible to your matched connections and community admins.
              It will automatically expire in 24 hours.
            </p>

            <div className={styles.buttonRow}>
              <button className={styles.ghostBtn} onClick={() => setStep('overlay')} disabled={uploading}>
                Back
              </button>
              <button className={styles.primaryBtn} onClick={handlePublish} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 size={16} className={styles.spin} /> Publishing…
                  </>
                ) : (
                  'Publish Story'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
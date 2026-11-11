import { ImagePlus, Mic, Square, Upload, Video } from 'lucide-react';
import type { PostMedia } from '../../types/community.types';
import { canAddVideo, canAddVoice } from '../../utils/mediaValidation';
import styles from './Composer.module.css';

interface MediaPickerRowProps {
  media: PostMedia[];
  hasVoice: boolean;
  uploading: boolean;
  uploadProgress: number;
  videoUploading: boolean;
  maxPhotosPerPost: number;
  isRecording: boolean;
  recordingTime: number;

  onAddPhotos: () => void;
  onAddVideo: () => void;
  onRecordVoice: () => void;
  onUploadAudio: () => void;
  onStopRecording: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * The row of media action buttons: Add Photos / Add Video / Record Voice / Upload Audio.
 * Enforces voice <-> video mutex via canAddVoice / canAddVideo from mediaValidation.
 */
export function MediaPickerRow({
  media,
  hasVoice,
  uploading,
  uploadProgress,
  videoUploading,
  maxPhotosPerPost,
  isRecording,
  recordingTime,
  onAddPhotos,
  onAddVideo,
  onRecordVoice,
  onUploadAudio,
  onStopRecording,
}: MediaPickerRowProps) {
  const videoCheck = canAddVideo(media, hasVoice);
  const voiceCheck = canAddVoice(media, hasVoice);

  const photosFull = media.length >= maxPhotosPerPost;
  const photosDisabled = uploading || photosFull;

  return (
    <div className={styles.attachmentRow}>
      {/* Add Photos */}
      <button
        type="button"
        onClick={onAddPhotos}
        disabled={photosDisabled}
        className={styles.uploadButton}
        title={photosFull ? `Maximum ${maxPhotosPerPost} media items` : 'Add photos'}
      >
        <ImagePlus size={16} />
        <span>
          {uploading
            ? `Uploading... ${Math.round(uploadProgress)}%`
            : media.length > 0
            ? `Add More Photos (${media.length}/${maxPhotosPerPost})`
            : 'Add Photos'}
        </span>
      </button>

      {/* Add Video */}
      {!isRecording && (
        <button
          type="button"
          onClick={onAddVideo}
          disabled={videoUploading || !videoCheck.allowed}
          className={styles.uploadButton}
          title={videoCheck.reason || 'Add a video (MP4, WebM, MOV, M4V — max 10 min)'}
        >
          <Video size={16} />
          <span>
            {videoUploading
              ? 'Uploading video...'
              : media.filter((m) => m.type === 'video').length > 0
              ? `Add More Videos (${media.filter((m) => m.type === 'video').length}/3)`
              : 'Add Video'}
          </span>
        </button>
      )}

      {/* Record Voice */}
      {!isRecording && (
        <button
          type="button"
          onClick={onRecordVoice}
          disabled={!voiceCheck.allowed}
          className={styles.uploadButton}
          title={voiceCheck.reason || 'Record a voice note (max 15s)'}
        >
          <Mic size={16} /> Record Voice
        </button>
      )}

      {/* Upload Audio */}
      {!isRecording && (
        <button
          type="button"
          onClick={onUploadAudio}
          disabled={!voiceCheck.allowed}
          className={styles.uploadButton}
          title={voiceCheck.reason || 'Upload an audio file (max 10MB)'}
        >
          <Upload size={16} /> Upload Audio
        </button>
      )}

      {/* Stop Recording (only visible while recording) */}
      {isRecording && (
        <button
          type="button"
          onClick={onStopRecording}
          className={styles.uploadButtonPrimary}
        >
          <Square size={14} /> Stop ({formatTime(recordingTime)})
        </button>
      )}
    </div>
  );
}
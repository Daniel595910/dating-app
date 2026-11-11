import { useRef } from 'react';
import { X, ArrowLeft, ArrowRight, Camera, Heart, MessageCircle, Sparkles, HelpCircle, Check, Mic, Scissors } from 'lucide-react';
import { CommunityPostType } from '../types/community.types';
import { mediaService } from '../services/media.service';
import styles from '../styles/CreatePostForm.module.css';
import { useSettings } from '@/hooks/useSettings';
import { useCreatePostForm } from './CreatePostForm/useCreatePostForm';
import { MediaPreviewGrid } from './CreatePostForm/MediaPreviewGrid';
import { MediaPickerRow } from './CreatePostForm/MediaPickerRow';
import { VoiceNoteBar } from './CreatePostForm/VoiceNoteBar';
import { validateImageFile, validateVideoFile, validateAudioFile } from '../utils/mediaValidation';
import { formatTime } from './CreatePostForm/utils/time';

interface CreatePostFormProps {
  open: boolean;
  onClose: () => void;
  communityId: string;
  userId: string;
  initialType?: CommunityPostType;
  onPostCreated: (post: any) => void;
}

const POST_TYPES: Array<{ id: CommunityPostType; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'introduction', label: 'Introduce Yourself', icon: <Sparkles size={24} />, description: 'Tell the community about yourself' },
  { id: 'looking_for', label: 'Looking For', icon: <Heart size={24} />, description: 'Share what you are looking for' },
  { id: 'discussion', label: 'Discussion', icon: <MessageCircle size={24} />, description: 'Start a conversation' },
  { id: 'question', label: 'Question', icon: <HelpCircle size={24} />, description: 'Ask the community something' },
  { id: 'photo', label: 'Photo', icon: <Camera size={24} />, description: 'Share a photo' },
];

const LOOKING_FOR_OPTIONS = [
  'Serious Relationship',
  'Marriage',
  'Friendship',
  'Casual Dating',
  'Someone to Talk To',
];

const MAX_AUDIO_SECONDS = 15;

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const totalSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const dataView = new DataView(arrayBuffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) dataView.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  dataView.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, 1, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * blockAlign, true);
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, 16, true);
  writeString(36, 'data');
  dataView.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i] ?? 0));
      dataView.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  open, onClose, communityId, userId, initialType, onPostCreated,
}) => {
  const maxPhotosPerPost = useSettings((s) => s.settings['general.max_photos_per_post']) || 10;
  const {
    state, setStep, setPostType, setContent, setLookingFor, setTags,
    addMedia, removeMedia, setUploading, setUploadProgress, setVideoUploading,
    setSubmitting, setError, setSuccess,
    startRecording: startRecordingAction, stopRecording: stopRecordingAction,
    setRecordingTime, setShowRecordPrompt, setAudioFile, setShowTrimModal,
    setTrimStart, setTrimEnd, setAudioDuration, setAudioBlob, reset,
  } = useCreatePostForm(initialType);
  const { step, postType, content, lookingFor, tags, media, uploading, uploadProgress, videoUploading, submitting, error, success, isRecording, recordingTime, showRecordPrompt, audioFile, showTrimModal, trimStart, trimEnd, audioDuration, audioBlob, audioUrl } = state;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trimAudioRef = useRef<HTMLAudioElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const recordingTimeRef = useRef(0);

  const handleTypeSelect = (type: CommunityPostType) => { setPostType(type); setStep('compose'); };
  const handleBack = () => { if (step === 'compose') setStep('type'); else if (step === 'preview') setStep('compose'); };

  const handleNext = () => {
    if (!content.trim() && !audioUrl && media.length === 0 && postType !== 'photo') { setError('Please write something, record audio, or add a photo'); return; }
    if (postType === 'looking_for' && !lookingFor) { setError('Please select what you are looking for'); return; }
    setError(null); setStep('preview');
  };

  const startRecording = async () => {
    setShowRecordPrompt(false); setError(null); audioChunksRef.current = []; setRecordingTime(0);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setError('Microphone access requires HTTPS or localhost'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
      mediaRecorder.start(1000);
      startRecordingAction();
      recordingTimeRef.current = 0;
      recordingTimerRef.current = setInterval(() => {
        const next = recordingTimeRef.current + 1;
        recordingTimeRef.current = next;
        if (next >= MAX_AUDIO_SECONDS) { mediaRecorder.stop(); stopRecordingAction(); return; }
        setRecordingTime(next);
      }, 1000);
    } catch { setError('Microphone access denied. Please allow microphone access in your browser settings.'); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); stopRecordingAction(); } };
  const removeAudio = () => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioBlob(null); setRecordingTime(0); audioChunksRef.current = []; recordingTimeRef.current = 0; };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true); setUploadProgress(0); setError(null);
    const selectedFiles = Array.from(files);
    const remainingSlots = maxPhotosPerPost - media.length;
    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const v = validateImageFile(filesToUpload[i]!);
        if (!v.valid) { setError(v.error || 'Invalid image'); continue; }
        const result = await mediaService.uploadImage(filesToUpload[i]!, userId, 'post_image');
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
        if (result.success && result.media) addMedia({ ...result.media!, sortOrder: 0 });
        else setError(result.error || 'Failed to upload image');
      }
    } catch (err: any) { setError(err.message || 'Upload failed'); }
    finally { setUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleVideoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setVideoUploading(true); setError(null);
    const selectedFiles = Array.from(files);
    const remainingSlots = 3 - media.filter((m) => m.type === 'video').length;
    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    try {
      for (const file of filesToUpload) {
        const v = await validateVideoFile(file);
        if (!v.valid) { setError(v.error || 'Invalid video'); continue; }
        const result = await mediaService.uploadVideo(file, userId, 'post_video');
        if (result.success && result.media) addMedia({ ...result.media!, sortOrder: 0 });
        else setError(result.error || 'Failed to upload ' + file.name);
      }
    } catch (err: any) { setError(err.message || 'Video upload failed'); }
    finally { setVideoUploading(false); if (videoInputRef.current) videoInputRef.current.value = ''; }
  };

  const handleAudioFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    const v = validateAudioFile(file);
    if (!v.valid) { setError(v.error || 'Invalid audio file'); return; }
    setAudioFile(file); setTrimStart(0); setTrimEnd(MAX_AUDIO_SECONDS); setShowTrimModal(true);
  };

  const handleTrimConfirm = async () => {
    if (!audioFile) return;
    const audioContext = new AudioContext();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const startSample = Math.floor(trimStart * audioBuffer.sampleRate);
    const endSample = Math.floor(trimEnd * audioBuffer.sampleRate);
    const trimmedLength = endSample - startSample;
    const trimmedBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, trimmedLength, audioBuffer.sampleRate);
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) trimmedBuffer.copyToChannel(audioBuffer.getChannelData(i).slice(startSample, endSample), i);
    const wavBlob = audioBufferToWav(trimmedBuffer);
    setAudioBlob(wavBlob);
    setRecordingTime(Math.floor(trimEnd - trimStart));
    setShowTrimModal(false); setAudioFile(null); setError(null);
  };

  const handlePublish = async () => {
    setSubmitting(true); setError(null);
    try {
      const tagArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      const finalContent = postType === 'looking_for' && lookingFor ? content + '\n\nLooking for: ' + lookingFor : content;
      let finalAudioUrl: string | undefined;
      if (audioBlob) {
        const audioResult = await mediaService.uploadAudio(audioBlob, userId, 'post_audio');
        if (audioResult.success && audioResult.media) finalAudioUrl = audioResult.media.url;
      }
      const { communityService } = await import('../services/community.service');
      const createdPost = await communityService.createPost(communityId, userId, postType!, finalContent, lookingFor || undefined, media, tagArray, finalAudioUrl);
      if (!createdPost) throw new Error('Failed to create post');
      setSuccess(true);
      setTimeout(() => { reset(initialType); onPostCreated(createdPost); onClose(); }, 1500);
    } catch (err: any) { setError(err.message || 'Failed to publish post'); }
    finally { setSubmitting(false); }
  };

  if (!open) return null;

  const getTypeLabel = (type: CommunityPostType): string => POST_TYPES.find((t) => t.id === type)?.label || type;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {step !== 'type' && (<button onClick={handleBack} aria-label='Back' className={styles.backButton}><ArrowLeft size={20} /></button>)}
          <h2 className={styles.title}>{success ? 'Published!' : step === 'type' ? 'Create Post' : step === 'compose' ? 'Create ' + getTypeLabel(postType!) : 'Preview'}</h2>
          <button onClick={onClose} aria-label='Close' className={styles.closeButton}><X size={20} /></button>
        </div>
        {success ? (
          <div className={styles.successState}><div className={styles.successIcon}><Check size={32} /></div><p className={styles.successText}>Post published successfully!</p></div>
        ) : step === 'type' ? (
          <div className={styles.typeGrid}>
            {POST_TYPES.map((type) => (<button key={type.id} className={styles.typeCard} onClick={() => handleTypeSelect(type.id)}><div className={styles.typeIcon}>{type.icon}</div><span className={styles.typeLabel}>{type.label}</span><span className={styles.typeDescription}>{type.description}</span></button>))}
          </div>
        ) : step === 'compose' ? (
          <div className={styles.composeForm}>
            {postType === 'looking_for' && (
              <div className={styles.lookingForSection}>
                <label className={styles.fieldLabel}>What are you looking for?</label>
                <div className={styles.lookingForOptions}>
                  {LOOKING_FOR_OPTIONS.map((option) => (<button key={option} className={styles.lookingForOption + ' ' + (lookingFor === option ? styles.lookingForOptionActive : '')} onClick={() => setLookingFor(option)}>{option}</button>))}
                </div>
              </div>
            )}
            <textarea className={styles.contentInput} value={content} onChange={(e) => setContent(e.target.value)} placeholder={postType === 'introduction' ? 'Tell the community about yourself...' : postType === 'question' ? 'Ask your question...' : 'What is on your mind?'} rows={5} maxLength={5000} />
            <MediaPickerRow
              media={media}
              hasVoice={Boolean(audioBlob || audioUrl)}
              uploading={uploading}
              uploadProgress={uploadProgress}
              videoUploading={videoUploading}
              maxPhotosPerPost={maxPhotosPerPost}
              isRecording={isRecording}
              recordingTime={recordingTime}
              onAddPhotos={() => fileInputRef.current?.click()}
              onAddVideo={() => videoInputRef.current?.click()}
              onRecordVoice={() => setShowRecordPrompt(true)}
              onUploadAudio={() => audioFileInputRef.current?.click()}
              onStopRecording={stopRecording}
            />
            <input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp,image/gif' multiple onChange={(e) => handleFileSelect(e.target.files)} style={{ display: 'none' }} />
            <input ref={audioFileInputRef} type='file' accept='audio/*,.mp3,.wav,.webm,.ogg,.m4a' onChange={(e) => handleAudioFileSelect(e.target.files)} style={{ display: 'none' }} />
            <input ref={videoInputRef} type='file' accept='video/mp4,video/webm,video/quicktime' multiple onChange={(e) => handleVideoSelect(e.target.files)} style={{ display: 'none' }} />
            {audioUrl && <VoiceNoteBar audioUrl={audioUrl} onRemove={removeAudio} />}
            <MediaPreviewGrid media={media} onRemove={removeMedia} />
            <input className={styles.tagsInput} value={tags} onChange={(e) => setTags(e.target.value)} placeholder='Tags (comma-separated, optional)' />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.nextButton} onClick={handleNext}>Continue <ArrowRight size={16} /></button>
          </div>
        ) : (
          <div className={styles.previewForm}>
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}><span className={styles.previewName}>You</span><span className={styles.previewType}>{getTypeLabel(postType!)}</span></div>
              {postType === 'looking_for' && lookingFor && (<div className={styles.previewLookingFor}><Heart size={12} /><span>Looking for {lookingFor}</span></div>)}
              {content && <p className={styles.previewContent}>{content}</p>}
              {audioUrl && <div style={{ marginBottom: 8 }}><audio src={audioUrl} controls style={{ width: '100%', height: 32 }} /></div>}
              {media.length > 0 && <MediaPreviewGrid media={media} onRemove={() => {}} />}
              {tags && (<div className={styles.previewTags}>{tags.split(',').map((t, i) => <span key={i} className={styles.previewTag}>#{t.trim()}</span>)}</div>)}
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.previewActions}>
              <button className={styles.editButton} onClick={handleBack} disabled={submitting}>Edit</button>
              <button className={styles.publishButton} onClick={handlePublish} disabled={submitting}>{submitting ? 'Publishing...' : 'Publish'}</button>
            </div>
          </div>
        )}
      </div>
      {showRecordPrompt && (
        <div onClick={(e) => e.stopPropagation()} className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <div className={styles.modalIconCircle}><Mic size={32} /></div>
            <h3 className={styles.modalTitle}>Record Your Voice</h3>
            <p className={styles.modalDescription}>Record a short voice message to introduce yourself! Talk about what you are looking for, your interests, or just say hi!</p>
            <p className={styles.modalHint}>Maximum {MAX_AUDIO_SECONDS} seconds</p>
            <div className={styles.modalActions}>
              <button onClick={startRecording} className={styles.modalPrimaryButton}><Mic size={18} /> Start Recording</button>
              <button onClick={() => setShowRecordPrompt(false)} className={styles.modalSecondaryButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showTrimModal && audioFile && (
        <div onClick={(e) => e.stopPropagation()} className={styles.trimOverlay}>
          <div className={styles.trimDialog}>
            <div className={styles.trimHeader}><h3 className={styles.trimTitle}>Trim Audio</h3><button onClick={() => { setShowTrimModal(false); setAudioFile(null); }} className={styles.trimCloseButton}><X size={20} /></button></div>
            <audio ref={trimAudioRef} src={URL.createObjectURL(audioFile)} controls className={styles.trimAudioElement} onLoadedMetadata={(e) => { const dur = e.currentTarget.duration; setAudioDuration(dur); setTrimEnd(Math.min(MAX_AUDIO_SECONDS, dur)); }} />
            <div>
              <div className={styles.trimTimeLabels}><span>0:00</span><span>{formatTime(audioDuration)}</span></div>
              <div className={styles.trimTrackWrapper}>
                <div className={styles.trimTrackBackground} />
                <div className={styles.trimTrackSelected} style={{ left: (trimStart / (audioDuration || MAX_AUDIO_SECONDS)) * 100 + '%', width: ((trimEnd - trimStart) / (audioDuration || MAX_AUDIO_SECONDS)) * 100 + '%' }} />
                <input type='range' min={0} max={audioDuration || MAX_AUDIO_SECONDS} step={0.1} value={trimStart} onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.5))} className={styles.trimRangeInput} style={{ zIndex: 2 }} />
                <input type='range' min={0} max={audioDuration || MAX_AUDIO_SECONDS} step={0.1} value={trimEnd} onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))} className={styles.trimRangeInput} style={{ zIndex: 3 }} />
              </div>
              <div className={styles.trimValuesRow}><span>Start: {formatTime(trimStart)}</span><span>End: {formatTime(trimEnd)}</span><span>Length: {formatTime(trimEnd - trimStart)}</span></div>
            </div>
            <div className={styles.trimActions}>
              <button onClick={handleTrimConfirm} className={styles.trimApplyButton}><Scissors size={16} /> Apply Trim</button>
              <button onClick={() => { setShowTrimModal(false); setAudioFile(null); }} className={styles.trimCancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


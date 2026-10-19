import React, { useState, useRef, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Camera, Heart, MessageCircle, Sparkles, HelpCircle, Check, ImagePlus, Trash2, Mic, Square, Upload, Scissors, Play, Pause } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { CommunityPostType, PostMedia } from '../../types/community.types';
import { mediaService } from '../services/media.service';
import styles from '../styles/CreatePostForm.module.css';
import { useSettings } from '@/hooks/useSettings';

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
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(offset + i, str.charCodeAt(i));
    }
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
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      dataView.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  open,
  onClose,
  communityId,
  userId,
  initialType,
  onPostCreated,
}) => {
  const maxPhotosPerPost = useSettings((s) => s.settings['general.max_photos_per_post']) || 10;
  const [step, setStep] = useState<'type' | 'compose' | 'preview'>('type');
  const [postType, setPostType] = useState<CommunityPostType | null>(initialType || null);
  const [content, setContent] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [tags, setTags] = useState('');
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRecordPrompt, setShowRecordPrompt] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(MAX_AUDIO_SECONDS);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trimAudioRef = useRef<HTMLAudioElement>(null);

  const handleTypeSelect = (type: CommunityPostType) => {
    setPostType(type);
    setStep('compose');
  };

  const handleBack = () => {
    if (step === 'compose') setStep('type');
    else if (step === 'preview') setStep('compose');
  };

  const handleNext = () => {
    if (!content.trim() && !audioUrl && media.length === 0 && postType !== 'photo') {
      setError('Please write something, record audio, or add a photo');
      return;
    }
    if (postType === 'looking_for' && !lookingFor) {
      setError('Please select what you are looking for');
      return;
    }
    setError(null);
    setStep('preview');
  };

  const startRecording = async () => {
    setShowRecordPrompt(false);
    setError(null);
    audioChunksRef.current = [];
    setRecordingTime(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone access requires HTTPS or localhost');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_AUDIO_SECONDS) {
            mediaRecorder.stop();
            setIsRecording(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const selectedFiles = Array.from(files);
    const maxFiles = maxPhotosPerPost;
    const remainingSlots = maxFiles - media.length;
    const filesToUpload = selectedFiles.slice(0, remainingSlots);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const result = await mediaService.uploadImage(filesToUpload[i]!, userId, 'post_image');
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
        if (result.success && result.media) {
          setMedia((prev) => [...prev, { ...result.media!, sortOrder: prev.length }]);
        } else {
          setError(result.error || 'Failed to upload image');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAudioFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    const allowedExtensions = /\.(mp3|wav|webm|ogg|m4a)$/i;
    if (!allowedExtensions.test(file.name)) {
      setError('Please select a valid audio file (MP3, WAV, WebM, OGG, M4A)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Audio file is too large. Max 10MB.');
      return;
    }
    setAudioFile(file);
    setTrimStart(0);
    setTrimEnd(MAX_AUDIO_SECONDS);
    setShowTrimModal(true);
  };

  const handleTrimConfirm = async () => {
    if (!audioFile) return;
    
    const audioContext = new AudioContext();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const startSample = Math.floor(trimStart * audioBuffer.sampleRate);
    const endSample = Math.floor(trimEnd * audioBuffer.sampleRate);
    const trimmedLength = endSample - startSample;
    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      trimmedLength,
      audioBuffer.sampleRate
    );
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      trimmedBuffer.copyToChannel(audioBuffer.getChannelData(i).slice(startSample, endSample), i);
    }
    const wavBlob = audioBufferToWav(trimmedBuffer);
    setAudioBlob(wavBlob);
    setAudioUrl(URL.createObjectURL(wavBlob));
    setRecordingTime(Math.floor(trimEnd - trimStart));
    setShowTrimModal(false);
    setAudioFile(null);
    setError(null);
  };

  const handlePublish = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const tagArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      const finalContent = postType === 'looking_for' && lookingFor
        ? content + '\n\nLooking for: ' + lookingFor
        : content;

      let metadata: any = {};
      
      if (audioBlob) {
        const audioResult = await mediaService.uploadAudio(audioBlob, userId, 'post_audio');
        if (audioResult.success && audioResult.media) {
          metadata.audioUrl = audioResult.media.url;
          metadata.durationMs = recordingTime * 1000;
        }
      }

      const postData: any = {
        community_id: communityId,
        author_id: userId,
        type: postType,
        content: finalContent,
        status: 'published',
        images: media.map((m) => m.url),
        tags: tagArray,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStep('type');
        setPostType(null);
        setContent('');
        setLookingFor('');
        setTags('');
        setMedia([]);
        removeAudio();
        onPostCreated(data);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to publish post');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const getTypeLabel = (type: CommunityPostType): string => {
    return POST_TYPES.find((t) => t.id === type)?.label || type;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {step !== 'type' && (
            <button onClick={handleBack} aria-label="Back" className={styles.backButton}>
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className={styles.title}>
            {success ? 'Published!' : step === 'type' ? 'Create Post' : step === 'compose' ? 'Create ' + getTypeLabel(postType!) : 'Preview'}
          </h2>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}><Check size={32} /></div>
            <p className={styles.successText}>Post published successfully!</p>
          </div>
        ) : step === 'type' ? (
          <div className={styles.typeGrid}>
            {POST_TYPES.map((type) => (
              <button key={type.id} className={styles.typeCard} onClick={() => handleTypeSelect(type.id)}>
                <div className={styles.typeIcon}>{type.icon}</div>
                <span className={styles.typeLabel}>{type.label}</span>
                <span className={styles.typeDescription}>{type.description}</span>
              </button>
            ))}
          </div>
        ) : step === 'compose' ? (
          <div className={styles.composeForm}>
            {postType === 'looking_for' && (
              <div className={styles.lookingForSection}>
                <label className={styles.fieldLabel}>What are you looking for?</label>
                <div className={styles.lookingForOptions}>
                  {LOOKING_FOR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      className={`${styles.lookingForOption} ${lookingFor === option ? styles.lookingForOptionActive : ''}`}
                      onClick={() => setLookingFor(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              className={styles.contentInput}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={postType === 'introduction' ? 'Tell the community about yourself...' : postType === 'question' ? 'Ask your question...' : "What's on your mind?"}
              rows={5}
              maxLength={5000}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isRecording && !audioUrl && (
                <>
                  <button type="button" onClick={() => setShowRecordPrompt(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px dashed #d1d5db', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6b7280', minHeight: 38 }}>
                    <Mic size={16} /> Record Voice
                  </button>
                  <button type="button" onClick={() => audioFileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px dashed #d1d5db', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6b7280', minHeight: 38 }}>
                    <Upload size={16} /> Upload Audio
                  </button>
                </>
              )}
              {isRecording && (
                <button type="button" onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#ef4444', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#ffffff', minHeight: 38 }}>
                  <Square size={14} /> Stop ({formatTime(recordingTime)})
                </button>
              )}
              {audioUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <audio src={audioUrl} controls style={{ flex: 1, height: 32 }} />
                  <button type="button" onClick={removeAudio} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => handleFileSelect(e.target.files)} style={{ display: 'none' }} />
            <input ref={audioFileInputRef} type="file" accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a" onChange={(e) => handleAudioFileSelect(e.target.files)} style={{ display: 'none' }} />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || media.length >= maxPhotosPerPost} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 9999, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151', minHeight: 38 }}>
                <ImagePlus size={16} />
                <span>{uploading ? 'Uploading... ' + Math.round(uploadProgress) + '%' : media.length > 0 ? 'Add More Photos (' + media.length + '/' + maxPhotosPerPost + ')' : 'Add Photos'}</span>
              </button>
            </div>

            {media.length > 0 && (
              <div className={styles.mediaPreview}>
                {media.map((m) => (
                  <div key={m.id} className={styles.mediaPreviewItem}>
                    <img src={m.url} alt="" className={styles.mediaPreviewImage} />
                    <button className={styles.mediaRemoveButton} onClick={() => handleRemoveMedia(m.id)} aria-label="Remove image">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input className={styles.tagsInput} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated, optional)" />

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.nextButton} onClick={handleNext}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className={styles.previewForm}>
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <span className={styles.previewName}>You</span>
                <span className={styles.previewType}>{getTypeLabel(postType!)}</span>
              </div>
              {postType === 'looking_for' && lookingFor && (
                <div className={styles.previewLookingFor}>
                  <Heart size={12} />
                  <span>Looking for {lookingFor}</span>
                </div>
              )}
              {content && <p className={styles.previewContent}>{content}</p>}
              {audioUrl && (
                <div style={{ marginBottom: 8 }}>
                  <audio src={audioUrl} controls style={{ width: '100%', height: 32 }} />
                </div>
              )}
              {media.length > 0 && (
                <div className={styles.previewMediaRow}>
                  {media.map((m) => (
                    <img key={m.id} src={m.url} alt="" className={styles.previewMediaImage} />
                  ))}
                </div>
              )}
              {tags && (
                <div className={styles.previewTags}>
                  {tags.split(',').map((t, i) => <span key={i} className={styles.previewTag}>#{t.trim()}</span>)}
                </div>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.previewActions}>
              <button className={styles.editButton} onClick={handleBack} disabled={submitting}>Edit</button>
              <button className={styles.publishButton} onClick={handlePublish} disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Prompt Modal */}
      {showRecordPrompt && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mic size={32} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>Record Your Voice</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
              Record a short voice message to introduce yourself! Talk about what you're looking for, your interests, or just say hi!
            </p>
            <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: '0 0 20px' }}>
              Maximum {MAX_AUDIO_SECONDS} seconds
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={startRecording} style={{ flex: 1, padding: 14, backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Mic size={18} /> Start Recording
              </button>
              <button onClick={() => setShowRecordPrompt(false)} style={{ flex: 1, padding: 14, background: 'none', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 9999, cursor: 'pointer', fontSize: 15, fontWeight: 500 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CapCut-style Trim Modal */}
      {showTrimModal && audioFile && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: '20px 16px', maxWidth: 420, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#111827' }}>Trim Audio</h3>
              <button onClick={() => { setShowTrimModal(false); setAudioFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 6 }}>
                <X size={20} />
              </button>
            </div>

            <audio 
              ref={trimAudioRef}
              src={URL.createObjectURL(audioFile)} 
              controls 
              style={{ width: '100%', marginBottom: 16 }}
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                setAudioDuration(dur);
                setTrimEnd(Math.min(MAX_AUDIO_SECONDS, dur));
              }}
            />

            {/* Timeline */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                <span>0:00</span>
                <span>{formatTime(audioDuration)}</span>
              </div>
              
              {/* Track with selected range */}
              <div style={{ position: 'relative', height: 44, marginBottom: 6 }}>
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 6, backgroundColor: '#e5e7eb', borderRadius: 9999 }} />
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  left: (trimStart / (audioDuration || MAX_AUDIO_SECONDS)) * 100 + '%', 
                  width: ((trimEnd - trimStart) / (audioDuration || MAX_AUDIO_SECONDS)) * 100 + '%', 
                  height: 6, 
                  backgroundColor: '#ef4444', 
                  borderRadius: 9999 
                }} />
                
                {/* Start slider */}
                <input
                  type="range"
                  min={0}
                  max={audioDuration || MAX_AUDIO_SECONDS}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.5))}
                  style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, width: '100%', height: 44, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                />
                {/* End slider */}
                <input
                  type="range"
                  min={0}
                  max={audioDuration || MAX_AUDIO_SECONDS}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
                  style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, width: '100%', height: 44, opacity: 0, cursor: 'pointer', zIndex: 3 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                <span>Start: {formatTime(trimStart)}</span>
                <span>End: {formatTime(trimEnd)}</span>
                <span>Length: {formatTime(trimEnd - trimStart)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleTrimConfirm} style={{ flex: 1, padding: 13, backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Scissors size={16} /> Apply Trim
              </button>
              <button onClick={() => { setShowTrimModal(false); setAudioFile(null); }} style={{ flex: 1, padding: 13, background: 'none', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};






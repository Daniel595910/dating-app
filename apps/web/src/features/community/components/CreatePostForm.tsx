import React, { useState, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, Camera, Heart, MessageCircle, Sparkles, HelpCircle, Check, ImagePlus, Trash2, Mic, Square, Video, Globe } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { CommunityPostType, PostMedia } from '../../types/community.types';
import { mediaService } from '../services/media.service';
import { discoverService } from '../../discover/services/discover.service';
import styles from '../styles/CreatePostForm.module.css';

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

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  open,
  onClose,
  communityId,
  userId,
  initialType,
  onPostCreated,
}) => {
  const [step, setStep] = useState<'type' | 'compose' | 'preview'>('type');
  const [postType, setPostType] = useState<CommunityPostType | null>(initialType || null);
  const [content, setContent] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [tags, setTags] = useState('');
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [videoMedia, setVideoMedia] = useState<PostMedia | null>(null);
  const [showInDiscover, setShowInDiscover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTypeSelect = (type: CommunityPostType) => {
    setPostType(type);
    setStep('compose');
  };

  const handleBack = () => {
    if (step === 'compose') setStep('type');
    else if (step === 'preview') setStep('compose');
  };

  const handleNext = () => {
    if (!content.trim() && !audioUrl && media.length === 0 && !videoMedia && postType !== 'photo') {
      setError('Please write something, record audio, or add a photo/video');
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
          if (prev >= 120) {
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const selectedFiles = Array.from(files);
    const maxFiles = 5;
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

  const handleVideoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await mediaService.uploadVideo(files[0]!, userId, 'post_video');
      
      if (result.success && result.media) {
        setVideoMedia(result.media);
        // Auto-enable Discover option for videos
        setShowInDiscover(true);
      } else {
        setError(result.error || 'Failed to upload video');
      }
    } catch (err: any) {
      setError(err.message || 'Video upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const handleRemoveVideo = () => {
    setVideoMedia(null);
    setShowInDiscover(false);
  };

  const handlePublish = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const tagArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

      const finalContent = postType === 'looking_for' && lookingFor
        ? content + '\n\nLooking for: ' + lookingFor
        : content;

      // Upload audio if exists
      let metadata: any = {};
      
      if (audioBlob) {
        const timestamp = Date.now();
        const filePath = 'post-audio/' + userId + '/' + timestamp + '.webm';

        const { error: audioUploadError } = await supabase.storage
          .from('media')
          .upload(filePath, audioBlob, { cacheControl: '3600', contentType: 'audio/webm' });

        if (!audioUploadError) {
          const { data: audioUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
          metadata.audioUrl = audioUrlData.publicUrl;
          metadata.durationMs = recordingTime * 1000;
        }
      }

      // Add video metadata
      if (videoMedia) {
        metadata.videoUrl = videoMedia.url;
        metadata.thumbnailUrl = videoMedia.thumbnailUrl || null;
        metadata.videoDuration = videoMedia.durationSeconds || null;
      }

      // Prepare post data
      const postData: any = {
        community_id: communityId,
        author_id: userId,
        type: videoMedia ? 'photo' : postType, // Use photo type for video posts temporarily
        content: finalContent,
        status: 'published',
        images: media.map((m) => m.url),
        tags: tagArray,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        is_discover_eligible: showInDiscover && videoMedia ? true : false,
        discover_status: showInDiscover && videoMedia ? 'pending' : null,
        discover_submitted_at: showInDiscover && videoMedia ? new Date().toISOString() : null,
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
        setVideoMedia(null);
        setShowInDiscover(false);
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

            {/* Voice Recording */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {!isRecording && !audioUrl && (
                <button
                  type="button"
                  onClick={startRecording}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 1rem',
                    background: 'none',
                    border: '1px dashed #d1d5db',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    minHeight: 40,
                  }}
                >
                  <Mic size={16} />
                  Record Voice
                </button>
              )}
              {isRecording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 1rem',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    minHeight: 40,
                  }}
                >
                  <Square size={14} />
                  Stop ({formatTime(recordingTime)})
                </button>
              )}
              {audioUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <audio src={audioUrl} controls style={{ flex: 1, height: 32 }} />
                  <button
                    type="button"
                    onClick={removeAudio}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      padding: '0.25rem',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />

            {/* Video Upload */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => handleVideoSelect(e.target.files)}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || media.length >= 5}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#374151',
                  minHeight: 40,
                }}
              >
                <ImagePlus size={16} />
                <span>{uploading ? 'Uploading... ' + Math.round(uploadProgress) + '%' : media.length > 0 ? 'Add More Photos (' + media.length + '/5)' : 'Add Photos'}</span>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading || !!videoMedia}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  borderRadius: '9999px',
                  cursor: videoMedia ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: videoMedia ? '#9ca3af' : '#374151',
                  minHeight: 40,
                }}
              >
                <Video size={16} />
                <span>{videoMedia ? 'Video Added' : 'Add Video'}</span>
              </button>
            </div>

            {/* Image Preview */}
            {media.length > 0 && (
              <div className={styles.mediaPreview}>
                {media.map((m) => (
                  <div key={m.id} className={styles.mediaPreviewItem}>
                    <img src={m.url} alt="" className={styles.mediaPreviewImage} />
                    <button
                      className={styles.mediaRemoveButton}
                      onClick={() => handleRemoveMedia(m.id)}
                      aria-label="Remove image"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video Preview */}
            {videoMedia && (
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <video
                  src={videoMedia.url}
                  controls
                  style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* Discover Opt-in */}
            {videoMedia && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fecaca',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={showInDiscover}
                    onChange={(e) => setShowInDiscover(e.target.checked)}
                    style={{
                      marginTop: '2px',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                    }}
                  />
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#111827',
                    }}>
                      <Globe size={16} />
                      Show this video in Discover
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      margin: '0.25rem 0 0 0',
                    }}>
                      Your video will be reviewed before appearing in Discover. It must be appropriate and follow community guidelines.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <input
              className={styles.tagsInput}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma-separated, optional)"
            />

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
                <div style={{ marginBottom: '0.5rem' }}>
                  <audio src={audioUrl} controls style={{ width: '100%', height: 32 }} />
                </div>
              )}
              {videoMedia && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <video src={videoMedia.url} controls style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                </div>
              )}
              {media.length > 0 && (
                <div className={styles.previewMediaRow}>
                  {media.map((m) => (
                    <img key={m.id} src={m.url} alt="" className={styles.previewMediaImage} />
                  ))}
                </div>
              )}
              {showInDiscover && videoMedia && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}>
                  <Globe size={14} />
                  Will be submitted to Discover for review
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
    </div>
  );
};

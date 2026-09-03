import React, { useState, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, Camera, Heart, MessageCircle, Sparkles, HelpCircle, Check, ImagePlus, Trash2 } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { CommunityPostType, PostMedia } from '../../types/community.types';
import { mediaService } from '../services/media.service';
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTypeSelect = (type: CommunityPostType) => {
    setPostType(type);
    setStep('compose');
  };

  const handleBack = () => {
    if (step === 'compose') setStep('type');
    else if (step === 'preview') setStep('compose');
  };

  const handleNext = () => {
    if (!content.trim() && postType !== 'photo' && media.length === 0) {
      setError('Please write something or add a photo');
      return;
    }
    if (postType === 'looking_for' && !lookingFor) {
      setError('Please select what you are looking for');
      return;
    }
    setError(null);
    setStep('preview');
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

  const handleRemoveMedia = (mediaId: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const handlePublish = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const tagArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

      const finalContent = postType === 'looking_for' && lookingFor
        ? `${content}\n\nLooking for: ${lookingFor}`
        : content;

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({
          community_id: communityId,
          author_id: userId,
          type: postType,
          content: finalContent,
          status: 'published',
          images: media.map((m) => m.url),
          tags: tagArray,
        })
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
        {/* Header */}
        <div className={styles.header}>
          {step !== 'type' && (
            <button onClick={handleBack} aria-label="Back" className={styles.backButton}>
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className={styles.title}>
            {success ? 'Published!' : step === 'type' ? 'Create Post' : step === 'compose' ? `Create ${getTypeLabel(postType!)}` : 'Preview'}
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

            {/* Photo Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />

            <button
              className={styles.photoUploadButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || media.length >= 5}
            >
              <ImagePlus size={18} />
              <span>{uploading ? `Uploading... ${Math.round(uploadProgress)}%` : media.length > 0 ? `Add More Photos (${media.length}/5)` : 'Add Photos'}</span>
            </button>

            {/* Media Preview */}
            {media.length > 0 && (
              <div className={styles.mediaPreview}>
                {media.map((m, index) => (
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
              <p className={styles.previewContent}>{content}</p>
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
    </div>
  );
};

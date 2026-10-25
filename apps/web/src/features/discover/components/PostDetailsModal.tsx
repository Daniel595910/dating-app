import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Lock, Users, Globe } from 'lucide-react';
import { PublishDetails, Visibility } from '../types/discover.types';

interface PostDetailsModalProps {
  open: boolean;
  videoUrl: string | null;
  onClose: () => void;
  onPublish: (details: PublishDetails) => void;
  uploading: boolean;
  uploadProgress: number;
}

const MAX_CAPTION = 2000;
const MAX_HASHTAGS = 10;
const MAX_HASHTAG_LEN = 30;

export const PostDetailsModal: React.FC<PostDetailsModalProps> = ({
  open,
  videoUrl,
  onClose,
  onPublish,
  uploading,
  uploadProgress,
}) => {
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [locationText, setLocationText] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open) {
      setCaption('');
      setHashtagInput('');
      setHashtags([]);
      setVisibility('public');
      setLocationText('');
      setAllowComments(true);
      setAllowDuet(true);
      setErrorMsg(null);
    }
  }, [open]);

  if (!open || !videoUrl) return null;

  const addHashtag = (raw: string) => {
    const cleaned = raw.replace(/^#+/, '').replace(/\s+/g, '').slice(0, MAX_HASHTAG_LEN);
    if (!cleaned) return;
    if (hashtags.length >= MAX_HASHTAGS) {
      setErrorMsg('You can add up to ' + MAX_HASHTAGS + ' hashtags.');
      return;
    }
    if (hashtags.includes(cleaned)) {
      setHashtagInput('');
      return;
    }
    setHashtags([...hashtags, cleaned]);
    setHashtagInput('');
    setErrorMsg(null);
  };

  const handleHashtagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addHashtag(hashtagInput);
    } else if (e.key === 'Backspace' && !hashtagInput && hashtags.length > 0) {
      setHashtags(hashtags.slice(0, -1));
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handlePost = () => {
    if (uploading) return;
    if (!caption.trim() && hashtags.length === 0) {
      setErrorMsg('Add a caption or at least one hashtag.');
      return;
    }
    setErrorMsg(null);
    onPublish({
      caption: caption.trim(),
      hashtags,
      visibility,
      locationText: locationText.trim() || null,
      allowComments,
      allowDuet,
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
      }}
      onClick={() => !uploading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, height: '100dvh', margin: '0 auto',
          backgroundColor: '#fff', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottom: '1px solid #e5e7eb', flexShrink: 0,
        }}>
          <button
            onClick={() => !uploading && onClose()}
            disabled={uploading}
            aria-label="Back"
            style={{ background: 'none', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: '#111827', padding: 4, opacity: uploading ? 0.5 : 1 }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#111827' }}>Post details</h2>
          <div style={{ width: 32 }} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Video preview */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16', backgroundColor: '#000', maxHeight: 320 }}>
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* Caption */}
          <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8 }}>
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="Say something about your video..."
              disabled={uploading}
              rows={3}
              style={{
                width: '100%', padding: 10, fontSize: 14,
                border: '1px solid #e5e7eb', borderRadius: 8, resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 }}>
              {caption.length} / {MAX_CAPTION}
            </div>
          </div>

          {/* Hashtags */}
          <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8 }}>
              Hashtags ({hashtags.length}/{MAX_HASHTAGS})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    backgroundColor: '#fee2e2', color: '#b91c1c',
                    padding: '4px 10px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
                  }}
                >
                  #{tag}
                  <button
                    onClick={() => !uploading && removeHashtag(tag)}
                    aria-label={'Remove ' + tag}
                    style={{ background: 'none', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: '#b91c1c', padding: 0, display: 'flex' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={handleHashtagKey}
              onBlur={() => hashtagInput && addHashtag(hashtagInput)}
              placeholder="Add hashtag + Enter"
              disabled={uploading || hashtags.length >= MAX_HASHTAGS}
              style={{
                width: '100%', padding: 10, fontSize: 14,
                border: '1px solid #e5e7eb', borderRadius: 8, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Visibility */}
          <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8 }}>
              Who can see
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { value: 'public' as Visibility, label: 'Public', icon: Globe },
                { value: 'friends' as Visibility, label: 'Friends', icon: Users },
                { value: 'private' as Visibility, label: 'Private', icon: Lock },
              ]).map(({ value, label, icon: Icon }) => {
                const active = visibility === value;
                return (
                  <button
                    key={value}
                    onClick={() => !uploading && setVisibility(value)}
                    disabled={uploading}
                    style={{
                      flex: 1, padding: '10px 8px', fontSize: 13, fontWeight: 600,
                      border: '1px solid ' + (active ? '#ef4444' : '#e5e7eb'),
                      backgroundColor: active ? '#fef2f2' : '#fff',
                      color: active ? '#ef4444' : '#6b7280',
                      borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8 }}>
              Location (optional)
            </label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value.slice(0, 100))}
              placeholder="City, Country"
              disabled={uploading}
              style={{
                width: '100%', padding: 10, fontSize: 14,
                border: '1px solid #e5e7eb', borderRadius: 8, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Advanced */}
          <div style={{ padding: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 8 }}>
              Advanced settings
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#111827' }}>
              <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} disabled={uploading} />
              Allow comments
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#111827' }}>
              <input type="checkbox" checked={allowDuet} onChange={(e) => setAllowDuet(e.target.checked)} disabled={uploading} />
              Allow duet
            </label>
          </div>

          {errorMsg && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 8, fontSize: 13 }}>
                {errorMsg}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Post button + progress */}
        <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          {uploading && (
            <div style={{ width: '100%', height: 6, backgroundColor: '#f3f4f6', borderRadius: 9999, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ width: uploadProgress + '%', height: '100%', backgroundColor: '#ef4444', transition: 'width 0.2s' }} />
            </div>
          )}
          <button
            onClick={handlePost}
            disabled={uploading}
            style={{
              width: '100%', padding: 14,
              backgroundColor: uploading ? '#fca5a5' : '#ef4444',
              color: '#fff', border: 'none', borderRadius: 9999,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 16, fontWeight: 700,
            }}
          >
            {uploading ? 'Posting... ' + Math.round(uploadProgress) + '%' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
};
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Lock, Users, Globe, Volume2, VolumeX } from 'lucide-react';
import { PublishDetails, Visibility } from '../types/discover.types';
import { discoverService } from '../services/discover.service';
import { SUPPORTED_COUNTRIES } from '@/utils/ipGeolocation';

interface PostDetailsModalProps {
  open: boolean;
  videoUrl: string | null;
  onClose: () => void;
  onPublish: (details: PublishDetails) => void;
  uploading: boolean;
  uploadProgress: number;
}

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      width: 44,
      height: 24,
      borderRadius: 9999,
      backgroundColor: checked ? '#f97316' : '#d1d5db',
      position: 'relative',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.2s ease',
      flexShrink: 0,
      padding: 0,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 2,
        left: checked ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    />
  </button>
);

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
  const [isMuted, setIsMuted] = useState(true);
  const [suggestions, setSuggestions] = useState<Array<{ hashtag: string; usageCount: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const suggestionsTimeoutRef = useRef<any>(null);
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

  // Debounced hashtag search
  useEffect(() => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    const q = hashtagInput.trim().toLowerCase();
    if (!q || hashtags.length >= MAX_HASHTAGS) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestionsTimeoutRef.current = setTimeout(async () => {
      const results = await discoverService.searchHashtags(q, 8);
      const filtered = results.filter((r) => !hashtags.includes(r.hashtag));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setActiveSuggestion(0);
    }, 200);
    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, [hashtagInput, hashtags]);

  if (!open || !videoUrl) return null;

  const addHashtag = (raw: string) => {
    const cleaned = raw.replace(/^#+/, '').replace(/\s+/g, '').slice(0, MAX_HASHTAG_LEN).toLowerCase();
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
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        addHashtag(suggestions[activeSuggestion].hashtag);
        setShowSuggestions(false);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
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
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, height: '100dvh', margin: '0 auto',
          backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottom: '1px solid var(--color-border-strong)', flexShrink: 0,
        }}>
          <button
            onClick={() => !uploading && onClose()}
            disabled={uploading}
            aria-label="Back"
            style={{ background: 'none', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: 'var(--color-text)', padding: 4, opacity: uploading ? 0.5 : 1 }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Post details</h2>
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
              muted={isMuted}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <button
              onClick={() => setIsMuted((v) => !v)}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', border: 'none',
                borderRadius: '50%', width: 40, height: 40,
                cursor: 'pointer', color: 'var(--color-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 5,
              }}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          {/* Caption */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
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
                border: '1px solid var(--color-border-strong)', borderRadius: 8, resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 4 }}>
              {caption.length} / {MAX_CAPTION}
            </div>
          </div>

          {/* Hashtags */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
              Hashtags ({hashtags.length}/{MAX_HASHTAGS})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-danger)',
                    padding: '4px 10px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
                  }}
                >
                  #{tag}
                  <button
                    onClick={() => !uploading && removeHashtag(tag)}
                    aria-label={'Remove ' + tag}
                    style={{ background: 'none', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: 'var(--color-danger)', padding: 0, display: 'flex' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKey}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="Add hashtag + Enter"
                disabled={uploading || hashtags.length >= MAX_HASHTAGS}
                style={{
                  width: '100%', padding: 10, fontSize: 14,
                  border: '1px solid var(--color-border-strong)', borderRadius: 8, boxSizing: 'border-box',
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {suggestions.map((s, idx) => (
                    <button
                      key={s.hashtag}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addHashtag(s.hashtag);
                        setShowSuggestions(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        backgroundColor: idx === activeSuggestion ? '#fef2f2' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--color-text)',
                      }}
                    >
                      <span>#{s.hashtag}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.usageCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
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
                      border: '1px solid ' + (active ? 'var(--color-primary)' : 'var(--color-border-strong)'),
                      backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                      color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
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
          <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
              Location (optional)
            </label>
            <select
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              disabled={uploading}
              style={{
                width: '100%', padding: 10, fontSize: 14,
                border: '1px solid var(--color-border-strong)', borderRadius: 8, boxSizing: 'border-box',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">Select country (optional)</option>
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Advanced */}
          <div style={{ padding: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
              Advanced settings
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, fontSize: 14, color: 'var(--color-text)' }}>
              <span>Allow comments</span>
              <Toggle checked={allowComments} onChange={setAllowComments} disabled={uploading} label="Allow comments" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-text)' }}>
              <span>Allow duet</span>
              <Toggle checked={allowDuet} onChange={setAllowDuet} disabled={uploading} label="Allow duet" />
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-danger)', padding: 10, borderRadius: 8, fontSize: 13 }}>
                {errorMsg}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Post button + progress */}
        <div style={{ padding: 16, borderTop: '1px solid var(--color-border-strong)', flexShrink: 0 }}>
          {uploading && (
            <div style={{ width: '100%', height: 6, backgroundColor: 'var(--color-border)', borderRadius: 9999, overflow: 'hidden', marginBottom: 10 }}>
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

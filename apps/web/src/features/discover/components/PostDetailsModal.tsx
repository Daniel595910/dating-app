import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Lock, Globe, Volume2, VolumeX } from 'lucide-react';
import { PublishDetails, Visibility } from '../types/discover.types';
import { discoverService } from '../services/discover.service';
import { SUPPORTED_COUNTRIES } from '@/utils/ipGeolocation';
import styles from './PostDetailsModal.module.css';

interface PostDetailsModalProps {
  open: boolean;
  videoUrl: string | null;
  onClose: () => void;
  onPublish: (details: PublishDetails) => void;
  uploading: boolean;
  uploadProgress: number;
  theme?: 'light' | 'dark';
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
  theme,
}) => {
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [locationText, setLocationText] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [downloadEnabled, setDownloadEnabled] = useState(true);
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
      setDownloadEnabled(true);
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
      downloadEnabled,
    });
  };

  return (
    <div
      className={styles.backdrop}
      data-theme={theme || undefined}
      onClick={() => !uploading && onClose()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => !uploading && onClose()}
            disabled={uploading}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className={styles.headerTitle}>Post details</h2>
          <div className={styles.headerSpacer} />
        </div>

        {/* Scrollable body */}
        <div className={styles.body}>
          {/* Video preview */}
          <div className={styles.videoWrapper}>
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className={styles.videoPreview}
            />
            <button
              className={styles.muteBtn}
              onClick={() => setIsMuted((v) => !v)}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          {/* Caption */}
          <div className={styles.section}>
            <label className={styles.label}>Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="Say something about your video..."
              disabled={uploading}
              rows={4}
              className={styles.textarea}
            />
            <div className={styles.charCount + (caption.length > MAX_CAPTION * 0.9 ? ' ' + styles.charCountWarn : '')}>
              {caption.length} / {MAX_CAPTION}
            </div>
          </div>

          {/* Hashtags */}
          <div className={styles.section}>
            <label className={styles.label}>Hashtags ({hashtags.length}/{MAX_HASHTAGS})</label>
            {hashtags.length > 0 && (
              <div className={styles.chipRow}>
                {hashtags.map((tag) => (
                  <span key={tag} className={styles.chip}>
                    #{tag}
                    <button
                      onClick={() => !uploading && removeHashtag(tag)}
                      aria-label={'Remove ' + tag}
                      className={styles.chipRemove}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
                className={styles.inputBase}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestionsContainer}>
                  {suggestions.map((s, idx) => (
                    <button
                      key={s.hashtag}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addHashtag(s.hashtag);
                        setShowSuggestions(false);
                      }}
                      className={styles.suggestionItem + (idx === activeSuggestion ? ' ' + styles.suggestionItemActive : '')}
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
          <div className={styles.section}>
            <label className={styles.label}>Who can see</label>
            <div className={styles.segmented}>
              {([
                { value: 'public' as Visibility, label: 'Public', icon: Globe },
                { value: 'private' as Visibility, label: 'Private', icon: Lock },
              ]).map(({ value, label, icon: Icon }) => {
                const active = visibility === value;
                return (
                  <button
                    key={value}
                    onClick={() => !uploading && setVisibility(value)}
                    disabled={uploading}
                    className={styles.segmentBtn + (active ? ' ' + styles.segmentBtnActive : '')}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div className={styles.section}>
            <label className={styles.label}>Location (optional)</label>
            <select
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              disabled={uploading}
              className={styles.select}
            >
              <option value="">Select country (optional)</option>
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Advanced */}
          <div className={styles.section}>
            <label className={styles.label}>Advanced settings</label>
            <div className={styles.toggleRow}>
              <span>Allow comments</span>
              <Toggle checked={allowComments} onChange={setAllowComments} disabled={uploading} label="Allow comments" />
            </div>
            <div className={styles.toggleRow}>
              <span>Allow duet</span>
              <Toggle checked={allowDuet} onChange={setAllowDuet} disabled={uploading} label="Allow duet" />
            </div>
            <div className={styles.toggleRow}>
              <span>Allow downloads</span>
              <Toggle checked={downloadEnabled} onChange={setDownloadEnabled} disabled={uploading} label="Allow downloads" />
            </div>
          </div>

          {errorMsg && (
            <div className={styles.errorBanner}>{errorMsg}</div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {uploading && (
            <div className={styles.progressWrap}>
              <div className={styles.progressFill} style={{ width: uploadProgress + '%' }} />
            </div>
          )}
          <button
            className={styles.postBtn}
            onClick={handlePost}
            disabled={uploading}
          >
            {uploading ? 'Posting... ' + Math.round(uploadProgress) + '%' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

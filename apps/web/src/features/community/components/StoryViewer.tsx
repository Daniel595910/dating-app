import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Send } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/StoryViewer.module.css';

interface StoryItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  text_overlay: string | null;
  duration_seconds: number | null;
  created_at: string;
  viewed: boolean;
  liked_by_me: boolean;
  like_count: number;
}

interface StoryAuthor {
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  is_self: boolean;
  has_unseen: boolean;
  latest_at: string;
  stories: StoryItem[];
}

interface StoryViewerProps {
  open: boolean;
  onClose: () => void;
  initialAuthorId?: string | null;
}

const IMAGE_DURATION_MS = 5000;
const TICK_MS = 50;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ open, onClose, initialAuthorId }) => {
  const [authors, setAuthors] = useState<StoryAuthor[]>([]);
  const [authorIdx, setAuthorIdx] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyToast, setReplyToast] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  // Optimistic heart state: storyId -> { liked, count }
  const [likeOverrides, setLikeOverrides] = useState<Record<string, { liked: boolean; count: number }>>({});

  const touchStartY = useRef<number | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  const currentAuthor = authors[authorIdx];
  const currentStory = currentAuthor?.stories[storyIdx];

  // Effective paused state — either explicitly paused OR reply input focused
  const paused = inputFocused;

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setAuthorIdx(0);
    setStoryIdx(0);
    setProgress(0);
    setError(null);
    setReplyText('');
    setReplySending(false);
    setReplyToast(null);
    setInputFocused(false);
    setLikeOverrides({});
  }, [open]);

  // Fetch stories
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_viewable_stories');
        if (cancelled) return;
        if (rpcErr) throw rpcErr;
        const raw = data as unknown;
        const list: StoryAuthor[] = typeof raw === 'string' ? JSON.parse(raw) : ((raw as StoryAuthor[]) || []);
        setAuthors(list);

        if (initialAuthorId) {
          const idx = list.findIndex((a) => a.author_id === initialAuthorId);
          if (idx >= 0) setAuthorIdx(idx);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error('Failed to load stories:', err);
        setError(err?.message || 'Failed to load stories');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, initialAuthorId]);

  // Navigation
  const goNext = useCallback(() => {
    if (!currentAuthor) return;
    setReplyText('');
    setReplyToast(null);
    if (storyIdx < currentAuthor.stories.length - 1) {
      setStoryIdx((i) => i + 1);
      setProgress(0);
    } else if (authorIdx < authors.length - 1) {
      setAuthorIdx((i) => i + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [authorIdx, authors.length, currentAuthor, onClose, storyIdx]);

  const goPrev = useCallback(() => {
    if (!currentAuthor) return;
    setReplyText('');
    setReplyToast(null);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
      setProgress(0);
    } else if (authorIdx > 0) {
      setAuthorIdx((i) => i - 1);
      setStoryIdx(0);
      setProgress(0);
    }
  }, [authorIdx, currentAuthor, storyIdx]);

  // Reset progress on story change
  useEffect(() => {
    setProgress(0);
  }, [authorIdx, storyIdx]);

  // Mark viewed
  useEffect(() => {
    if (!open || !currentStory) return;
    if (currentStory.viewed) return;
    supabase.rpc('mark_story_viewed', { p_story_id: currentStory.id }).then(({ error: e }) => {
      if (e) console.warn('mark_story_viewed failed:', e.message);
    });
  }, [open, currentStory]);

  // Progress timer
  useEffect(() => {
    if (!open || !currentStory || paused) return;

    const isVideo = currentStory.media_type === 'video';
    const durationMs = isVideo
      ? Math.min((currentStory.duration_seconds || 15) * 1000, 15000)
      : IMAGE_DURATION_MS;
    const step = (TICK_MS / durationMs) * 100;

    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(100, p + step));
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [open, currentStory, paused, authorIdx, storyIdx]);

  // Auto-advance when full
  useEffect(() => {
    if (!open) return;
    if (progress < 100) return;
    goNext();
  }, [open, progress, goNext]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (document.activeElement === replyInputRef.current) return;
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goNext, goPrev]);

  // Heart toggle
  const handleHeart = async () => {
    if (!currentStory || currentAuthor?.is_self) return;

    const storyId = currentStory.id;
    const current = likeOverrides[storyId] || {
      liked: currentStory.liked_by_me,
      count: currentStory.like_count,
    };
    const nextLiked = !current.liked;
    const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1));

    // Optimistic
    setLikeOverrides((prev) => ({ ...prev, [storyId]: { liked: nextLiked, count: nextCount } }));

    try {
      const rpc = nextLiked ? 'like_story' : 'unlike_story';
      const { error: e } = await supabase.rpc(rpc, { p_story_id: storyId });
      if (e) throw e;
    } catch (err: any) {
      console.warn('Heart toggle failed:', err?.message || err);
      // Revert
      setLikeOverrides((prev) => ({ ...prev, [storyId]: current }));
    }
  };

  // Reply send
  const handleSendReply = async () => {
    if (!currentStory || replySending) return;
    const text = replyText.trim();
    if (!text) return;

    setReplySending(true);
    try {
      const { data, error: e } = await supabase.rpc('notify_story_reply', {
        p_story_id: currentStory.id,
        p_text: text,
      });
      if (e) throw e;

      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        setReplyToast(result?.error || 'Could not send reply');
        setTimeout(() => setReplyToast(null), 2500);
        return;
      }

      setReplyText('');
      setReplyToast('Reply sent');
      setTimeout(() => setReplyToast(null), 1500);
    } catch (err: any) {
      console.warn('Reply failed:', err?.message || err);
      setReplyToast('Reply failed');
      setTimeout(() => setReplyToast(null), 2500);
    } finally {
      setReplySending(false);
    }
  };

  if (!open) return null;

  const hasAuthors = authors.length > 0;
  const hasStory = Boolean(currentStory);
  const isSelfStory = Boolean(currentAuthor?.is_self);

  const likeState = currentStory
    ? (likeOverrides[currentStory.id] || {
        liked: currentStory.liked_by_me,
        count: currentStory.like_count,
      })
    : { liked: false, count: 0 };

  return (
    <div
      className={styles.overlay}
      onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        if (touchStartY.current === null) return;
        const dy = e.touches[0].clientY - touchStartY.current;
        if (dy > 100) { touchStartY.current = null; onClose(); }
      }}
      onTouchEnd={() => { touchStartY.current = null; }}
    >
      <div className={styles.stage} onClick={(e) => e.stopPropagation()}>
        {hasStory && (
          <div className={styles.progressBars}>
            {currentAuthor.stories.map((s, i) => (
              <div key={s.id} className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width:
                      i < storyIdx ? '100%'
                      : i === storyIdx ? `${progress}%`
                      : '0%',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {hasStory && (
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatarWrap}>
                {currentAuthor.author_avatar ? (
                  <img src={currentAuthor.author_avatar} alt="" className={styles.avatar} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {currentAuthor.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.meta}>
                <span className={styles.name}>{currentAuthor.author_name}</span>
                <span className={styles.time}>{timeAgo(currentStory.created_at)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className={styles.closeBtn}
            >
              <X size={22} />
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.centerState}>Loading stories…</div>
        ) : error ? (
          <div className={styles.centerState}>{error}</div>
        ) : !hasAuthors ? (
          <div className={styles.centerState}>No stories yet.</div>
        ) : hasStory ? (
          <div className={styles.mediaWrap}>
            {currentStory.media_type === 'image' ? (
              <img
                src={currentStory.media_url}
                alt={currentStory.text_overlay || ''}
                className={styles.media}
                draggable={false}
              />
            ) : (
              <video
                src={currentStory.media_url}
                className={styles.media}
                autoPlay
                muted
                playsInline
                onEnded={goNext}
              />
            )}
            {currentStory.text_overlay && (
              <div className={styles.textOverlay}>{currentStory.text_overlay}</div>
            )}
          </div>
        ) : null}

        {hasStory && (
          <>
            <button
              className={styles.tapPrev}
              aria-label="Previous story"
              onClick={goPrev}
            >
              <ChevronLeft size={28} />
            </button>
            <button
              className={styles.tapNext}
              aria-label="Next story"
              onClick={goNext}
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {hasStory && !loading && !error && (
          <div className={styles.toolbar}>
            {isSelfStory ? (
              <div className={styles.selfFooter}>
                <span className={styles.likeCount}>
                  <Heart size={14} fill="currentColor" />
                  {likeState.count} {likeState.count === 1 ? 'like' : 'likes'}
                </span>
              </div>
            ) : (
              <>
                <div className={styles.replyWrap}>
                  <input
                    ref={replyInputRef}
                    type="text"
                    className={styles.replyInput}
                    placeholder={`Reply to ${currentAuthor.author_name}…`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    disabled={replySending}
                    maxLength={500}
                  />
                  {replyText.trim().length > 0 && (
                    <button
                      className={styles.sendBtn}
                      onClick={handleSendReply}
                      disabled={replySending}
                      aria-label="Send reply"
                    >
                      <Send size={18} />
                    </button>
                  )}
                </div>
                <button
                  className={`${styles.heartBtn} ${likeState.liked ? styles.heartBtnLiked : ''}`}
                  onClick={handleHeart}
                  aria-label={likeState.liked ? 'Unlike' : 'Like'}
                >
                  <Heart size={26} fill={likeState.liked ? 'currentColor' : 'none'} />
                </button>
              </>
            )}
          </div>
        )}

        {replyToast && (
          <div className={styles.toast}>{replyToast}</div>
        )}
      </div>
    </div>
  );
};
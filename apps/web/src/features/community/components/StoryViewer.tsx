import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Send, MoreVertical, Trash2, Share2 } from 'lucide-react';
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
  initialStoryId?: string | null;
}

const IMAGE_DURATION_MS = 5000;
const TICK_MS = 50;
const LONG_PRESS_DELAY_MS = 120;

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

export const StoryViewer: React.FC<StoryViewerProps> = ({
  open,
  onClose,
  initialAuthorId,
  initialStoryId,
}) => {
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
  const [holdingPause, setHoldingPause] = useState(false);

  const [ownMenuOpen, setOwnMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [likeOverrides, setLikeOverrides] = useState<Record<string, { liked: boolean; count: number }>>({});

  const touchStartY = useRef<number | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAuthor = authors[authorIdx];
  const currentStory = currentAuthor?.stories[storyIdx];

  const paused = inputFocused || holdingPause || ownMenuOpen || deleteConfirmOpen;

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
    setHoldingPause(false);
    setOwnMenuOpen(false);
    setDeleteConfirmOpen(false);
    setDeleting(false);
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

        if (initialStoryId) {
          for (let ai = 0; ai < list.length; ai++) {
            const si = list[ai].stories.findIndex((s) => s.id === initialStoryId);
            if (si >= 0) {
              setAuthorIdx(ai);
              setStoryIdx(si);
              return;
            }
          }
        }
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
  }, [open, initialAuthorId, initialStoryId]);

  // Navigation
  const goNext = useCallback(() => {
    if (!currentAuthor) return;
    setReplyText('');
    setReplyToast(null);
    setOwnMenuOpen(false);
    setDeleteConfirmOpen(false);
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
    setOwnMenuOpen(false);
    setDeleteConfirmOpen(false);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
      setProgress(0);
    } else if (authorIdx > 0) {
      setAuthorIdx((i) => i - 1);
      setStoryIdx(0);
      setProgress(0);
    }
  }, [authorIdx, currentAuthor, storyIdx]);

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

  // Auto-advance
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

  // Long-press-to-pause
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Ignore taps on interactive controls
    if (target.closest('button') || target.closest('input') || target.closest('[role="button"]')) {
      return;
    }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setHoldingPause(true);
    }, LONG_PRESS_DELAY_MS);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setHoldingPause(false);
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

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

    setLikeOverrides((prev) => ({ ...prev, [storyId]: { liked: nextLiked, count: nextCount } }));

    try {
      const rpc = nextLiked ? 'like_story' : 'unlike_story';
      const { error: e } = await supabase.rpc(rpc, { p_story_id: storyId });
      if (e) throw e;
    } catch (err: any) {
      console.warn('Heart toggle failed:', err?.message || err);
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

  // Delete current story (own stories only)
  const handleDeleteCurrentStory = async () => {
    if (!currentStory || !currentAuthor?.is_self || deleting) return;
    setDeleting(true);

    try {
      const { error: e } = await supabase
        .from('stories')
        .delete()
        .eq('id', currentStory.id);

      if (e) throw e;

      // Local cleanup + advance
      const totalBefore = currentAuthor.stories.length;
      setAuthors((prev) =>
        prev.map((a, i) => {
          if (i !== authorIdx) return a;
          return { ...a, stories: a.stories.filter((s) => s.id !== currentStory.id) };
        })
      );

      setOwnMenuOpen(false);
      setDeleteConfirmOpen(false);

      if (totalBefore <= 1) {
        if (authorIdx < authors.length - 1) {
          setAuthorIdx((i) => i + 1);
          setStoryIdx(0);
        } else {
          onClose();
        }
      } else if (storyIdx >= totalBefore - 1) {
        setStoryIdx(storyIdx - 1);
      }
      setProgress(0);
      setReplyToast('Story deleted');
      setTimeout(() => setReplyToast(null), 1500);
    } catch (err: any) {
      console.warn('Delete story failed:', err?.message || err);
      setReplyToast('Delete failed');
      setTimeout(() => setReplyToast(null), 2000);
    } finally {
      setDeleting(false);
    }
  };

  // Share current story (Web Share API with clipboard fallback)
  const handleShareCurrentStory = async () => {
    if (!currentStory) return;
    const url = currentStory.media_url;
    const title = `${currentAuthor?.author_name || 'Story'} on Spensive`;

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, url });
        setReplyToast('Shared');
        setTimeout(() => setReplyToast(null), 1200);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setReplyToast('Link copied');
        setTimeout(() => setReplyToast(null), 1500);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Share failed:', err?.message || err);
      }
    } finally {
      setOwnMenuOpen(false);
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
      <div
        className={styles.stage}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
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
            <div className={styles.authorControls}>
              {isSelfStory && (
                <button
                  onClick={() => setOwnMenuOpen((v) => !v)}
                  aria-label="Story options"
                  className={styles.closeBtn}
                  disabled={deleting}
                >
                  <MoreVertical size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            {ownMenuOpen && isSelfStory && (
              <div className={styles.menuPopover} onClick={(e) => e.stopPropagation()}>
                {!deleteConfirmOpen ? (
                  <>
                    <button
                      className={styles.menuItem}
                      onClick={handleShareCurrentStory}
                    >
                      <Share2 size={16} />
                      Share story
                    </button>
                    <button
                      className={`${styles.menuItem} ${styles.menuItemDanger}`}
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 size={16} />
                      Delete story
                    </button>
                  </>
                ) : (
                  <div className={styles.confirmBox}>
                    <p className={styles.confirmText}>Delete this story?</p>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.confirmBtn}
                        onClick={() => setDeleteConfirmOpen(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                      <button
                        className={`${styles.confirmBtn} ${styles.confirmBtnDanger}`}
                        onClick={handleDeleteCurrentStory}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
            {/* Blurred background fill */}
            <div className={styles.blurFill} aria-hidden="true">
              {currentStory.media_type === 'image' ? (
                <img src={currentStory.media_url} alt="" className={styles.blurFillMedia} draggable={false} />
              ) : (
                <video src={currentStory.media_url} className={styles.blurFillMedia} autoPlay muted loop playsInline />
              )}
            </div>
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
                preload="metadata"
                crossOrigin="anonymous"
                onEnded={goNext}
              onError={(e) => { console.warn('[video-load-error]', (e.target as HTMLVideoElement).error, currentStory.media_url); }}
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

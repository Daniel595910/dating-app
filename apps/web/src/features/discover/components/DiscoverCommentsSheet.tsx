import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Trash2, Heart, Loader, MessageCircle, CornerDownRight, ChevronDown, ChevronUp, Smile, Sticker, Gift } from 'lucide-react';
import { discoverService } from '../services/discover.service';
import styles from './DiscoverCommentsSheet.module.css';

interface DiscoverCommentsSheetProps {
  open: boolean;
  videoId: string | null;
  currentUserId: string | null;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  onCommentCountChange?: (videoId: string, count: number) => void;
}

interface CommentNode {
  id: string;
  videoId: string;
  authorId: string;
  parentId: string | null;
  rootId: string | null;
  content: string;
  contentType: string;
  mediaUrl: string | null;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
  reactionCount: number;
  userReacted: boolean;
  children: CommentNode[];
  replyCount: number;
  replyingToName: string | null;
}

const EMOJIS = ['😀','😂','😍','😭','😡','👍','🙏','🔥','❤️','💯','🎉','🌹','🎁','🥰','😮','😢','✨','💋','🦋','🌈','⭐','💎','👑','🤔','👀'];

const QUICK_REACTIONS: string[][] = [
  ['😄','😂','😄'],
  ['🌹','🌹','🌹'],
  ['🥰','😍','🥰'],
  ['😄','😂'],
  ['🔥','💯','🔥'],
  ['😮','😢','😮'],
];
const REPLIES_PER_PAGE = 3;

const timeAgo = (dateStr: string): string => {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd';
  return new Date(dateStr).toLocaleDateString();
};

export const DiscoverCommentsSheet: React.FC<DiscoverCommentsSheetProps> = ({
  open,
  videoId,
  currentUserId,
  onClose,
  onCommentAdded,
  onCommentDeleted,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<CommentNode | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replyPages, setReplyPages] = useState<Map<string, number>>(new Map());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // Composer States
  const [composerOpen, setComposerOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [stickerTab, setStickerTab] = useState<'stickers' | 'gifs'>('stickers');

  const [gifts, setGifts] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [gifs, setGifs] = useState<any[]>([]);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);

  const totalCount = (nodes: CommentNode[]): number => {
    let n = nodes.length;
    nodes.forEach((c) => { n += totalCount(c.children); });
    return n;
  };

  const loadComments = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await discoverService.fetchVideoComments(id);
      setComments(data as CommentNode[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !currentUserId) return;
    (async () => {
      const { supabase } = await import('@/config/supabase.client');
      const { data } = await supabase.from('profiles').select('avatar_url').eq('user_id', currentUserId).maybeSingle();
      setCurrentUserAvatar(data?.avatar_url || null);
    })();
  }, [open, currentUserId]);

  // Keyboard tracking only when composer is open
  useEffect(() => {
    if (!composerOpen || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      const kbHeight = Math.max(0, kb);
      setKeyboardOpen(kbHeight > 80);
      document.documentElement.style.setProperty('--spensive-kb-height', String(kbHeight) + 'px');
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--spensive-kb-height');
    };
  }, [composerOpen]);

  const refreshCount = useCallback(async (vId: string) => {
    if (!onCommentCountChange) return;
    const { supabase } = await import('@/config/supabase.client');
    const { data } = await supabase.from('discover_videos').select('comment_count').eq('id', vId).maybeSingle();
    onCommentCountChange(vId, data?.comment_count || 0);
  }, [onCommentCountChange]);

  useEffect(() => {
    if (open && videoId) {
      loadComments(videoId);
    }
    if (!open) {
      setReplyingTo(null);
      setInput('');
      setShowEmoji(false);
      setShowStickers(false);
      setShowGift(false);
      setComposerOpen(false);
    }
  }, [open, videoId, loadComments]);

  useEffect(() => {
    (async () => {
      const { supabase } = await import('@/config/supabase.client');
      const { data: stickersData } = await supabase.from('stickers').select('*').eq('is_active', true).limit(50);
      const { data: gifsData } = await supabase.from('gifs').select('*').eq('is_active', true).limit(50);
      const { data: giftsData } = await supabase.from('gifts').select('*').eq('is_active', true).order('sort_order').limit(50);
      setStickers(stickersData || []);
      setGifs(gifsData || []);
      setGifts(giftsData || []);
    })();
  }, []);

  useEffect(() => {
    if (!open || !videoId) return;
    let cancelled = false;

    (async () => {
      const { supabase } = await import('@/config/supabase.client');
      if (channelRef.current) {
        try { await supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
      const channelName = 'comments:' + videoId + ':' + Date.now();
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'discover_video_comments', filter: 'video_id=eq.' + videoId }, () => { if (!cancelled) loadComments(videoId); })
        .subscribe();
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      (async () => {
        if (channelRef.current) {
          try {
            const { supabase } = await import('@/config/supabase.client');
            await supabase.removeChannel(channelRef.current);
          } catch {}
          channelRef.current = null;
        }
      })();
    };
  }, [open, videoId, loadComments]);

  if (!open || !videoId) return null;

  const handleSend = async (contentType: string = 'text', mediaUrl: string | null = null, overrideContent: string | null = null) => {
    const text = overrideContent !== null ? overrideContent : input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const parentId = replyingTo?.id || null;
      const result = await discoverService.addVideoComment(videoId, text, parentId, contentType, mediaUrl);
      if (!result) {
        setError('Failed to post comment');
        return;
      }
      if (parentId) {
        setExpandedThreads((prev) => {
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
      }
      setInput('');
      setReplyingTo(null);
      setShowEmoji(false);
      setShowStickers(false);
      setShowGift(false);
      setComposerOpen(false);
      await loadComments(videoId);
      onCommentAdded?.();
      await refreshCount(videoId);
    } catch (e: any) {
      setError(e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setConfirmDelete(null);
    const ok = await discoverService.deleteVideoComment(commentId);
    if (ok) {
      await loadComments(videoId);
      onCommentDeleted?.();
      await refreshCount(videoId);
    } else {
      setError('Failed to delete comment');
    }
  };

  const handleReact = async (commentId: string) => {
    const updateNode = (nodes: CommentNode[]): CommentNode[] => {
      return nodes.map((node) => {
        if (node.id === commentId) {
          return {
            ...node,
            reactionCount: node.userReacted ? Math.max(node.reactionCount - 1, 0) : node.reactionCount + 1,
            userReacted: !node.userReacted,
          };
        }
        if (node.children.length > 0) return { ...node, children: updateNode(node.children) };
        return node;
      });
    };
    setComments((prev) => updateNode(prev));
    await discoverService.toggleCommentReaction(commentId);
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      if (replyingTo) setReplyingTo(null);
      else setComposerOpen(false);
    }
  };

  const flattenReplies = (comment: CommentNode, result: CommentNode[] = []): CommentNode[] => {
    comment.children.forEach((child) => {
      result.push(child);
      if (child.children.length > 0) flattenReplies(child, result);
    });
    return result;
  };

  const renderComment = (comment: CommentNode) => {
    const isExpanded = expandedThreads.has(comment.id);
    const allReplies = isExpanded ? flattenReplies(comment) : [];
    const page = replyPages.get(comment.id) || 1;
    const visibleReplies = allReplies.slice(0, page * REPLIES_PER_PAGE);
    const hasMore = allReplies.length > page * REPLIES_PER_PAGE;

    return (
      <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--color-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: 14 }}>
            {comment.authorAvatarUrl ? <img src={comment.authorAvatarUrl} alt={comment.authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{comment.authorName.charAt(0).toUpperCase()}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>{comment.authorName}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{timeAgo(comment.createdAt)}</span>
            </div>
            {comment.replyingToName && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 2 }}>Replying to @{comment.replyingToName}</div>}
            {(comment.contentType === 'sticker' || comment.contentType === 'gif') && comment.mediaUrl ? (
              <img src={comment.mediaUrl} alt={comment.content} style={{ width: 120, height: 120, objectFit: 'contain' }} />
            ) : (
              <div className={styles.commentBubble + (currentUserId === comment.authorId ? ' ' + styles.commentBubbleOwn : '')}>{comment.content}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <button onClick={() => handleReact(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, color: comment.userReacted ? '#ef4444' : '#9ca3af', fontSize: 12, fontWeight: 600 }}>
                <Heart size={13} fill={comment.userReacted ? '#ef4444' : 'none'} />
                {comment.reactionCount > 0 && <span>{comment.reactionCount}</span>}
              </button>
              <button onClick={() => { setReplyingTo(comment); setComposerOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}>Reply</button>
              {comment.replyCount > 0 && (
                <button onClick={() => toggleThread(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {isExpanded ? 'Hide' : comment.replyCount + ' ' + (comment.replyCount === 1 ? 'reply' : 'replies')}
                </button>
              )}
              {currentUserId === comment.authorId && (
                <button onClick={() => setConfirmDelete(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)', display: 'flex' }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
        {isExpanded && visibleReplies.length > 0 && (
          <div style={{ marginLeft: 46, display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '2px solid var(--color-border)', paddingLeft: 12 }}>
            {visibleReplies.map((r) => (
              <div key={r.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--color-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                  {r.authorAvatarUrl ? <img src={r.authorAvatarUrl} alt={r.authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{r.authorName.charAt(0).toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text)' }}>{r.authorName}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.replyingToName && <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 2 }}>Replying to @{r.replyingToName}</div>}
                  {(r.contentType === 'sticker' || r.contentType === 'gif') && r.mediaUrl ? (
                    <img src={r.mediaUrl} alt={r.content} style={{ width: 80, height: 80, objectFit: 'contain' }} />
                  ) : (
                    <div className={styles.replyBubble + (currentUserId === r.authorId ? ' ' + styles.replyBubbleOwn : '')}>{r.content}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <button onClick={() => handleReact(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3, color: r.userReacted ? '#ef4444' : '#9ca3af', fontSize: 11, fontWeight: 600 }}>
                      <Heart size={11} fill={r.userReacted ? '#ef4444' : 'none'} />
                      {r.reactionCount > 0 && <span>{r.reactionCount}</span>}
                    </button>
                    <button onClick={() => { setReplyingTo(comment); setComposerOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 600 }}>Reply</button>
                    {currentUserId === r.authorId && (
                      <button onClick={() => setConfirmDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)', display: 'flex' }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {hasMore && (
              <button onClick={() => setReplyPages((prev) => { const m = new Map(prev); m.set(comment.id, page + 1); return m; })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
                View {allReplies.length - page * REPLIES_PER_PAGE} more {allReplies.length - page * REPLIES_PER_PAGE === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1002, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 480, height: '80dvh',
            backgroundColor: 'var(--color-surface)', borderRadius: '32px 32px 0 0',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ position: 'relative', padding: 16, borderBottom: '1px solid var(--color-border-strong)', flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--color-border-strong)', borderRadius: 9999, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 6 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Comments ({totalCount(comments)})
              </h2>
              <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-secondary)' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : comments.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <MessageCircle size={48} style={{ color: 'var(--color-text-disabled)' }} />
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>No comments yet</p>
                <p style={{ fontSize: 13, margin: 0 }}>Be the first to comment!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {comments.map((c) => renderComment(c))}
              </div>
            )}
          </div>

          {error && <div style={{ padding: '0 16px 8px', color: 'var(--color-danger)', fontSize: 12 }}>{error}</div>}

          {/* Fake Composer Bar */}
          <div className={styles.fakeComposerBar} onClick={() => setComposerOpen(true)}>
            <div className={styles.composerAvatar}>
              {currentUserAvatar ? <img src={currentUserAvatar} alt="" /> : <span>?</span>}
            </div>
            <div className={styles.fakeInput}>
              {replyingTo ? 'Reply to @' + replyingTo.authorName + '...' : 'Add a comment...'}
            </div>
          </div>
        </div>
      </div>

      {/* COMPOSER MODAL */}
      {composerOpen && (
        <div
          className={styles.composerOverlay}
          onClick={() => setComposerOpen(false)}
          style={{
            bottom: keyboardOpen ? 'var(--spensive-kb-height)' : 0,
            transition: 'bottom 0.15s ease',
          }}
        >
          <div className={styles.composerSheet} onClick={(e) => e.stopPropagation()}>
            {replyingTo && (
              <div style={{ padding: '6px 12px', backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
                <CornerDownRight size={12} />
                <span style={{ flex: 1 }}>Replying to <strong>@{replyingTo.authorName}</strong></span>
                <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', padding: 0 }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {showEmoji && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border-strong)', display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                {EMOJIS.map((em) => (
                  <button key={em} onClick={() => setInput((prev) => prev + em)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, borderRadius: 6 }}>
                    {em}
                  </button>
                ))}
              </div>
            )}

            {showStickers && (
              <div className={styles.stickerPanel}>
                <div className={styles.stickerTabs}>
                  <button onClick={() => setStickerTab('stickers')} className={styles.stickerTab + (stickerTab === 'stickers' ? ' ' + styles.stickerTabActive : '')}>Stickers</button>
                  <button onClick={() => setStickerTab('gifs')} className={styles.stickerTab + (stickerTab === 'gifs' ? ' ' + styles.stickerTabActive : '')}>GIFs</button>
                </div>
                <div className={styles.stickerGrid}>
                  {stickerTab === 'stickers' ? (
                    stickers.map((st) => (
                      <button key={st.id} onClick={() => handleSend('sticker', st.image_url, st.name || 'Sticker')} className={styles.stickerCell}>
                        <img src={st.thumbnail_url || st.image_url} alt="Sticker" className={styles.stickerCellImage} />
                      </button>
                    ))
                  ) : (
                    gifs.map((gf) => (
                      <button key={gf.id} onClick={() => handleSend('gif', gf.gif_url, gf.title || 'GIF')} className={styles.stickerCell}>
                        <img src={gf.preview_url || gf.gif_url} alt="GIF" className={styles.stickerCellImage} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {showGift && (
              <div className={styles.stickerPanel}>
                <div className={styles.stickerGrid}>
                  {gifts.map((gf) => (
                    <button key={gf.id} onClick={() => handleSend('gift', gf.icon_url, gf.name)} className={styles.stickerCell}>
                      <span style={{ fontSize: '28px' }}>{gf.icon_url}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600 }}>{gf.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.reactionScroll}>
              {QUICK_REACTIONS.map((group, i) => (
                <button key={i} type="button" className={styles.reactionChip} onClick={() => setInput((prev) => prev + group.join(''))}>
                  {group.join('')}
                </button>
              ))}
            </div>

            <div className={styles.inputRow}>
              <div className={styles.composerAvatar}>
                {currentUserAvatar ? <img src={currentUserAvatar} alt="" /> : <span>?</span>}
              </div>
              <div className={styles.inputPillWrapper}>
                <textarea
                  ref={inputRef}
                  className={styles.commentInputPill}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={replyingTo ? 'Reply to @' + replyingTo.authorName + '...' : 'Add comment...'}
                  rows={1}
                  disabled={sending}
                  autoFocus
                />
                <div className={styles.pillIcons}>
                  <button type="button" onClick={() => { setShowEmoji((v) => !v); setShowStickers(false); setShowGift(false); }} className={styles.pillIconBtn + (showEmoji ? ' ' + styles.pillIconBtnActive : '')}>
                    <Smile size={18} />
                  </button>
                  <button type="button" onClick={() => { setShowStickers((v) => !v); setShowEmoji(false); setShowGift(false); }} className={styles.pillIconBtn + (showStickers ? ' ' + styles.pillIconBtnActive : '')}>
                    <Sticker size={18} />
                  </button>
                  <button type="button" onClick={() => { setShowGift((v) => !v); setShowEmoji(false); setShowStickers(false); }} className={styles.pillIconBtn + (showGift ? ' ' + styles.pillIconBtnActive : '')}>
                    <Gift size={18} />
                  </button>
                  <button type="button" onClick={() => handleSend()} disabled={!input.trim() || sending} className={styles.inlineSendButton + (input.trim() && !sending ? ' ' + styles.inlineSendButtonActive : '')}>
                    {sending ? <Loader size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--color-surface)', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <Trash2 size={32} style={{ color: '#ef4444', marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-text)' }}>Delete comment?</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 16px', backgroundColor: 'var(--color-border)', color: 'var(--color-text)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, padding: '10px 16px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
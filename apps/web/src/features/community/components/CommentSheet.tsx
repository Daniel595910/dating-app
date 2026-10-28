import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Trash2, Heart, ChevronDown, ChevronUp, Smile, Reply, CornerDownRight, MessageCircle, Loader, Sticker, Gift } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/CommentSheet.module.css';

interface CommentSheetProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  userId: string;
  onCommentAdded?: () => void;
}

interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
}

interface CommentNode {
  id: string;
  postId: string;
  author: CommentAuthor;
  content: string;
  createdAt: string;
  parentId: string | null;
  rootId: string | null;
  contentType: string;
  mediaUrl: string | null;
  children: CommentNode[];
  reactionCount: number;
  userReacted: boolean;
  isOwn: boolean;
  replyCount: number;
  replyingToName: string | null;
}

const EMOJIS = ['😀', '😂', '😍', '😭', '😡', '👍', '🙏', '🔥', '❤️', '💯', '🎉', '🌹', '💐', '🎁', '💝', '🥰', '😮', '😢', '✨', '💋', '🦋', '🌈', '⭐', '💎', '👑'];

// Exact match from Discover
const QUICK_REACTIONS: string[][] = [
  ['😄','😂','😄'],
  ['🌹','🌹','🌹'],
  ['🥰','😍','🥰'],
  ['😄','😂'],
  ['🔥','💯','🔥'],
  ['😮','😢','😮'],
];

const REPLIES_PER_PAGE = 3;

export const CommentSheet: React.FC<CommentSheetProps> = ({ open, onClose, postId, userId, onCommentAdded }) => {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentNode | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replyPages, setReplyPages] = useState<Map<string, number>>(new Map());
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  
  // Discover Style state
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  
  // Sticker & Gift state
  const [showSticker, setShowSticker] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const profileCacheRef = useRef<Map<string, CommentAuthor>>(new Map());

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd';
    return new Date(dateString).toLocaleDateString();
  };

  const fetchProfiles = useCallback(async (authorIds: string[]) => {
    const uniqueIds = [...new Set(authorIds)];
    const missingIds = uniqueIds.filter((id) => !profileCacheRef.current.has(id));
    if (missingIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, is_verified')
      .in('user_id', missingIds);

    (data || []).forEach((p: any) => {
      profileCacheRef.current.set(p.user_id, {
        id: p.user_id,
        name: p.display_name || 'User',
        avatarUrl: p.avatar_url || null,
        verified: p.is_verified || false,
      });
    });
  }, []);

  const buildTree = useCallback((flatComments: any[]): CommentNode[] => {
    const nodeMap = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];

    flatComments.forEach((c: any) => {
      const profile = profileCacheRef.current.get(c.author_id);
      nodeMap.set(c.id, {
        id: c.id,
        postId: c.post_id,
        author: profile || { id: c.author_id, name: 'User', avatarUrl: null, verified: false },
        content: c.content || '',
        createdAt: c.created_at,
        parentId: c.parent_id,
        rootId: c.root_id,
        contentType: c.content_type || 'text',
        mediaUrl: c.media_url || null,
        children: [],
        reactionCount: 0,
        userReacted: false,
        isOwn: c.author_id === userId,
        replyCount: 0,
        replyingToName: null,
      });
    });

    flatComments.forEach((c: any) => {
      const node = nodeMap.get(c.id)!;
      if (c.parent_id && nodeMap.has(c.parent_id)) {
        const parent = nodeMap.get(c.parent_id)!;
        node.replyingToName = parent.author.name;
      }
    });

    flatComments.forEach((c: any) => {
      const node = nodeMap.get(c.id)!;
      if (c.parent_id && nodeMap.has(c.parent_id)) {
        const parent = nodeMap.get(c.parent_id)!;
        parent.children.push(node);
        parent.replyCount++;
      } else if (!c.parent_id) {
        roots.push(node);
      }
    });

    return roots;
  }, [userId]);

  const fetchComments = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);

    try {
      const { data: topLevel, error: topError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (topError) throw topError;

      if (topLevel && topLevel.length > 0) {
        const topIds = topLevel.map((c: any) => c.id);

        const { data: replies, error: replyError } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .eq('status', 'published')
          .in('root_id', topIds)
          .not('parent_id', 'is', null)
          .order('created_at', { ascending: true })
          .limit(100);

        if (replyError) throw replyError;

        const allComments = [...topLevel, ...(replies || [])];
        await fetchProfiles(allComments.map((c: any) => c.author_id));

        const allIds = allComments.map((c: any) => c.id);
        const { data: reactions } = await supabase
          .from('comment_reactions')
          .select('comment_id, user_id')
          .in('comment_id', allIds);

        const reactionMap = new Map<string, string[]>();
        (reactions || []).forEach((r: any) => {
          if (!reactionMap.has(r.comment_id)) reactionMap.set(r.comment_id, []);
          reactionMap.get(r.comment_id)!.push(r.user_id);
        });

        const tree = buildTree(allComments);

        const applyReactions = (nodes: CommentNode[]) => {
          nodes.forEach((node) => {
            const nodeReactions = reactionMap.get(node.id) || [];
            node.reactionCount = nodeReactions.length;
            node.userReacted = nodeReactions.includes(userId);
            if (node.children.length > 0) applyReactions(node.children);
          });
        };
        applyReactions(tree);

        setComments(tree);
      } else {
        setComments([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [open, postId, userId, fetchProfiles, buildTree]);

  useEffect(() => {
    if (open) {
      fetchComments();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    if (!open) {
      setShowEmoji(false);
      setShowSticker(false);
      setShowGift(false);
    }
  }, [open, fetchComments]);

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => {
        fetchComments();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [open, postId, fetchComments]);

  // Discover Style: Fetch current user avatar
  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      setCurrentUserAvatar(data?.avatar_url || null);
    })();
  }, [open, userId]);

  // Load stickers and gifts
  useEffect(() => {
    if (!open) return;
    supabase.from('stickers').select('*').eq('is_active', true).limit(50).then(({ data }) => setStickers(data || []));
    supabase.from('gifts').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setGifts(data || []));
  }, [open]);

  // Discover Style: Keyboard-aware shift
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      const kbHeight = Math.max(0, kb);
      setKeyboardOpen(kbHeight > 80);
      document.documentElement.style.setProperty('--spensive-kb-height', kbHeight + 'px');
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--spensive-kb-height');
    };
  }, [open]);

  const handleSend = async (contentType: string = 'text', mediaUrl: string | null = null, content?: string) => {
    const finalContent = content || newComment.trim();
    if (!finalContent || sending) return;

    setSending(true);
    setError(null);

    try {
      const parentId = replyingTo?.id || null;
      let rootId = parentId;

      if (parentId) {
        const { data: parentData } = await supabase
          .from('comments')
          .select('root_id, parent_id')
          .eq('id', parentId)
          .maybeSingle();

        if (parentData) {
          rootId = parentData.root_id || parentData.parent_id || parentId;
        }
      }

      const { error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: userId,
          content: finalContent,
          content_type: contentType,
          media_url: mediaUrl,
          status: 'published',
          parent_id: parentId,
          root_id: rootId,
        });

      if (insertError) throw insertError;

      setNewComment('');
      setReplyingTo(null);
      setShowEmoji(false);
      setShowSticker(false);
      setShowGift(false);
      if (inputRef.current) inputRef.current.style.height = 'auto';

      if (parentId) {
        setExpandedThreads((prev) => {
          const newSet = new Set(prev);
          newSet.add(parentId);
          if (rootId && rootId !== parentId) newSet.add(rootId);
          return newSet;
        });
      }

      onCommentAdded?.();
      await fetchComments();
    } catch (err: any) {
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleReply = (comment: CommentNode) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const handleDelete = async (commentId: string) => {
    setCommentToDelete(null);
    try {
      await supabase.from('comments').delete().eq('id', commentId);
      await fetchComments();
    } catch (err) {
      console.error('Delete failed:', err);
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

    try {
      const { data: existing } = await supabase
        .from('comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase.from('comment_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('comment_reactions').insert({ comment_id: commentId, user_id: userId, reaction_type: 'like' });
      }
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) newSet.delete(commentId);
      else newSet.add(commentId);
      return newSet;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend('text', null);
    }
    if (e.key === 'Escape') onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const renderContent = (comment: CommentNode) => {
    switch (comment.contentType) {
      case 'gif': return <img src={comment.mediaUrl || ''} alt="GIF" className={styles.commentGif} />;
      case 'sticker': return <img src={comment.mediaUrl || ''} alt="Sticker" className={styles.commentSticker} />;
      case 'gift': return <div className={styles.commentGift}><span style={{ fontSize: '32px' }}>{comment.mediaUrl}</span><span style={{ fontSize: '12px', fontWeight: 600 }}>{comment.content}</span></div>;
      case 'emoji': return <span className={styles.commentEmoji}>{comment.content}</span>;
      default: return <p className={styles.commentText}>{comment.content}</p>;
    }
  };

  const flattenReplies = (comment: CommentNode, result: CommentNode[] = []): CommentNode[] => {
    comment.children.forEach((child) => {
      result.push(child);
      if (child.children.length > 0) {
        flattenReplies(child, result);
      }
    });
    return result;
  };

  const renderComment = (comment: CommentNode) => {
    const isExpanded = expandedThreads.has(comment.id);
    const showChildren = isExpanded && comment.children.length > 0;
    
    const allReplies = showChildren ? flattenReplies(comment) : [];
    const page = replyPages.get(comment.id) || 1;
    const visibleReplies = allReplies.slice(0, page * REPLIES_PER_PAGE);
    const hasMoreReplies = allReplies.length > page * REPLIES_PER_PAGE;

    return (
      <div key={comment.id} className={styles.thread}>
        <div className={styles.commentItem}>
          <div className={styles.commentAvatar}>
            {comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt={comment.author.name} /> : comment.author.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.commentBody}>
            <div className={styles.commentBubble}>
              <div className={styles.commentHeaderRow}>
                <span className={styles.commentName}>{comment.author.name}</span>
                <span className={styles.commentTime}>{timeAgo(comment.createdAt)}</span>
              </div>
              {renderContent(comment)}
            </div>

            <div className={styles.commentActions}>
              <button className={`${styles.commentAction} ${comment.userReacted ? styles.commentActionLiked : ''}`} onClick={() => handleReact(comment.id)}>
                <Heart size={13} fill={comment.userReacted ? '#ef4444' : 'none'} />
                {comment.reactionCount > 0 && <span>{comment.reactionCount}</span>}
              </button>
              <button className={styles.commentAction} onClick={() => handleReply(comment)}>
                <Reply size={13} /> Reply
              </button>
              {comment.replyCount > 0 && (
                <button className={styles.commentAction} onClick={() => toggleThread(comment.id)}>
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {isExpanded ? 'Hide' : `${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}`}
                </button>
              )}
              {comment.isOwn && (
                <button className={`${styles.commentAction} ${styles.commentActionDelete}`} onClick={() => setCommentToDelete(comment.id)}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {showChildren && allReplies.length > 0 && (
              <div className={styles.replyRail}>
                {visibleReplies.map((reply) => (
                  <div key={reply.id} className={styles.thread}>
                    <div className={styles.commentItem}>
                      <div className={styles.commentAvatar}>
                        {reply.author.avatarUrl ? <img src={reply.author.avatarUrl} alt={reply.author.name} /> : reply.author.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.commentBody}>
                        <div className={styles.commentBubble}>
                          <div className={styles.commentHeaderRow}>
                            <span className={styles.commentName}>{reply.author.name}</span>
                            <span className={styles.commentTime}>{timeAgo(reply.createdAt)}</span>
                          </div>
                          {reply.replyingToName && (
                            <span className={styles.replyingToLabel}>Replying to @{reply.replyingToName}</span>
                          )}
                          {renderContent(reply)}
                        </div>

                        <div className={styles.commentActions}>
                          <button className={`${styles.commentAction} ${reply.userReacted ? styles.commentActionLiked : ''}`} onClick={() => handleReact(reply.id)}>
                            <Heart size={13} fill={reply.userReacted ? '#ef4444' : 'none'} />
                            {reply.reactionCount > 0 && <span>{reply.reactionCount}</span>}
                          </button>
                          <button className={styles.commentAction} onClick={() => handleReply(reply)}>
                            <Reply size={13} /> Reply
                          </button>
                          {reply.isOwn && (
                            <button className={`${styles.commentAction} ${styles.commentActionDelete}`} onClick={() => setCommentToDelete(reply.id)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {hasMoreReplies && (
                  <button 
                    className={styles.loadMoreReplies}
                    onClick={() => setReplyPages((prev) => {
                      const newMap = new Map(prev);
                      newMap.set(comment.id, page + 1);
                      return newMap;
                    })}
                  >
                    View {allReplies.length - page * REPLIES_PER_PAGE} more replies
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        style={{
          bottom: keyboardOpen ? 'var(--spensive-kb-height)' : 0,
          transition: 'bottom 0.15s ease',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h2 className={styles.title}>Comments <span className={styles.commentCount}>{comments.length}</span></h2>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}><X size={20} /></button>
        </div>

        <div className={styles.commentsList}>
          {loading ? (
            <div className={styles.loading}><div className={styles.spinner} /><span>Loading...</span></div>
          ) : comments.length === 0 ? (
            <div className={styles.empty}>
              <MessageCircle size={48} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No comments yet</p>
              <p className={styles.emptyText}>Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>

        {replyingTo && (
          <div className={styles.replyIndicator}>
            <CornerDownRight size={14} />
            <span>Replying to <strong>@{replyingTo.author.name}</strong></span>
            <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}

        {showEmoji && (
          <div className={styles.panel}>
            <div className={styles.emojiGrid}>
              {EMOJIS.map((emoji) => (
                <button key={emoji} className={styles.emojiOption} onClick={() => setNewComment((prev) => prev + emoji)}>{emoji}</button>
              ))}
            </div>
          </div>
        )}

        {showSticker && (
          <div className={styles.panel}>
            <div className={styles.emojiGrid}>
              {stickers.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: 12, textAlign: 'center', color: 'var(--comment-text-tertiary)', fontSize: 13 }}>No stickers available</div>
              ) : (
                stickers.map((st) => (
                  <button key={st.id} className={styles.emojiOption} onClick={() => handleSend('sticker', st.image_url, 'Sticker')}>
                    <img src={st.thumbnail_url || st.image_url} alt="Sticker" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {showGift && (
          <div className={styles.panel}>
            <div className={styles.emojiGrid}>
              {gifts.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: 12, textAlign: 'center', color: 'var(--comment-text-tertiary)', fontSize: 13 }}>No gifts available</div>
              ) : (
                gifts.map((gf) => (
                  <button key={gf.id} className={styles.emojiOption} onClick={() => handleSend('gift', gf.icon_url, gf.name)}>
                    <span style={{ fontSize: '28px' }}>{gf.icon_url}</span>
                    <span style={{ fontSize: '9px', fontWeight: 600 }}>{gf.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* DISCOVER STYLE COMPOSER */}
        <div className={styles.composerSheet}>
          {/* Quick reactions row */}
          <div className={styles.reactionScroll}>
            {QUICK_REACTIONS.map((group, i) => (
              <button
                key={i}
                type="button"
                className={styles.reactionChip}
                onClick={() => setNewComment((prev) => prev + group.join(''))}
                aria-label={`React with ${group.join('')}`}
              >
                {group.join('')}
              </button>
            ))}
          </div>

          {/* Input row: avatar + pill with inline tools + send */}
          <div className={styles.inputRow}>
            <div className={styles.composerAvatar}>
              {currentUserAvatar ? <img src={currentUserAvatar} alt="" /> : <span>?</span>}
            </div>
            <div className={styles.inputPillWrapper}>
              <textarea
                ref={inputRef}
                className={styles.commentInputPill}
                value={newComment}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={replyingTo ? `Reply to @${replyingTo.author.name}...` : 'Add comment...'}
                rows={1}
                disabled={sending}
                enterKeyHint="send"
                onFocus={() => setKeyboardOpen(true)}
              />
              
              {/* Inline tools (Emoji, Sticker, Gift + Send) */}
              <div className={styles.pillIcons}>
                <button
                  type="button"
                  onClick={() => { setShowEmoji((v) => !v); setShowSticker(false); setShowGift(false); }}
                  className={styles.pillIconBtn + (showEmoji ? ' ' + styles.pillIconBtnActive : '')}
                  aria-label="Emoji"
                >
                  <Smile size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSticker((v) => !v); setShowEmoji(false); setShowGift(false); }}
                  className={styles.pillIconBtn + (showSticker ? ' ' + styles.pillIconBtnActive : '')}
                  aria-label="Stickers"
                >
                  <Sticker size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowGift((v) => !v); setShowEmoji(false); setShowSticker(false); }}
                  className={styles.pillIconBtn + (showGift ? ' ' + styles.pillIconBtnActive : '')}
                  aria-label="Gifts"
                >
                  <Gift size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSend('text', null)}
                  disabled={!newComment.trim() || sending}
                  className={styles.inlineSendButton + (newComment.trim() && !sending ? ' ' + styles.inlineSendButtonActive : '')}
                  aria-label="Send comment"
                >
                  {sending ? <Loader size={16} className={styles.spinner} /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {commentToDelete && (
          <div className={styles.deleteConfirmOverlay} onClick={() => setCommentToDelete(null)}>
            <div className={styles.deleteConfirmDialog} onClick={(e) => e.stopPropagation()}>
              <Trash2 size={32} className={styles.deleteConfirmIcon} />
              <h3>Delete comment?</h3>
              <p>This action cannot be undone.</p>
              <div className={styles.deleteConfirmActions}>
                <button className={styles.cancelDelete} onClick={() => setCommentToDelete(null)}>Cancel</button>
                <button className={styles.confirmDelete} onClick={() => handleDelete(commentToDelete)}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
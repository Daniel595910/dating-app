import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Trash2, Heart, ChevronDown, ChevronUp, Smile, Reply, CornerDownRight, MessageCircle, Gift, Sticker, Film } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { Comment } from '../../types/community.types';
import styles from '../styles/CommentSheet.module.css';

interface CommentSheetProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  userId: string;
  onCommentAdded?: () => void;
}

interface CommentNode extends Comment {
  children: CommentNode[];
  reactionCount: number;
  userReacted: boolean;
  isOwn: boolean;
  replyCount: number;
  contentType: string;
  mediaUrl: string | null;
  depth: number;
}

const EMOJIS = ['😀', '😂', '😍', '😭', '😡', '👍', '🙏', '🔥', '❤️', '💯', '🎉', '🌹', '💐', '🎁', '💝', '🥰', '😮', '😢', '✨', '💋', '🦋', '🌈', '⭐', '💎', '👑'];
const MAX_DEPTH = 3;

export const CommentSheet: React.FC<CommentSheetProps> = ({
  open,
  onClose,
  postId,
  userId,
  onCommentAdded,
}) => {
  const [commentTree, setCommentTree] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [activePanel, setActivePanel] = useState<'emoji' | 'gif' | 'sticker' | 'gift' | null>(null);
  const [stickers, setStickers] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  
  const cursorRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentMapRef = useRef<Map<string, { name: string; avatarUrl: string | null; verified: boolean }>>(new Map());

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd';
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return weeks + 'w';
    return new Date(dateString).toLocaleDateString();
  };

  const loadStickers = useCallback(async () => {
    const { data } = await supabase.from('stickers').select('*').eq('is_active', true).limit(50);
    setStickers(data || []);
  }, []);

  const loadGifts = useCallback(async () => {
    const { data } = await supabase.from('gifts').select('*').eq('is_active', true).order('sort_order');
    setGifts(data || []);
  }, []);

  useEffect(() => {
    loadStickers();
    loadGifts();
  }, [loadStickers, loadGifts]);

  const fetchProfiles = useCallback(async (commentList: any[]) => {
    const authorIds = [...new Set(commentList.map((c: any) => c.author_id))];
    const missingIds = authorIds.filter((id) => !commentMapRef.current.has(id));

    if (missingIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, is_verified')
        .in('user_id', missingIds);

      (profiles || []).forEach((p: any) => {
        commentMapRef.current.set(p.user_id, {
          name: p.display_name || 'User',
          avatarUrl: p.avatar_url || null,
          verified: p.is_verified || false,
        });
      });
    }
  }, []);

  const buildTree = useCallback((flatComments: any[]): CommentNode[] => {
    const nodeMap = new Map<string, CommentNode>();
    
    // First pass: create all nodes with proper author profiles
    flatComments.forEach((c: any) => {
      const profile = commentMapRef.current.get(c.author_id);
      nodeMap.set(c.id, {
        id: c.id,
        postId: c.post_id,
        author: {
          id: c.author_id,
          name: profile?.name || 'User ' + c.author_id.substring(0, 4),
          avatarUrl: profile?.avatarUrl || null,
          verified: profile?.verified || false,
        },
        content: c.content,
        createdAt: c.created_at,
        children: [],
        reactionCount: 0,
        userReacted: false,
        isOwn: c.author_id === userId,
        replyCount: 0,
        contentType: c.content_type || 'text',
        mediaUrl: c.media_url || null,
        depth: 0,
      });
    });

    // Second pass: build tree
    const roots: CommentNode[] = [];
    flatComments.forEach((c: any) => {
      const node = nodeMap.get(c.id)!;
      if (c.parent_id && nodeMap.has(c.parent_id)) {
        const parent = nodeMap.get(c.parent_id)!;
        node.depth = Math.min(parent.depth + 1, MAX_DEPTH);
        parent.children.push(node);
      } else {
        node.depth = 0;
        roots.push(node);
      }
    });

    // Set reply counts
    flatComments.forEach((c: any) => {
      if (c.parent_id && nodeMap.has(c.parent_id)) {
        nodeMap.get(c.parent_id)!.replyCount++;
      }
    });

    return roots;
  }, [userId]);

  const fetchComments = useCallback(async (reset: boolean) => {
    if (!open) return;
    if (reset) { setLoading(true); cursorRef.current = null; } else { setLoadingMore(true); }

    try {
      setError(null);
      
      // Fetch top-level comments
      let query = supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(21);

      if (!reset && cursorRef.current) query = query.lt('created_at', cursorRef.current);

      const { data: topLevelComments, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (topLevelComments && topLevelComments.length > 0) {
        const hasMoreComments = topLevelComments.length > 20;
        const topList = hasMoreComments ? topLevelComments.slice(0, 20) : topLevelComments;
        
        // Get all top-level comment IDs
        const topIds = topList.map((c: any) => c.id);
        
        // Fetch ALL replies for these top-level comments (including nested)
        const { data: allReplies } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .eq('status', 'published')
          .not('parent_id', 'is', null)
          .in('root_id', topIds)
          .order('created_at', { ascending: true })
          .limit(200);

        const allComments = [...topList, ...(allReplies || [])];
        
        // CRITICAL: Fetch profiles BEFORE building tree
        await fetchProfiles(allComments);

        // Get reactions
        const allCommentIds = allComments.map((c: any) => c.id);
        const { data: reactions } = await supabase
          .from('comment_reactions')
          .select('comment_id, user_id')
          .in('comment_id', allCommentIds);

        const reactionMap = new Map<string, string[]>();
        (reactions || []).forEach((r: any) => {
          if (!reactionMap.has(r.comment_id)) reactionMap.set(r.comment_id, []);
          reactionMap.get(r.comment_id)!.push(r.user_id);
        });

        // Apply reactions to nodes
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

        if (reset) {
          setCommentTree(tree);
        } else {
          setCommentTree((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newRoots = tree.filter((c) => !existingIds.has(c.id));
            return [...prev, ...newRoots];
          });
        }

        if (topList.length > 0) cursorRef.current = topList[topList.length - 1].created_at;
        setHasMore(hasMoreComments);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [open, postId, userId, fetchProfiles, buildTree]);

  useEffect(() => {
    if (open) {
      fetchComments(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, fetchComments]);

  const handleSend = async (contentType: string = 'text', mediaUrl: string | null = null, content?: string) => {
    const finalContent = content || newComment.trim();
    if (!finalContent || sending) return;

    setSending(true);
    setError(null);

    try {
      setNewComment('');
      setReplyingTo(null);
      setActivePanel(null);
      if (inputRef.current) inputRef.current.style.height = 'auto';

      const parentId = replyingTo?.id || null;
      const rootId = replyingTo?.id || null;

      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: userId,
        content: finalContent,
        content_type: contentType,
        media_url: mediaUrl,
        status: 'published',
        parent_id: parentId,
        root_id: rootId,
      });

      if (insertError) { setNewComment(finalContent); throw insertError; }
      onCommentAdded?.();
      await fetchComments(true);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendSticker = async (sticker: any) => {
    await handleSend('sticker', sticker.image_url, sticker.name || '');
  };

  const handleSendGift = async (gift: any) => {
    await handleSend('gift', gift.icon_url, gift.name || '');
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const handleDelete = async (commentId: string) => {
    setCommentToDelete(null);
    await supabase.from('comments').delete().eq('id', commentId);
    await fetchComments(true);
  };

  const handleReact = async (commentId: string) => {
    const isLiked = likedComments.has(commentId);
    setLikedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) newSet.delete(commentId);
      else newSet.add(commentId);
      return newSet;
    });

    const updateNode = (nodes: CommentNode[]): CommentNode[] => {
      return nodes.map((node) => {
        if (node.id === commentId) {
          return {
            ...node,
            reactionCount: node.userReacted ? Math.max(node.reactionCount - 1, 0) : node.reactionCount + 1,
            userReacted: !node.userReacted,
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    setCommentTree((prev) => updateNode(prev));

    try {
      if (isLiked) {
        await supabase.from('comment_reactions').delete().eq('comment_id', commentId).eq('user_id', userId);
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

  const renderCommentContent = (comment: CommentNode) => {
    switch (comment.contentType) {
      case 'gif':
        return <img src={comment.mediaUrl || ''} alt="GIF" style={{ maxWidth: '180px', borderRadius: '12px' }} />;
      case 'sticker':
        return <img src={comment.mediaUrl || ''} alt="Sticker" style={{ maxWidth: '80px', height: '80px', objectFit: 'contain' }} />;
      case 'gift':
        return <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '36px' }}>{comment.mediaUrl}</span><span style={{ fontSize: '13px', fontWeight: 600 }}>{comment.content}</span></div>;
      case 'emoji':
        return <span style={{ fontSize: '40px' }}>{comment.content}</span>;
      default:
        return <span>{comment.content}</span>;
    }
  };

  const renderCommentNode = (comment: CommentNode) => {
    const isExpanded = expandedThreads.has(comment.id);
    const showChildren = isExpanded && comment.children.length > 0;

    return (
      <div key={comment.id} className={styles.commentItem} style={{ marginLeft: comment.depth > 0 ? Math.min(comment.depth * 20, 40) : 0 }}>
        <div className={styles.commentAvatar}>
          {comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt={comment.author.name} /> : comment.author.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.commentBody}>
          <div className={styles.commentBubble}>
            <div className={styles.commentHeaderRow}>
              <span className={styles.commentName}>{comment.author.name}</span>
              <span className={styles.commentTime}>{timeAgo(comment.createdAt)}</span>
            </div>
            {renderCommentContent(comment)}
          </div>
          
          <div className={styles.commentActionsRow}>
            <button className={`${styles.likeButton} ${comment.userReacted ? styles.likeButtonActive : ''}`} onClick={() => handleReact(comment.id)}>
              <Heart size={13} fill={comment.userReacted ? '#ef4444' : 'none'} />
              {comment.reactionCount > 0 && <span>{comment.reactionCount}</span>}
            </button>
            <button className={styles.replyButton} onClick={() => handleReply(comment)}>
              <Reply size={13} /> Reply
            </button>
            {comment.replyCount > 0 && (
              <button className={styles.viewRepliesButton} onClick={() => toggleThread(comment.id)}>
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {isExpanded ? 'Hide replies' : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
              </button>
            )}
            {comment.isOwn && (
              <button className={styles.deleteButton} onClick={() => setCommentToDelete(comment.id)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Recursive children */}
          {showChildren && (
            <div className={styles.repliesContainer}>
              {comment.children.map((child) => renderCommentNode(child))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h2 className={styles.title}>Comments <span className={styles.commentCount}>{commentTree.length}</span></h2>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}><X size={20} /></button>
        </div>

        <div className={styles.commentsList}>
          {loading ? (
            <div className={styles.loading}><div className={styles.spinner} /><span>Loading...</span></div>
          ) : commentTree.length === 0 ? (
            <div className={styles.empty}>
              <MessageCircle size={48} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No comments yet</p>
              <p className={styles.emptyText}>Be the first to share your thoughts!</p>
            </div>
          ) : (
            <>
              {hasMore && <button className={styles.loadMore} onClick={() => fetchComments(false)}>View earlier comments</button>}
              {commentTree.map((comment) => renderCommentNode(comment))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {replyingTo && (
          <div className={styles.replyIndicator}>
            <CornerDownRight size={14} />
            <span>Replying to <strong>{replyingTo.author.name}</strong></span>
            <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <button className={`${styles.toolbarButton} ${activePanel === 'emoji' ? styles.toolbarButtonActive : ''}`} onClick={() => setActivePanel(activePanel === 'emoji' ? null : 'emoji')}>
            <Smile size={20} />
          </button>
          <button className={`${styles.toolbarButton} ${activePanel === 'sticker' ? styles.toolbarButtonActive : ''}`} onClick={() => setActivePanel(activePanel === 'sticker' ? null : 'sticker')}>
            <Sticker size={20} />
          </button>
          <button className={`${styles.toolbarButton} ${activePanel === 'gift' ? styles.toolbarButtonActive : ''}`} onClick={() => setActivePanel(activePanel === 'gift' ? null : 'gift')}>
            <Gift size={20} />
          </button>
        </div>

        {/* Panels */}
        {activePanel === 'emoji' && (
          <div className={styles.panel}>
            <div className={styles.emojiGrid}>
              {EMOJIS.map((emoji) => (
                <button key={emoji} className={styles.emojiOption} onClick={() => setNewComment((prev) => prev + emoji)}>{emoji}</button>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'sticker' && (
          <div className={styles.panel}>
            <div className={styles.emojiGrid}>
              {stickers.map((sticker) => (
                <button key={sticker.id} className={styles.stickerOption} onClick={() => handleSendSticker(sticker)}>
                  <img src={sticker.image_url || sticker.thumbnail_url} alt={sticker.name || 'Sticker'} style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'gift' && (
          <div className={styles.panel}>
            <div className={styles.emojiGrid}>
              {gifts.map((gift) => (
                <button key={gift.id} className={styles.giftOption} onClick={() => handleSendGift(gift)}>
                  <span style={{ fontSize: '32px' }}>{gift.icon_url}</span>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>{gift.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={newComment}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              rows={1}
              disabled={sending}
              enterKeyHint="send"
            />
            <button className={styles.sendButton} onClick={() => handleSend('text', null)} disabled={!newComment.trim() || sending}>
              {sending ? <div className={styles.spinner} /> : <Send size={18} />}
            </button>
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



import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Trash2, Heart, MessageCircle, ChevronDown, ChevronUp, Smile, MoreVertical, Flag } from 'lucide-react';
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

interface CommentWithReplies extends Comment {
  replies: Comment[];
  showReplies: boolean;
  reactionCount: number;
  userReacted: boolean;
  isOwn: boolean;
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🎉', '💯'];

export const CommentSheet: React.FC<CommentSheetProps> = ({
  open,
  onClose,
  postId,
  userId,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const cursorRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentMapRef = useRef<Map<string, { name: string; avatarUrl: string | null; verified: boolean }>>(new Map());

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

  const fetchComments = useCallback(async (reset: boolean) => {
    if (!open) return;

    if (reset) {
      setLoading(true);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      setError(null);
      let query = supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(21);

      if (!reset && cursorRef.current) {
        query = query.lt('created_at', cursorRef.current);
      }

      const { data: rawComments, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (rawComments) {
        const hasMoreComments = rawComments.length > 20;
        const commentList = hasMoreComments ? rawComments.slice(0, 20) : rawComments;

        await fetchProfiles(commentList);

        // Get reactions for these comments
        const commentIds = commentList.map((c: any) => c.id);
        const { data: reactions } = await supabase
          .from('comment_reactions')
          .select('comment_id, user_id')
          .in('comment_id', commentIds);

        const reactionMap = new Map<string, string[]>();
        (reactions || []).forEach((r: any) => {
          if (!reactionMap.has(r.comment_id)) reactionMap.set(r.comment_id, []);
          reactionMap.get(r.comment_id)!.push(r.user_id);
        });

        const mappedComments: CommentWithReplies[] = commentList.map((c: any) => {
          const profile = commentMapRef.current.get(c.author_id);
          const commentReactions = reactionMap.get(c.id) || [];
          return {
            id: c.id,
            postId: c.post_id,
            author: {
              id: c.author_id,
              name: profile?.name || 'User',
              avatarUrl: profile?.avatarUrl || null,
              verified: profile?.verified || false,
            },
            content: c.content,
            createdAt: c.created_at,
            replies: [],
            showReplies: false,
            reactionCount: commentReactions.length,
            userReacted: commentReactions.includes(userId),
            isOwn: c.author_id === userId,
          };
        });

        if (reset) {
          setComments(mappedComments);
        } else {
          setComments((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newComments = mappedComments.filter((c) => !existingIds.has(c.id));
            return [...prev, ...newComments];
          });
        }

        if (commentList.length > 0) {
          cursorRef.current = commentList[commentList.length - 1].created_at;
        }
        setHasMore(hasMoreComments);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [open, postId, userId, fetchProfiles]);

  useEffect(() => {
    if (open) {
      fetchComments(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, fetchComments]);

  // Realtime subscription
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          const newCommentData = payload.new;
          await fetchProfiles([newCommentData]);
          const profile = commentMapRef.current.get(newCommentData.author_id);

          const newCommentObj: CommentWithReplies = {
            id: newCommentData.id,
            postId: newCommentData.post_id,
            author: {
              id: newCommentData.author_id,
              name: profile?.name || 'User',
              avatarUrl: profile?.avatarUrl || null,
              verified: profile?.verified || false,
            },
            content: newCommentData.content,
            createdAt: newCommentData.created_at,
            replies: [],
            showReplies: false,
            reactionCount: 0,
            userReacted: false,
            isOwn: newCommentData.author_id === userId,
          };

          setComments((prev) => [...prev, newCommentObj]);
          onCommentAdded?.();
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [open, postId, userId, fetchProfiles, onCommentAdded]);

  const handleSend = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      const tempComment: CommentWithReplies = {
        id: `temp-${Date.now()}`,
        postId,
        author: { id: userId, name: 'You', avatarUrl: null, verified: false },
        content: trimmed,
        createdAt: new Date().toISOString(),
        replies: [],
        showReplies: false,
        reactionCount: 0,
        userReacted: false,
        isOwn: true,
      };

      setComments((prev) => [...prev, tempComment]);
      setNewComment('');
      setReplyingTo(null);
      setShowEmojiPicker(false);

      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: userId,
        content: trimmed,
        status: 'published',
        parent_id: replyingTo?.id || null,
      });

      if (insertError) {
        setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
        setNewComment(trimmed);
        throw insertError;
      }

      onCommentAdded?.();
    } catch (err: any) {
      setError(err.message || 'Failed to send comment');
    } finally {
      setSending(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await supabase.from('comments').delete().eq('id', commentId);
  };

  const handleReact = async (commentId: string, emoji: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              reactionCount: c.userReacted ? Math.max(c.reactionCount - 1, 0) : c.reactionCount + 1,
              userReacted: !c.userReacted,
            }
          : c
      )
    );

    setShowEmojiPicker(false);

    try {
      if (comments.find((c) => c.id === commentId)?.userReacted) {
        await supabase.from('comment_reactions').delete().eq('comment_id', commentId).eq('user_id', userId);
      } else {
        await supabase.from('comment_reactions').insert({
          comment_id: commentId,
          user_id: userId,
          reaction_type: 'like',
        });
      }
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) newSet.delete(commentId);
      else newSet.add(commentId);
      return newSet;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h2 className={styles.title}>Comments ({comments.length})</h2>
          <button onClick={onClose} aria-label="Close comments" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.commentsList}>
          {loading ? (
            <div className={styles.loading}>Loading comments...</div>
          ) : error && comments.length === 0 ? (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={() => fetchComments(true)}>Try Again</button>
            </div>
          ) : comments.length === 0 ? (
            <div className={styles.empty}>
              <p>No comments yet</p>
              <p>Be the first to comment!</p>
            </div>
          ) : (
            <>
              {hasMore && (
                <button className={styles.loadMore} onClick={() => fetchComments(false)} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load more comments'}
                </button>
              )}

              {comments.map((comment) => (
                <div key={comment.id} className={styles.commentItem}>
                  <div className={styles.commentAvatar}>
                    {comment.author.avatarUrl ? (
                      <img src={comment.author.avatarUrl} alt={comment.author.name} />
                    ) : (
                      comment.author.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentBubble}>
                      <span className={styles.commentName}>{comment.author.name}</span>
                      <p className={styles.commentText}>{comment.content}</p>
                    </div>
                    <div className={styles.commentActions}>
                      <span className={styles.commentTime}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                      <button className={styles.replyButton} onClick={() => handleReply(comment)}>
                        Reply
                      </button>
                      {comment.isOwn && (
                        <button className={styles.deleteButton} onClick={() => handleDelete(comment.id)} aria-label="Delete comment">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Reaction row */}
                    <div className={styles.reactionRow}>
                      <button
                        className={`${styles.reactionButton} ${comment.userReacted ? styles.reactionButtonActive : ''}`}
                        onClick={() => handleReact(comment.id, '❤️')}
                      >
                        <Heart size={14} fill={comment.userReacted ? '#ef4444' : 'none'} />
                        {comment.reactionCount > 0 && <span>{comment.reactionCount}</span>}
                      </button>
                      <button
                        className={styles.emojiButton}
                        onClick={() => setShowEmojiPicker(showEmojiPicker ? false : true)}
                        aria-label="Add reaction"
                      >
                        <Smile size={14} />
                      </button>

                      {showEmojiPicker && (
                        <div className={styles.emojiPicker}>
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              className={styles.emojiOption}
                              onClick={() => handleReact(comment.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Nested replies */}
                    {comment.replies.length > 0 && (
                      <button className={styles.toggleReplies} onClick={() => toggleReplies(comment.id)}>
                        {expandedComments.has(comment.id) ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                        {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </button>
                    )}

                    {expandedComments.has(comment.id) && comment.replies.map((reply) => (
                      <div key={reply.id} className={styles.replyItem}>
                        <div className={styles.commentAvatarSmall}>
                          {reply.author.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.commentBody}>
                          <div className={styles.commentBubble}>
                            <span className={styles.commentName}>{reply.author.name}</span>
                            <p className={styles.commentText}>{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className={styles.replyIndicator}>
            <span>Replying to {replyingTo.author.name}</span>
            <button onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input */}
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
            rows={1}
            disabled={sending}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!newComment.trim() || sending}
            aria-label="Send comment"
          >
            {sending ? <div className={styles.spinner} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

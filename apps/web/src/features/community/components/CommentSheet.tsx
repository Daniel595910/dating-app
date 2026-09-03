import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Trash2, MoreVertical } from 'lucide-react';
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

export const CommentSheet: React.FC<CommentSheetProps> = ({
  open,
  onClose,
  postId,
  userId,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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

        const mappedComments: Comment[] = commentList.map((c: any) => {
          const profile = commentMapRef.current.get(c.author_id);
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
  }, [open, postId, fetchProfiles]);

  // Initial load
  useEffect(() => {
    if (open) {
      fetchComments(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [open, fetchComments]);

  // Realtime subscription for new comments
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const newCommentData = payload.new;
          await fetchProfiles([newCommentData]);
          const profile = commentMapRef.current.get(newCommentData.author_id);

          const newCommentObj: Comment = {
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
          };

          setComments((prev) => [...prev, newCommentObj]);
          onCommentAdded?.();
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [open, postId, fetchProfiles, onCommentAdded]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      // Optimistic comment
      const tempComment: Comment = {
        id: `temp-${Date.now()}`,
        postId,
        author: {
          id: userId,
          name: 'You',
          avatarUrl: null,
          verified: false,
        },
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      setComments((prev) => [...prev, tempComment]);
      setNewComment('');
      scrollToBottom();

      // Actual insert
      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: userId,
        content: trimmed,
        status: 'published',
      });

      if (insertError) {
        // Rollback optimistic comment
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

  const handleDelete = async (commentId: string) => {
    try {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      await supabase.from('comments').delete().eq('id', commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      fetchComments(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Comments</h2>
          <button onClick={onClose} aria-label="Close comments" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Comments List */}
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
                  <div className={styles.commentContent}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentName}>{comment.author.name}</span>
                      <span className={styles.commentTime}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className={styles.commentText}>{comment.content}</p>
                  </div>
                  {comment.author.id === userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      aria-label="Delete comment"
                      className={styles.deleteButton}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            rows={1}
            disabled={sending}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!newComment.trim() || sending}
            aria-label="Send comment"
          >
            {sending ? (
              <div className={styles.spinner} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

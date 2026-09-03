/**
 * PostDetail Page
 * Individual post view with comments
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { Post, Comment as CommentType } from '@dating-app/types';
import { CommunityPost } from '@/components/community/CommunityPost';
import { Button, Input } from '@dating-app/ui';
import styles from './PostDetail.module.css';

export const PostDetail: React.FC = () => {
  const { postId } = useParams < { postId: string } > ();
  const navigate = useNavigate();
  const [post, setPost] = useState < Post | null > (null);
  const [comments, setComments] = useState < CommentType[] > ([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();
        
        if (fetchError) throw fetchError;
        setPost(data as Post);
      } catch (err: any) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchComments = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .eq('status', 'published')
          .order('created_at', { ascending: true });
        
        if (fetchError) throw fetchError;
        setComments(data || []);
      } catch (err: any) {
        console.error('Failed to load comments:', err);
      }
    };
    
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);
  
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !postId) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: user.id,
        content: newComment.trim(),
        status: 'published',
      });
      
      if (insertError) throw insertError;
      
      setNewComment('');
      // Refresh comments
      const { data: updatedComments, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('created_at', { ascending: true });
      
      if (fetchError) throw fetchError;
      setComments(updatedComments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className={styles.loading}>Loading post...</div>;
  }
  
  if (error && !post) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.error}>{error}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }
  
  if (!post) {
    return <div className={styles.error}>Post not found</div>;
  }
  
  return (
    <div className={styles.container}>
      <CommunityPost post={post} />

      <div className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>Comments ({comments.length})</h2>

        <div className={styles.commentInput}>
          <Input
            textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          <Button
            onClick={handleSubmitComment}
            loading={submitting}
            disabled={!newComment.trim()}
          >
            Comment
          </Button>
        </div>

        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <p className={styles.noComments}>No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>User</span>
                  <span className={styles.commentTimestamp}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className={styles.commentContent}>{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
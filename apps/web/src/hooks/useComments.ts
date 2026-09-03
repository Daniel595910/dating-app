/**
 * useComments Hook
 * Comment data management
 */

import { useState, useCallback } from 'react';
import { Comment } from '@dating-app/types';
import { postService } from '@/services/post.service';

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  loadComments: (postId: string) => Promise < void > ;
  addComment: (input: any) => Promise < Comment | null > ;
  deleteComment: (commentId: string) => Promise < boolean > ;
}

export function useComments(): UseCommentsReturn {
  const [comments, setComments] = useState < Comment[] > ([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const loadComments = useCallback(async (postId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedComments = await postService.getCommentsByPost(postId);
      setComments(fetchedComments);
    } catch (err: any) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const addComment = useCallback(async (input: any) => {
    setError(null);
    
    try {
      const newComment = await postService.createComment(input);
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
      }
      return newComment;
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
      return null;
    }
  }, []);
  
  const deleteComment = useCallback(async (commentId: string) => {
    setError(null);
    
    try {
      const success = await postService.deleteComment(commentId);
      if (success) {
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
      return false;
    }
  }, []);
  
  return {
    comments,
    loading,
    error,
    loadComments,
    addComment,
    deleteComment,
  };
}
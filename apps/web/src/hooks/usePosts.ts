/**
 * usePosts Hook
 * Post data management
 */

import { useState, useEffect, useCallback } from 'react';
import { Post } from '@dating-app/types';
import { postService } from '@/services/post.service';

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadPosts: (communityId: string, reset ? : boolean) => Promise < void > ;
  createPost: (input: any) => Promise < Post | null > ;
  deletePost: (postId: string) => Promise < boolean > ;
  likePost: (postId: string, userId: string) => Promise < boolean > ;
  unlikePost: (postId: string, userId: string) => Promise < boolean > ;
}

export function usePosts(): UsePostsReturn {
  const [posts, setPosts] = useState < Post[] > ([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const [hasMore, setHasMore] = useState(true);
  
  const loadPosts = useCallback(async (communityId: string, reset = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const offset = reset ? 0 : posts.length;
      const fetchedPosts = await postService.getPostsByCommunity(communityId, 20, offset);
      
      if (reset) {
        setPosts(fetchedPosts);
      } else {
        setPosts((prev) => [...prev, ...fetchedPosts]);
      }
      
      setHasMore(fetchedPosts.length === 20);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [posts.length]);
  
  const createPost = useCallback(async (input: any) => {
    setError(null);
    
    try {
      const newPost = await postService.createPost(input);
      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
      }
      return newPost;
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
      return null;
    }
  }, []);
  
  const deletePost = useCallback(async (postId: string) => {
    setError(null);
    
    try {
      const success = await postService.deletePost(postId);
      if (success) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete post');
      return false;
    }
  }, []);
  
  const likePost = useCallback(async (postId: string, userId: string) => {
    try {
      return await postService.likePost(postId, userId);
    } catch (err: any) {
      setError(err.message || 'Failed to like post');
      return false;
    }
  }, []);
  
  const unlikePost = useCallback(async (postId: string, userId: string) => {
    try {
      return await postService.unlikePost(postId, userId);
    } catch (err: any) {
      setError(err.message || 'Failed to unlike post');
      return false;
    }
  }, []);
  
  return {
    posts,
    loading,
    error,
    hasMore,
    loadPosts,
    createPost,
    deletePost,
    likePost,
    unlikePost,
  };
}
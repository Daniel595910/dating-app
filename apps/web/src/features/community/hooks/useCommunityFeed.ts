import { useState, useCallback, useRef, useEffect } from 'react';
import { CommunityPost, FeedCursor, FeedFilter, FeedResponse } from '../types/community.types';
import { communityService } from '../services/community.service';

interface UseCommunityFeedOptions {
  communityId: string | null;
  userId: string | null;
  filter?: FeedFilter;
  pageSize?: number;
}

interface UseCommunityFeedResult {
  posts: CommunityPost[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  addPost: (post: CommunityPost) => void;
  updatePost: (postId: string, updates: Partial<CommunityPost>) => void;
  removePost: (postId: string) => void;
}

export function useCommunityFeed({
  communityId,
  userId,
  filter = 'all',
  pageSize = 20,
}: UseCommunityFeedOptions): UseCommunityFeedResult {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<FeedCursor | null>(null);
  const loadingRef = useRef(false);

  const loadPosts = useCallback(
    async (reset: boolean) => {
      if (!communityId || !userId || loadingRef.current) return;
      loadingRef.current = true;

      if (reset) {
        setLoading(true);
        cursorRef.current = null;
      } else {
        setLoadingMore(true);
      }

      try {
        setError(null);
        const cursor = reset ? null : cursorRef.current;
        const response: FeedResponse = await communityService.getFeedPosts(
          communityId,
          userId,
          filter,
          cursor,
          pageSize
        );

        if (reset) {
          setPosts(response.posts);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = response.posts.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }

        cursorRef.current = response.nextCursor;
        setHasMore(response.hasMore);
      } catch (err) {
        console.error('useCommunityFeed error:', err);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [communityId, userId, filter, pageSize]
  );

  // THIS IS THE FIX: Auto-trigger load when dependencies change
  useEffect(() => {
    if (communityId && userId) {
      loadPosts(true);
    }
  }, [communityId, userId, filter, loadPosts]);

  const refresh = useCallback(() => loadPosts(true), [loadPosts]);
  const loadMore = useCallback(() => loadPosts(false), [loadPosts]);

  const addPost = useCallback((post: CommunityPost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const updatePost = useCallback((postId: string, updates: Partial<CommunityPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updates } : p)));
  }, []);

  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    addPost,
    updatePost,
    removePost,
  };
}

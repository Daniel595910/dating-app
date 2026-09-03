/**\n * CommunityFeed Component
 * Main community feed displaying posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase.client';
import { PAGINATION } from '@/config/constants';
import { Post } from '@dating-app/types';
import { CommunityPost } from './CommunityPost';
import { LoadingScreen } from '../common/LoadingScreen';
import styles from './CommunityFeed.module.css';

interface CommunityFeedProps {
  communityId?: string;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ communityId }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (reset = false) => {
    try {
      setError(null);
      if (reset) setLoading(true);

      let query = supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(PAGINATION.COMMUNITY_FEED_PAGE_SIZE);

      if (communityId) {
        query = query.eq('community_id', communityId);
      }

      if (!reset && posts.length > 0) {
        const lastPost = posts[posts.length - 1];
        query = query.lt('created_at', lastPost!.created_at);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data) {
        if (reset) {
          setPosts(data as Post[]);
        } else {
          setPosts((prev) => [...prev, ...(data as Post[])]);
        }
        setHasMore(data.length === PAGINATION.COMMUNITY_FEED_PAGE_SIZE);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [communityId, posts]);

  useEffect(() => {
    fetchPosts(true);
  }, [communityId]);

  if (loading && posts.length === 0) {
    return <LoadingScreen message="Loading community..." />;
  }

  if (error && posts.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.error}>{error}</p>
        <button className={styles.retryButton} onClick={() => fetchPosts(true)}>
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p className={styles.emptyText}>No posts yet. Be the first to introduce yourself!</p>
      </div>
    );
  }

  return (
    <div className={styles.feed}>
      {posts.map((post) => (
        <CommunityPost key={post.id} post={post} />
      ))}
      {hasMore && (
        <button
          className={styles.loadMoreButton}
          onClick={() => fetchPosts(false)}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
};


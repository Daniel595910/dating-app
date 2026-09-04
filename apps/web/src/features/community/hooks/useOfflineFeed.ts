import { useState, useEffect, useCallback } from 'react';
import { offlineCache } from '../services/offline-cache.service';

interface UseOfflineFeedOptions {
  communityId: string | null;
  onOfflineChange?: (isOffline: boolean) => void;
}

interface UseOfflineFeedResult {
  isOffline: boolean;
  hasCachedFeed: boolean;
  loadCachedFeed: () => Promise<any[]>;
  cacheFeed: (posts: any[]) => Promise<void>;
}

export function useOfflineFeed({ communityId, onOfflineChange }: UseOfflineFeedOptions): UseOfflineFeedResult {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasCachedFeed, setHasCachedFeed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      onOfflineChange?.(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      onOfflineChange?.(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOfflineChange]);

  useEffect(() => {
    if (communityId) {
      offlineCache.getCachedFeed(communityId).then((cached) => {
        setHasCachedFeed(Boolean(cached && cached.posts.length > 0));
      });
    }
  }, [communityId]);

  const loadCachedFeed = useCallback(async () => {
    if (!communityId) return [];
    const cached = await offlineCache.getCachedFeed(communityId);
    return cached?.posts || [];
  }, [communityId]);

  const cacheFeed = useCallback(async (posts: any[]) => {
    if (communityId && posts.length > 0) {
      await offlineCache.cacheFeed(communityId, posts);
      setHasCachedFeed(true);
    }
  }, [communityId]);

  return { isOffline, hasCachedFeed, loadCachedFeed, cacheFeed };
}

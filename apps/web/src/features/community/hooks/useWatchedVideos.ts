import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'spensive_watched_videos';
const MAX_WATCHED = 500;
const WATCH_THRESHOLD_MS = 3000;

interface WatchedState {
  watched: Set<string>;
  ready: boolean;
}

/**
 * Tracks which videos the user has watched, persisted in localStorage.
 * Adds a post ID to the watched set after WATCH_THRESHOLD_MS of playback.
 * Prunes to MAX_WATCHED most recent entries to avoid unbounded growth.
 */
export function useWatchedVideos() {
  const [state, setState] = useState<WatchedState>({ watched: new Set(), ready: false });
  const orderedRef = useRef<string[]>([]);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const arr = parsed.filter((x): x is string => typeof x === 'string');
          orderedRef.current = arr;
          setState({ watched: new Set(arr), ready: true });
          return;
        }
      }
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
    setState({ watched: new Set(), ready: true });
  }, []);

  const persist = useCallback(() => {
    try {
      const arr = orderedRef.current.slice(-MAX_WATCHED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }, []);

  const markWatched = useCallback((postId: string) => {
    if (!postId) return;
    setState((prev) => {
      if (prev.watched.has(postId)) return prev;
      const next = new Set(prev.watched);
      next.add(postId);
      const filtered = orderedRef.current.filter((id) => id !== postId);
      filtered.push(postId);
      orderedRef.current = filtered;
      return { ...prev, watched: next };
    });
    setTimeout(persist, 0);
  }, [persist]);

  const isWatched = useCallback(
    (postId: string): boolean => state.watched.has(postId),
    [state.watched]
  );

  const clearWatched = useCallback(() => {
    orderedRef.current = [];
    setState({ watched: new Set(), ready: true });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const startPlayTimer = useCallback((postId: string) => {
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    playTimerRef.current = setTimeout(() => {
      markWatched(postId);
      playTimerRef.current = null;
    }, WATCH_THRESHOLD_MS);
  }, [markWatched]);

  const clearPlayTimer = useCallback(() => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, []);

  return {
    watched: state.watched,
    ready: state.ready,
    markWatched,
    isWatched,
    clearWatched,
    startPlayTimer,
    clearPlayTimer,
  };
}

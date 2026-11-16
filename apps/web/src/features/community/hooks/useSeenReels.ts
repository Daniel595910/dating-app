import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'spensive_seen_reels';
const MAX_SEEN = 500;

interface SeenState {
  seen: Set<string>;
  ready: boolean;
}

/**
 * Tracks which reels (discover videos) the user has seen, persisted in localStorage.
 * Used by the "similar videos" section to avoid showing the same reels on every visit.
 * Prunes to MAX_SEEN most recent entries to avoid unbounded growth.
 */
export function useSeenReels() {
  const [state, setState] = useState<SeenState>({ seen: new Set(), ready: false });
  const orderedRef = useRef<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const arr = parsed.filter((x): x is string => typeof x === 'string');
          orderedRef.current = arr;
          setState({ seen: new Set(arr), ready: true });
          return;
        }
      }
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
    setState({ seen: new Set(), ready: true });
  }, []);

  const persist = useCallback(() => {
    try {
      const arr = orderedRef.current.slice(-MAX_SEEN);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }, []);

  const markSeen = useCallback((videoId: string) => {
    if (!videoId) return;
    setState((prev) => {
      if (prev.seen.has(videoId)) return prev;
      const next = new Set(prev.seen);
      next.add(videoId);
      const filtered = orderedRef.current.filter((id) => id !== videoId);
      filtered.push(videoId);
      orderedRef.current = filtered;
      return { ...prev, seen: next };
    });
    setTimeout(persist, 0);
  }, [persist]);

  const isSeen = useCallback(
    (videoId: string): boolean => state.seen.has(videoId),
    [state.seen]
  );

  const clearSeen = useCallback(() => {
    orderedRef.current = [];
    setState({ seen: new Set(), ready: true });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return {
    seen: state.seen,
    ready: state.ready,
    markSeen,
    isSeen,
    clearSeen,
  };
}


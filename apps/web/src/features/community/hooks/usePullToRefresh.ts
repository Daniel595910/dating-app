import { useCallback, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

interface PullToRefreshState {
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
}

export function usePullToRefresh({ onRefresh, disabled = false }: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    refreshing: false,
    pullDistance: 0,
  });

  const startYRef = useRef<number | null>(null);
  const thresholdRef = useRef(80); // pixels to pull before triggering refresh

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state.refreshing) return;
      if (window.scrollY > 0) return; // Only trigger at top
      startYRef.current = e.touches[0]?.clientY ?? null;
    },
    [disabled, state.refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state.refreshing || startYRef.current === null) return;
      if (window.scrollY > 0) return;

      const currentY = e.touches[0]?.clientY ?? 0;
      const distance = currentY - startYRef.current;

      if (distance > 0) {
        e.preventDefault();
        const dampened = Math.min(distance * 0.5, thresholdRef.current * 1.5);
        setState((prev) => ({
          ...prev,
          pulling: true,
          pullDistance: dampened,
        }));
      }
    },
    [disabled, state.refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    startYRef.current = null;

    setState((prev) => {
      if (prev.pullDistance >= thresholdRef.current) {
        return { ...prev, pulling: false, refreshing: true, pullDistance: 0 };
      }
      return { ...prev, pulling: false, pullDistance: 0 };
    });

    if (state.pullDistance >= thresholdRef.current) {
      try {
        await onRefresh();
      } finally {
        setState((prev) => ({ ...prev, refreshing: false }));
      }
    }
  }, [onRefresh, state.pullDistance]);

  return {
    ...state,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    threshold: thresholdRef.current,
  };
}

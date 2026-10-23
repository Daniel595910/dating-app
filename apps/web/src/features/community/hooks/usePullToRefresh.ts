import { useEffect, useRef, useState } from 'react';

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
  const thresholdRef = useRef(80);
  const onRefreshRef = useRef(onRefresh);
  const disabledRef = useRef(disabled);
  const refreshingRef = useRef(false);
  const stateRef = useRef(state);

  // Keep refs in sync so native listeners see the latest values
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { refreshingRef.current = state.refreshing; }, [state.refreshing]);
  useEffect(() => { stateRef.current = state; }, [state]);

  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleStart = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current) return;
      if (el.scrollTop > 0) return;
      startYRef.current = e.touches[0]?.clientY ?? null;
    };

    const handleMove = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current) return;
      if (startYRef.current === null) return;
      if (el.scrollTop > 0) return;

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
    };

    const handleEnd = async () => {
      const finalPull = stateRef.current.pullDistance;
      startYRef.current = null;

      if (finalPull >= thresholdRef.current) {
        setState({ pulling: false, refreshing: true, pullDistance: 0 });
        try {
          await onRefreshRef.current();
        } finally {
          setState({ pulling: false, refreshing: false, pullDistance: 0 });
        }
      } else {
        setState({ pulling: false, refreshing: false, pullDistance: 0 });
      }
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: false });
    el.addEventListener('touchend', handleEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleStart);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('touchend', handleEnd);
    };
  }, []);

  return {
    ...state,
    containerRef,
    threshold: thresholdRef.current,
  };
}

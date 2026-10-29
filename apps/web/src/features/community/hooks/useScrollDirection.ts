import { useEffect, useRef, useState, RefObject } from 'react';

interface UseScrollDirectionOptions {
  target: RefObject<HTMLElement | null>;
  /** Min scroll delta to change direction (px). */
  threshold?: number;
  /** Always reveal when scrollTop <= this value. */
  hideOnTop?: number;
  /** After revealing, require this many px of downward scroll to hide again. */
  rearmDelta?: number;
}

export function useScrollDirection({
  target,
  threshold = 8,
  hideOnTop = 40,
  rearmDelta = 60,
}: UseScrollDirectionOptions): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const revealYRef = useRef(0);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = target.current;
      if (!el) return;
      if (e.target !== el) return;

      const y = el.scrollTop;
      const delta = y - lastY.current;
      lastY.current = y;

      if (y <= hideOnTop) {
        setHidden((prev) => (prev ? false : prev));
        revealYRef.current = y;
        return;
      }

      if (Math.abs(delta) < threshold) return;

      if (delta < 0) {
        setHidden((prev) => (prev ? false : prev));
        revealYRef.current = y;
        return;
      }

      if (y - revealYRef.current >= rearmDelta) {
        setHidden((prev) => (prev ? prev : true));
      }
    };

    window.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    } as AddEventListenerOptions);

    return () => {
      window.removeEventListener('scroll', onScroll, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [target, threshold, hideOnTop, rearmDelta]);

  return hidden;
}
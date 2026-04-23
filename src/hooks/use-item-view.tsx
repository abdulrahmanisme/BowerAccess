import { useEffect, useRef } from "react";

interface UseItemViewOptions {
  minDurationMs?: number;
  threshold?: number;
  onViewed: (durationMs: number) => void;
}

export function useItemView({
  minDurationMs = 1000,
  threshold = 0.4,
  onViewed,
}: UseItemViewOptions) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef(false);
  const enterAtRef = useRef<number | null>(null);
  const totalVisibleMsRef = useRef(0);
  const hasTriggeredRef = useRef(false);
  const onViewedRef = useRef(onViewed);

  onViewedRef.current = onViewed;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const flushVisibleTime = () => {
      if (!isVisibleRef.current || enterAtRef.current === null) return;
      totalVisibleMsRef.current += Date.now() - enterAtRef.current;
      enterAtRef.current = null;
      isVisibleRef.current = false;
    };

    const tryEmit = () => {
      if (hasTriggeredRef.current) return;
      if (totalVisibleMsRef.current < minDurationMs) return;

      hasTriggeredRef.current = true;
      onViewedRef.current(totalVisibleMsRef.current);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;

        if (entry.isIntersecting) {
          if (!isVisibleRef.current) {
            isVisibleRef.current = true;
            enterAtRef.current = Date.now();
          }
        } else {
          flushVisibleTime();
          tryEmit();
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      flushVisibleTime();
      tryEmit();
    };
  }, [minDurationMs, threshold]);

  return rootRef;
}

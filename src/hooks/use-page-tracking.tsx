import { useEffect, useRef } from "react";
import { trackPageTime } from "@/lib/tracking";

export function usePageTracking(userId: string | null, pagePath: string) {
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
  }, [pagePath]);

  useEffect(() => {
    if (!userId) return;

    const flush = () => {
      const duration = Math.max(0, Date.now() - startRef.current);
      if (duration < 1000) return;
      void trackPageTime({ userId, pagePath, durationMs: duration });
      startRef.current = Date.now();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pagePath, userId]);
}

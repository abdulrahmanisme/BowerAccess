import { useCallback, useRef } from "react";

const STORAGE_KEY_PREFIX = "bower_feedback_given_";

/**
 * Tracks which opportunity IDs a user has already provided feedback for,
 * persisted in localStorage so it survives page reloads and sessions.
 *
 * Usage:
 *   const { hasFeedback, markFeedback } = useFeedbackMemory(userId);
 *   if (!hasFeedback(opportunityId)) showFeedbackDialog();
 *   markFeedback(opportunityId);  // after user submits
 */
export function useFeedbackMemory(userId: string | null) {
  // Cache the parsed Set in a ref so we don't re-parse on every call.
  const cacheRef = useRef<{ key: string; set: Set<string> } | null>(null);

  const getSet = useCallback((): Set<string> => {
    if (!userId) return new Set();

    const key = `${STORAGE_KEY_PREFIX}${userId}`;

    // Return cached set if the key hasn't changed.
    if (cacheRef.current && cacheRef.current.key === key) {
      return cacheRef.current.set;
    }

    try {
      const raw = localStorage.getItem(key);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      const set = new Set(parsed);
      cacheRef.current = { key, set };
      return set;
    } catch {
      const set = new Set<string>();
      cacheRef.current = { key, set };
      return set;
    }
  }, [userId]);

  const persist = useCallback(
    (set: Set<string>) => {
      if (!userId) return;
      const key = `${STORAGE_KEY_PREFIX}${userId}`;
      try {
        localStorage.setItem(key, JSON.stringify([...set]));
      } catch {
        // Storage full or unavailable — silently ignore.
      }
    },
    [userId]
  );

  /** Returns true if feedback was already submitted for this opportunity. */
  const hasFeedback = useCallback(
    (opportunityId: string): boolean => getSet().has(opportunityId),
    [getSet]
  );

  /** Mark an opportunity as having received feedback. */
  const markFeedback = useCallback(
    (opportunityId: string) => {
      const set = getSet();
      set.add(opportunityId);
      persist(set);
    },
    [getSet, persist]
  );

  return { hasFeedback, markFeedback };
}

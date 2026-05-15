import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY_PREFIX = "bower_feedback_given_";

/**
 * Tracks which opportunity IDs a user has already provided feedback for,
 * persisted in localStorage and synced with Supabase so it survives sessions across devices.
 * Ensures a user can only give feedback once per opportunity.
 */
export function useFeedbackMemory(userId: string | null) {
  const getInitialSet = useCallback((): Set<string> => {
    if (!userId) return new Set();
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    try {
      const raw = localStorage.getItem(key);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      return new Set(parsed);
    } catch {
      return new Set<string>();
    }
  }, [userId]);

  const [feedbackSet, setFeedbackSet] = useState<Set<string>>(getInitialSet());

  // Re-initialize when userId changes
  useEffect(() => {
    setFeedbackSet(getInitialSet());
  }, [getInitialSet]);

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

  // Sync with DB on mount to prevent cross-device duplicate feedbacks
  useEffect(() => {
    if (!userId) return;

    const fetchPastFeedback = async () => {
      try {
        const { data, error } = await supabase
          .from("engagement_events")
          .select("opportunity_id")
          .eq("user_id", userId)
          .in("event_type", ["feedback_useful", "feedback_not_useful"])
          .not("opportunity_id", "is", null);

        if (error) throw error;

        if (data && data.length > 0) {
          setFeedbackSet((prev) => {
            const next = new Set(prev);
            let changed = false;
            data.forEach((row) => {
              if (row.opportunity_id && !next.has(row.opportunity_id)) {
                next.add(row.opportunity_id);
                changed = true;
              }
            });
            if (changed) {
              persist(next);
              return next;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to sync feedback memory:", err);
      }
    };

    void fetchPastFeedback();
  }, [userId, persist]);

  /** Returns true if feedback was already submitted for this opportunity. */
  const hasFeedback = useCallback(
    (opportunityId: string): boolean => feedbackSet.has(opportunityId),
    [feedbackSet]
  );

  /** Mark an opportunity as having received feedback. */
  const markFeedback = useCallback(
    (opportunityId: string) => {
      setFeedbackSet((prev) => {
        if (prev.has(opportunityId)) return prev;
        const next = new Set(prev);
        next.add(opportunityId);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { hasFeedback, markFeedback };
}

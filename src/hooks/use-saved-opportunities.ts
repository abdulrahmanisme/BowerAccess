/**
 * Hook for managing saved opportunities
 * Provides cloud-synced bookmark functionality
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";

interface UseSavedOpportunitiesReturn {
  saved: Set<string>;
  isSaved(opportunityId: string): boolean;
  save(opportunityId: string): Promise<void>;
  unsave(opportunityId: string): Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useSavedOpportunities(userId: string | null): UseSavedOpportunitiesReturn {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved opportunities on mount and when userId changes
  useEffect(() => {
    if (!userId) {
      setSaved(new Set());
      setLoading(false);
      return;
    }

    const loadSaved = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from("saved_opportunities")
          .select("opportunity_id")
          .eq("user_id", userId);

        if (err) {
          setError(err.message);
          return;
        }

        const savedIds = new Set(data?.map((row) => row.opportunity_id) || []);
        setSaved(savedIds);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadSaved();
  }, [userId]);

  const isSaved = useCallback(
    (opportunityId: string): boolean => {
      return saved.has(opportunityId);
    },
    [saved]
  );

  const save = useCallback(
    async (opportunityId: string) => {
      if (!userId) return;

      try {
        const { error: err } = await supabase
          .from("saved_opportunities")
          .insert({ user_id: userId, opportunity_id: opportunityId });

        if (err) {
          if (err.code === "23505") {
            // Unique constraint violation: already saved, ignore
            return;
          }
          throw err;
        }

        // Optimistic update
        setSaved((prev) => new Set([...prev, opportunityId]));

        // Track event
        void trackEvent({
          userId,
          opportunityId,
          eventType: "save_opportunity" as any,
          pagePath: typeof window !== "undefined" ? window.location.pathname : "/",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save opportunity";
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  const unsave = useCallback(
    async (opportunityId: string) => {
      if (!userId) return;

      try {
        const { error: err } = await supabase
          .from("saved_opportunities")
          .delete()
          .eq("user_id", userId)
          .eq("opportunity_id", opportunityId);

        if (err) throw err;

        // Optimistic update
        setSaved((prev) => {
          const newSet = new Set(prev);
          newSet.delete(opportunityId);
          return newSet;
        });

        // Track event
        void trackEvent({
          userId,
          opportunityId,
          eventType: "unsave_opportunity" as any,
          pagePath: typeof window !== "undefined" ? window.location.pathname : "/",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not unsave opportunity";
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  return {
    saved,
    isSaved,
    save,
    unsave,
    loading,
    error,
  };
}

/**
 * Hook for managing pending applications
 * Tracks when users start applying and haven't yet confirmed completion
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";

export type ApplicationStatus = "clicked" | "applied" | "abandoned" | "in_progress";

export interface PendingApplication {
  id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  clicked_at: string;
  updated_at: string;
  opportunity?: {
    title: string;
    category: string;
  };
}

interface UsePendingApplicationsReturn {
  pending: PendingApplication[];
  loading: boolean;
  error: string | null;
  confirmApplication(opportunityId: string, status: "applied" | "in_progress" | "abandoned", reason?: string): Promise<void>;
  confirmApplicationViaToast(opportunityId: string): Promise<void>;
  saveForLater(opportunityId: string): Promise<void>;
  refresh(): Promise<void>;
}

export function usePendingApplications(userId: string | null): UsePendingApplicationsReturn {
  const [pending, setPending] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pending applications on mount
  useEffect(() => {
    if (!userId) {
      setPending([]);
      setLoading(false);
      return;
    }

    const loadPending = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from("pending_applications")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "clicked")
          .order("clicked_at", { ascending: false });

        if (err) {
          setError(err.message);
          return;
        }

        setPending(data || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadPending();
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("pending_applications")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "clicked")
        .order("clicked_at", { ascending: false });

      if (err) {
        setError(err.message);
        return;
      }

      setPending(data || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const confirmApplication = useCallback(
    async (opportunityId: string, status: "applied" | "in_progress" | "abandoned", reason?: string) => {
      if (!userId) return;

      try {
        const { error: err } = await supabase
          .from("pending_applications")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("opportunity_id", opportunityId);

        if (err) throw err;

        // Remove from local pending list
        setPending((prev) => prev.filter((app) => app.opportunity_id !== opportunityId));

        // Record feedback events to the Admin Dashboard first
        // These MUST succeed — they use valid DB enum values
        if (status === "abandoned") {
          await trackEvent({
            userId,
            opportunityId,
            eventType: "feedback_not_useful",
            metadata: {
              reason: reason || null,
              reason_type: reason ? "custom" : null,
              content_id: opportunityId,
              source: "welcome_back_modal",
            },
            pagePath: typeof window !== "undefined" ? window.location.pathname : "/",
            eventSource: "welcome_back_modal",
          });
        } else if (status === "applied" || status === "in_progress") {
          await trackEvent({
            userId,
            opportunityId,
            eventType: "feedback_useful",
            metadata: {
              reason: reason || null,
              content_id: opportunityId,
              source: "welcome_back_modal",
            },
            pagePath: typeof window !== "undefined" ? window.location.pathname : "/",
            eventSource: "welcome_back_modal",
          });
        }

        // Also record to feedback_responses table for abandoned with reason
        if (status === "abandoned" && reason) {
          try {
            const { data: oppData } = await supabase.from("opportunities").select("category").eq("id", opportunityId).single();
            
            const { error: feedbackErr } = await supabase.from("feedback_responses").insert({
              opportunity_id: opportunityId,
              user_id: userId,
              feedback_type: "application_abandoned",
              feedback_subtype: "custom_reason",
              feedback_text: reason,
              category: oppData?.category || "unknown",
              application_status: "abandoned",
            });
            if (feedbackErr) {
              console.error("Could not record to feedback_responses", feedbackErr);
            }
          } catch (e) {
            console.error("Error logging to feedback_responses", e);
          }
        }

        // Fire application status tracking event (PostHog only — not a valid DB enum)
        // Wrapped separately so it never blocks the feedback events above
        try {
          const appEventType = status === "applied" ? "application_confirmed" : status === "in_progress" ? "application_in_progress" : "application_abandoned";
          await trackEvent({
            userId,
            opportunityId,
            eventType: appEventType as any,
            metadata: {
              final_status: status,
              ...(reason ? { reason } : {}),
            },
            pagePath: typeof window !== "undefined" ? window.location.pathname : "/",
          });
        } catch {
          // Non-critical: these event types are PostHog-only and not in the DB enum
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not update application status";
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  const confirmApplicationViaToast = useCallback(
    async (opportunityId: string) => {
      if (!userId) return;

      try {
        // Update status to 'applied' immediately
        const { error: err } = await supabase
          .from("pending_applications")
          .upsert({
            user_id: userId,
            opportunity_id: opportunityId,
            status: "applied",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,opportunity_id" });

        if (err) throw err;

        // Remove from local pending list
        setPending((prev) => prev.filter((app) => app.opportunity_id !== opportunityId));

        // Track event
        await trackEvent({
          userId,
          opportunityId,
          eventType: "application_confirmed_via_toast" as any,
          metadata: {
            source: "toast",
          },
          pagePath: typeof window !== "undefined" ? window.location.pathname : "/",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not confirm application";
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  const saveForLater = useCallback(
    async (opportunityId: string) => {
      if (!userId) return;

      try {
        // Add to saved_opportunities
        const { error: err } = await supabase
          .from("saved_opportunities")
          .upsert({
            user_id: userId,
            opportunity_id: opportunityId,
          }, { onConflict: "user_id,opportunity_id" });

        if (err) throw err;

        // Also update the pending_applications status so it doesn't show up in the Welcome Back modal anymore
        const { error: pendingErr } = await supabase
          .from("pending_applications")
          .update({
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("opportunity_id", opportunityId);

        if (pendingErr) throw pendingErr;

        // Remove from pending list (don't need to ask about it anymore)
        setPending((prev) => prev.filter((app) => app.opportunity_id !== opportunityId));

        // Track event
        await trackEvent({
          userId,
          opportunityId,
          eventType: "save_opportunity" as any,
          metadata: {
            source: "application_confirmation",
          },
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

  return {
    pending,
    loading,
    error,
    confirmApplication,
    confirmApplicationViaToast,
    saveForLater,
    refresh,
  };
}

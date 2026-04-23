import type { Database, Json } from "@/integrations/supabase/types";
import { capturePostHogEvent } from "@/integrations/posthog";
import { supabase } from "@/integrations/supabase/client";

type EventType = Database["public"]["Enums"]["event_type"];

export interface TrackEventInput {
  userId: string;
  eventType: EventType;
  opportunityId?: string;
  metadata?: Json;
  durationMs?: number;
  pagePath?: string;
  sessionId?: string;
  eventSource?: string;
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") return "server-session";
  const existing = window.sessionStorage.getItem("bower_session_id");
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem("bower_session_id", created);
  return created;
}

export async function trackEvent(input: TrackEventInput) {
  const {
    userId,
    eventType,
    opportunityId,
    metadata,
    durationMs,
    pagePath,
    sessionId,
    eventSource,
  } = input;

  const eventProperties = {
    user_id: userId,
    opportunity_id: opportunityId,
    duration_ms: durationMs ?? undefined,
    page_path: pagePath ?? (typeof window !== "undefined" ? window.location.pathname : null),
    session_id: sessionId ?? getOrCreateSessionId(),
    event_source: eventSource ?? "ui",
    metadata: metadata ?? {},
  };

  try {
    capturePostHogEvent(eventType, eventProperties);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("trackEvent error", error);
    }
  }

  // Keep legacy admin analytics views populated while PostHog is the primary sink.
  const { error: dbError } = await supabase.from("engagement_events").insert({
    user_id: userId,
    event_type: eventType,
    opportunity_id: opportunityId ?? null,
    duration_ms: durationMs ?? null,
    page_path: eventProperties.page_path ?? null,
    session_id: eventProperties.session_id,
    event_source: eventProperties.event_source,
    metadata: metadata ?? {},
  });

  if (dbError && import.meta.env.DEV) {
    console.warn("trackEvent database mirror error", dbError);
  }
}

export async function trackPageTime(params: {
  userId: string;
  pagePath?: string;
  durationMs: number;
}) {
  const { userId, pagePath, durationMs } = params;

  await trackEvent({
    userId,
    eventType: "page_view",
    pagePath,
    durationMs,
    metadata: { kind: "page_time" },
    eventSource: "page",
  });
}

export function getSessionId() {
  return getOrCreateSessionId();
}

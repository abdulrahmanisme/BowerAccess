import posthog from "posthog-js";

const runtimeEnv = typeof process !== "undefined" ? process.env : undefined;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || runtimeEnv?.POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || runtimeEnv?.POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_DASHBOARD_URL = import.meta.env.VITE_POSTHOG_DASHBOARD_URL || runtimeEnv?.POSTHOG_DASHBOARD_URL || "";

let isInitialized = false;
let lastIdentifiedUserId: string | null = null;

export function isPostHogEnabled() {
  return Boolean(POSTHOG_KEY);
}

export function getPostHogDashboardUrl() {
  return POSTHOG_DASHBOARD_URL;
}

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (isInitialized) return;
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.warn("PostHog is disabled because POSTHOG_KEY is missing.");
    }
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    // In SPA mode, capture pageviews on history changes so web analytics stays complete.
    capture_pageview: "history_change",
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
    enable_heatmaps: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
    },
    loaded: (instance) => {
      if (import.meta.env.DEV) {
        instance.debug();
      }
    },
  });

  isInitialized = true;
}

export function getPostHogClient() {
  if (!isInitialized) {
    initPostHog();
  }

  if (!isInitialized) {
    return null;
  }

  return posthog;
}

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>) {
  const client = getPostHogClient();
  if (!client) return;

  client.capture(event, properties);
}

export function identifyPostHogUser(userId: string, userProperties?: Record<string, unknown>) {
  const client = getPostHogClient();
  if (!client) return;

  if (lastIdentifiedUserId === userId) {
    if (userProperties && Object.keys(userProperties).length > 0) {
      client.setPersonProperties(userProperties);
    }
    return;
  }

  client.identify(userId, userProperties);
  lastIdentifiedUserId = userId;
}

export function resetPostHogUser() {
  const client = getPostHogClient();
  if (!client) return;

  client.reset();
  lastIdentifiedUserId = null;
}

export function isFeatureEnabled(flagKey: string): boolean {
  const client = getPostHogClient();
  if (!client) return false;

  return Boolean(client.isFeatureEnabled(flagKey));
}

export function getFeatureFlagPayload<T = Record<string, unknown>>(flagKey: string): T | null {
  const client = getPostHogClient();
  if (!client) return null;

  return (client.getFeatureFlagPayload(flagKey) as T | null) ?? null;
}

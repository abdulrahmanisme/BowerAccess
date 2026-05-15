/**
 * Hook for managing smart feedback modal trigger
 * Decides when to show feedback based on user interaction
 */

import { useState, useEffect } from "react";

const FEEDBACK_STORAGE_KEY = "bower_feedback_submitted";
const FEEDBACK_SESSION_KEY = "bower_feedback_session_shown";

export type FeedbackType = "experience" | "friction";

interface UseFeedbackTriggerReturn {
  shouldShowFeedback(opportunityId: string): boolean;
  markFeedbackShown(opportunityId: string): void;
  markFeedbackSubmitted(opportunityId: string): void;
  // New methods for mandatory feedback with delay
  shouldShowMandatoryFeedback(opportunityId: string, feedbackType: FeedbackType): boolean;
  markMandatoryFeedbackShown(opportunityId: string, feedbackType: FeedbackType): void;
  markMandatoryFeedbackSubmitted(opportunityId: string, feedbackType: FeedbackType): void;
  // Schedule feedback after delay
  scheduleFeedbackWithDelay(opportunityId: string, feedbackType: FeedbackType, delayMs?: number): void;
}

/**
 * Hook to manage feedback modal trigger state
 * Prevents showing multiple feedback modals in same session
 * Tracks which opportunities user has already submitted feedback for
 */
export function useFeedbackTrigger(): UseFeedbackTriggerReturn {
  const [submittedFeedback, setSubmittedFeedback] = useState<Set<string>>(new Set());
  const [sessionShown, setSessionShown] = useState<Set<string>>(new Set());
  const [submittedMandatory, setSubmittedMandatory] = useState<Set<string>>(new Set());
  const [sessionShownMandatory, setSessionShownMandatory] = useState<Set<string>>(new Set());
  const [scheduledFeedback, setScheduledFeedback] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Load persisted feedback from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setSubmittedFeedback(new Set(ids));
      }
    } catch {
      // Silently fail
    }
  }, []);

  const shouldShowFeedback = (opportunityId: string): boolean => {
    // Don't show if already submitted feedback
    if (submittedFeedback.has(opportunityId)) {
      return false;
    }

    // Don't show if already shown once this session
    if (sessionShown.has(opportunityId)) {
      return false;
    }

    return true;
  };

  const shouldShowMandatoryFeedback = (opportunityId: string, feedbackType: FeedbackType): boolean => {
    const key = `${opportunityId}_${feedbackType}`;
    
    // Don't show if already submitted
    if (submittedMandatory.has(key)) {
      return false;
    }

    // Don't show if already shown this session
    if (sessionShownMandatory.has(key)) {
      return false;
    }

    return true;
  };

  const markFeedbackShown = (opportunityId: string) => {
    setSessionShown((prev) => new Set([...prev, opportunityId]));
  };

  const markFeedbackSubmitted = (opportunityId: string) => {
    // Add to session shown
    setSessionShown((prev) => new Set([...prev, opportunityId]));

    // Add to submitted and persist
    setSubmittedFeedback((prev) => {
      const newSet = new Set([...prev, opportunityId]);
      try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      } catch {
        // Silently fail if localStorage is full
      }
      return newSet;
    });
  };

  const markMandatoryFeedbackShown = (opportunityId: string, feedbackType: FeedbackType) => {
    const key = `${opportunityId}_${feedbackType}`;
    setSessionShownMandatory((prev) => new Set([...prev, key]));
  };

  const markMandatoryFeedbackSubmitted = (opportunityId: string, feedbackType: FeedbackType) => {
    const key = `${opportunityId}_${feedbackType}`;
    
    // Add to session shown
    setSessionShownMandatory((prev) => new Set([...prev, key]));

    // Add to submitted
    setSubmittedMandatory((prev) => new Set([...prev, key]));

    // Cancel scheduled timeout if exists
    const timeoutId = scheduledFeedback.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setScheduledFeedback((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }
  };

  const scheduleFeedbackWithDelay = (opportunityId: string, feedbackType: FeedbackType, delayMs = 5000) => {
    const key = `${opportunityId}_${feedbackType}`;

    // Don't schedule if already shown/submitted this session
    if (!shouldShowMandatoryFeedback(opportunityId, feedbackType)) {
      return;
    }

    // Clear any existing timeout
    const existingTimeout = scheduledFeedback.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new feedback display
    const timeoutId = setTimeout(() => {
      markMandatoryFeedbackShown(opportunityId, feedbackType);
      
      // Remove from scheduled map
      setScheduledFeedback((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }, delayMs);

    setScheduledFeedback((prev) => new Map([...prev, [key, timeoutId]]));
  };

  return {
    shouldShowFeedback,
    markFeedbackShown,
    markFeedbackSubmitted,
    shouldShowMandatoryFeedback,
    markMandatoryFeedbackShown,
    markMandatoryFeedbackSubmitted,
    scheduleFeedbackWithDelay,
  };
}

/**
 * Smart feedback configuration
 * Category-aware feedback questions and response types
 */

export type OpportunityCategory = "funding" | "events" | "hiring" | "news" | "something_new";

export type FeedbackType =
  // Hiring feedback
  | "too_senior"
  | "too_junior"
  | "salary_unclear"
  | "application_too_long"
  | "poor_fit"
  // Funding feedback
  | "stage_mismatch"
  | "geography_restriction"
  | "too_competitive"
  | "sector_mismatch"
  // Events feedback
  | "attended"
  | "registered_only"
  | "timing_conflict"
  // News feedback
  | "useful"
  | "not_relevant"
  | "already_knew"
  // Generic fallback
  | "other";

export interface FeedbackOption {
  id: FeedbackType;
  label: string;
  description?: string;
}

export interface FeedbackConfig {
  question: string;
  options: FeedbackOption[];
  context?: string; // Helper text
}

const feedbackConfigs: Record<OpportunityCategory, FeedbackConfig> = {
  hiring: {
    question: "What stopped you from applying?",
    context: "Help us understand why this opportunity wasn't the right fit.",
    options: [
      { id: "too_senior", label: "Too senior for my level" },
      { id: "too_junior", label: "Too junior for my level" },
      { id: "salary_unclear", label: "Salary wasn't clear" },
      { id: "application_too_long", label: "Application too long" },
      { id: "poor_fit", label: "Poor cultural fit" },
      { id: "other", label: "Other reason" },
    ],
  },

  funding: {
    question: "Why wasn't this relevant?",
    context: "Help us show better opportunities for your stage and sector.",
    options: [
      { id: "stage_mismatch", label: "Wrong funding stage" },
      { id: "geography_restriction", label: "Geography restriction" },
      { id: "too_competitive", label: "Too competitive" },
      { id: "sector_mismatch", label: "Wrong sector" },
      { id: "other", label: "Other reason" },
    ],
  },

  events: {
    question: "Did you attend?",
    context: "Help us understand event engagement.",
    options: [
      { id: "attended", label: "Attended" },
      { id: "registered_only", label: "Registered but didn't attend" },
      { id: "timing_conflict", label: "Timing conflict" },
      { id: "other", label: "Other reason" },
    ],
  },

  news: {
    question: "Was this useful?",
    context: "Help us surface better news and insights.",
    options: [
      { id: "useful", label: "Useful" },
      { id: "not_relevant", label: "Not relevant" },
      { id: "already_knew", label: "Already knew this" },
      { id: "other", label: "Other" },
    ],
  },

  something_new: {
    question: "Was this interesting?",
    context: "Help us discover what excites you.",
    options: [
      { id: "useful", label: "Very interesting" },
      { id: "not_relevant", label: "Not for me" },
      { id: "other", label: "Other" },
    ],
  },
};

/**
 * Q1: Application Experience Feedback (for applied users)
 * Open text input - "Why did you apply? Tell us about your experience"
 */
export const applicationExperienceFeedbackQuestions: Record<OpportunityCategory, string> = {
  hiring: "Why did you decide to apply to this role? Tell us about your experience with the application process.",
  funding: "Why did you apply? Tell us about your experience with this funding opportunity.",
  events: "What made you decide to attend? Tell us about this event.",
  news: "Why did you find this valuable? Tell us what you think.",
  something_new: "What made this interesting to you? Tell us your thoughts.",
};

/**
 * Q3: Application Friction Feedback (for non-applied users)
 * Open text input - "Why didn't you apply? What was the reason?"
 */
export const applicationFrictionFeedbackQuestions: Record<OpportunityCategory, string> = {
  hiring: "Why didn't you decide to apply to this role? What was the main reason?",
  funding: "Why wasn't this opportunity right for you? What stopped you?",
  events: "Why won't you attend this event? What's preventing you?",
  news: "Why didn't you find this useful? What would have made it better?",
  something_new: "Why didn't this interest you? Help us understand.",
};

/**
 * Get feedback configuration for a category
 */
export function getFeedbackConfig(category: OpportunityCategory): FeedbackConfig {
  return feedbackConfigs[category];
}

/**
 * Get label for a feedback type
 */
export function getFeedbackTypeLabel(category: OpportunityCategory, feedbackType: FeedbackType): string {
  const config = getFeedbackConfig(category);
  const option = config.options.find((o) => o.id === feedbackType);
  return option?.label || feedbackType;
}

/**
 * Check if feedback type is valid for category
 */
export function isValidFeedbackType(category: OpportunityCategory, feedbackType: FeedbackType): boolean {
  const config = getFeedbackConfig(category);
  return config.options.some((o) => o.id === feedbackType);
}

/**
 * Deadline urgency calculation and sorting
 * Determines urgency level and visual priority for opportunities
 */

import {
  startOfToday,
  parseISO,
  differenceInDays,
  isBefore,
  isWithinInterval,
} from "date-fns";

export type UrgencyLevel =
  | "CLOSES_TODAY"
  | "DAYS_LEFT_2_3"
  | "DAYS_LEFT_4_7"
  | "HAPPENING_NOW"
  | "NEW"
  | "UPCOMING"
  | "CLOSED";

export interface UrgencyInfo {
  level: UrgencyLevel;
  daysLeft: number | null;
  badge: string | null;
  sortValue: number;
}

/**
 * Get urgency level for an opportunity
 */
export function getUrgencyLevel(opportunity: {
  endDate?: string | null;
  deadline?: string | null;
  startDate?: string | null;
  createdAt: string;
}): UrgencyLevel {
  const now = startOfToday();

  // Determine deadline date in order of preference
  const deadlineStr = opportunity.endDate || opportunity.deadline || opportunity.startDate;
  if (!deadlineStr) return "UPCOMING";

  try {
    const deadline = parseISO(deadlineStr);

    // Already closed (7-day grace period handled separately in UI)
    if (isBefore(deadline, now)) {
      return "CLOSED";
    }

    const daysUntilDeadline = differenceInDays(deadline, now);

    // CLOSES_TODAY
    if (daysUntilDeadline === 0) {
      return "CLOSES_TODAY";
    }

    // DAYS_LEFT_2_3
    if (daysUntilDeadline <= 3) {
      return "DAYS_LEFT_2_3";
    }

    // DAYS_LEFT_4_7
    if (daysUntilDeadline <= 7) {
      return "DAYS_LEFT_4_7";
    }

    // HAPPENING_NOW: if there's a start_date and we're between start and end
    if (opportunity.startDate) {
      try {
        const startDate = parseISO(opportunity.startDate);
        if (isWithinInterval(now, { start: startDate, end: deadline })) {
          return "HAPPENING_NOW";
        }
      } catch {
        // Invalid start date, skip this check
      }
    }

    // NEW: created within last 3 days
    try {
      const createdDate = parseISO(opportunity.createdAt);
      const createdDaysAgo = differenceInDays(now, createdDate);
      if (createdDaysAgo < 3) {
        return "NEW";
      }
    } catch {
      // Invalid created date, skip this check
    }

    return "UPCOMING";
  } catch {
    // Date parsing failed
    return "UPCOMING";
  }
}

/**
 * Get urgency info including badge text and sort value
 */
export function getUrgencyInfo(opportunity: {
  endDate?: string | null;
  deadline?: string | null;
  startDate?: string | null;
  createdAt: string;
}): UrgencyInfo {
  const level = getUrgencyLevel(opportunity);
  const deadline = opportunity.endDate || opportunity.deadline || opportunity.startDate;
  let daysLeft: number | null = null;

  if (deadline) {
    try {
      daysLeft = differenceInDays(parseISO(deadline), startOfToday());
    } catch {
      daysLeft = null;
    }
  }

  return {
    level,
    daysLeft,
    badge: getUrgencyBadge(level, daysLeft),
    sortValue: getUrgencySortValue(level),
  };
}

/**
 * Get badge text for urgency level
 */
export function getUrgencyBadge(level: UrgencyLevel, daysLeft: number | null): string | null {
  switch (level) {
    case "CLOSES_TODAY":
      return "Closes Today";
    case "DAYS_LEFT_2_3":
      return daysLeft === 1 ? "1 Day Left" : `${daysLeft} Days Left`;
    case "DAYS_LEFT_4_7":
      return `${daysLeft} Days Left`;
    case "HAPPENING_NOW":
      return "Happening Now";
    case "CLOSED":
      return "Closed";
    case "UPCOMING":
    default:
      return null;
  }
}

/**
 * Get sort value for urgency level (lower = higher priority)
 */
export function getUrgencySortValue(level: UrgencyLevel): number {
  const order: Record<UrgencyLevel, number> = {
    CLOSES_TODAY: 0,
    DAYS_LEFT_2_3: 1,
    DAYS_LEFT_4_7: 2,
    HAPPENING_NOW: 3,
    NEW: 4,
    UPCOMING: 5,
    CLOSED: 999,
  };
  return order[level];
}

/**
 * Get CSS variant for urgency badge styling
 */
export function getUrgencyVariant(level: UrgencyLevel): "destructive" | "secondary" | "outline" | "default" {
  switch (level) {
    case "CLOSES_TODAY":
      return "destructive"; // Red
    case "DAYS_LEFT_2_3":
      return "secondary"; // Orange/warning
    case "DAYS_LEFT_4_7":
      return "outline"; // Muted yellow
    case "HAPPENING_NOW":
      return "default"; // Purple/default
    case "NEW":
      return "secondary"; // Green
    case "CLOSED":
    case "UPCOMING":
    default:
      return "outline";
  }
}

/**
 * Get color for urgency level (for visual hierarchy)
 */
export function getUrgencyColor(level: UrgencyLevel): string {
  switch (level) {
    case "CLOSES_TODAY":
      return "text-red-600 dark:text-red-400";
    case "DAYS_LEFT_2_3":
      return "text-orange-600 dark:text-orange-400";
    case "DAYS_LEFT_4_7":
      return "text-yellow-600 dark:text-yellow-400";
    case "HAPPENING_NOW":
      return "text-purple-600 dark:text-purple-400";
    case "NEW":
      return "text-green-600 dark:text-green-400";
    case "CLOSED":
      return "text-gray-400 dark:text-gray-600";
    case "UPCOMING":
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

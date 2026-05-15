/**
 * Deadline urgency badge component
 * Displays urgency level with visual hierarchy
 */

import { Badge } from "./ui/badge";
import { getUrgencyBadge, getUrgencyVariant, type UrgencyLevel } from "@/lib/deadline-utils";

interface DeadlineUrgencyProps {
  level: UrgencyLevel;
  daysLeft: number | null;
  className?: string;
}

export function DeadlineUrgency({ level, daysLeft, className }: DeadlineUrgencyProps) {
  const badgeText = getUrgencyBadge(level, daysLeft);
  const variant = getUrgencyVariant(level);

  if (!badgeText) {
    return null;
  }

  return (
    <Badge variant={variant} className={className}>
      {badgeText}
    </Badge>
  );
}

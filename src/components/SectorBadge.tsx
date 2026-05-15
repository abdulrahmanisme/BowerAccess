/**
 * Sector badge component
 * Displays sectors below opportunity cards with +X collapse for overflow
 */

import { Badge } from "./ui/badge";
import { type Sector } from "@/lib/sectors";

interface SectorBadgeProps {
  sectors: Sector[];
  max?: number;
  className?: string;
}

const MAX_SECTORS_DISPLAY = 3;

export function SectorBadge({ sectors, max = MAX_SECTORS_DISPLAY, className }: SectorBadgeProps) {
  if (!sectors || sectors.length === 0) {
    return null;
  }

  const displaySectors = sectors.slice(0, max);
  const remainingCount = sectors.length - displaySectors.length;

  return (
    <div className={`flex flex-wrap gap-1 ${className || ""}`}>
      {displaySectors.map((sector) => (
        <Badge key={sector} variant="secondary" className="text-xs">
          {sector}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

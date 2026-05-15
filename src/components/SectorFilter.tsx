/**
 * Sector filter component
 * Dropdown multi-select sector filter UI for opportunity feed
 */

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { SECTOR_LIST, type Sector } from "@/lib/sectors";
import { ChevronDown, X } from "lucide-react";

interface SectorFilterProps {
  selectedSectors: Sector[];
  onSectorsChange: (sectors: Sector[]) => void;
  counts?: Record<Sector, number>;
}

export function SectorFilter({ selectedSectors, onSectorsChange, counts }: SectorFilterProps) {
  const toggleSector = (sector: Sector) => {
    const newSectors = selectedSectors.includes(sector)
      ? selectedSectors.filter((s) => s !== sector)
      : [...selectedSectors, sector];
    onSectorsChange(newSectors);
  };

  const handleClearAll = () => {
    onSectorsChange([]);
  };

  const handleRemoveSector = (sector: Sector) => {
    onSectorsChange(selectedSectors.filter((s) => s !== sector));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedSectors.length > 0 ? (
          selectedSectors.map((sector) => (
            <Badge key={sector} variant="secondary" className="gap-1.5">
              {sector}
              <button
                onClick={() => handleRemoveSector(sector)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">All sectors</span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Filter Sectors
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Select Sectors</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {selectedSectors.length > 0 && (
            <>
              <DropdownMenuCheckboxItem
                checked={false}
                onCheckedChange={handleClearAll}
                className="text-destructive"
              >
                Clear All
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
            </>
          )}
          {SECTOR_LIST.map((sector) => (
            <DropdownMenuCheckboxItem
              key={sector}
              checked={selectedSectors.includes(sector)}
              onCheckedChange={() => toggleSector(sector)}
            >
              <span className="flex items-center gap-2">
                {sector}
                {counts && counts[sector] && (
                  <span className="text-xs text-muted-foreground">({counts[sector]})</span>
                )}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

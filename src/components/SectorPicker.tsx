/**
 * Sector picker component for admin form
 * Multi-select checkboxes for opportunity sectors
 */

import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { SECTOR_LIST, type Sector } from "@/lib/sectors";

interface SectorPickerProps {
  selectedSectors: Sector[];
  onSectorsChange: (sectors: Sector[]) => void;
}

export function SectorPicker({ selectedSectors, onSectorsChange }: SectorPickerProps) {
  const toggleSector = (sector: Sector) => {
    const newSectors = selectedSectors.includes(sector)
      ? selectedSectors.filter((s) => s !== sector)
      : [...selectedSectors, sector];
    onSectorsChange(newSectors);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Select all relevant sectors (optional)</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SECTOR_LIST.map((sector) => (
          <div key={sector} className="flex items-center space-x-2">
            <Checkbox
              id={`sector-${sector}`}
              checked={selectedSectors.includes(sector)}
              onCheckedChange={() => toggleSector(sector)}
            />
            <Label htmlFor={`sector-${sector}`} className="text-xs font-normal cursor-pointer">
              {sector}
            </Label>
          </div>
        ))}
      </div>
      {selectedSectors.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedSectors.length} sector{selectedSectors.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}

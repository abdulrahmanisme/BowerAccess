/**
 * Sector select dropdown component
 * Multi-select dropdown for opportunity sectors
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";
import { SECTOR_LIST, type Sector } from "@/lib/sectors";

interface SectorSelectProps {
  selectedSectors: Sector[];
  onSectorsChange: (sectors: Sector[]) => void;
  placeholder?: string;
}

export function SectorSelect({
  selectedSectors,
  onSectorsChange,
  placeholder = "Add sector...",
}: SectorSelectProps) {
  const availableSectors = SECTOR_LIST.filter((s) => !selectedSectors.includes(s));

  const handleAddSector = (sector: Sector) => {
    if (!selectedSectors.includes(sector)) {
      onSectorsChange([...selectedSectors, sector]);
    }
  };

  const handleRemoveSector = (sector: Sector) => {
    onSectorsChange(selectedSectors.filter((s) => s !== sector));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedSectors.map((sector) => (
          <Badge key={sector} variant="secondary" className="gap-1.5">
            {sector}
            <button
              onClick={() => handleRemoveSector(sector)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {availableSectors.length > 0 && (
        <Select onValueChange={(value) => handleAddSector(value as Sector)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {availableSectors.map((sector) => (
              <SelectItem key={sector} value={sector}>
                {sector}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

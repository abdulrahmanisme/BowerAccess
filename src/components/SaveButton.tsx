/**
 * Save button component
 * Bookmark toggle for opportunities
 */

import { Button } from "./ui/button";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SaveButtonProps {
  opportunityId: string;
  isSaved: boolean;
  onSave: (opportunityId: string) => Promise<void>;
  onUnsave: (opportunityId: string) => Promise<void>;
  disabled?: boolean;
}

export function SaveButton({
  opportunityId,
  isSaved,
  onSave,
  onUnsave,
  disabled = false,
}: SaveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (disabled) {
      toast.info("Sign in to save opportunities");
      return;
    }

    try {
      setIsLoading(true);

      if (isSaved) {
        await onUnsave(opportunityId);
        toast.success("Removed from saved");
      } else {
        await onSave(opportunityId);
        toast.success("Saved!");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleSave}
      disabled={isLoading || disabled}
      className="gap-1.5"
      title={isSaved ? "Remove from saved" : "Save opportunity"}
    >
      <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}

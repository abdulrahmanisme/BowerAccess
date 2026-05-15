import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ApplicationVerificationToastProps {
  opportunityId: string;
  opportunityTitle: string;
  onVerified?: (opportunityId: string) => void;
  onSavedForLater?: (opportunityId: string) => void;
  userId?: string;
}

export function ApplicationVerificationToast({
  opportunityId,
  opportunityTitle,
  onVerified,
  onSavedForLater,
  userId,
}: ApplicationVerificationToastProps) {
  const [loading, setLoading] = useState(false);

  const handleApplied = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Update pending application status to 'applied'
      // This will be called from index.tsx with supabase client
      onVerified?.(opportunityId);
    } catch (err) {
      console.error("Failed to verify application:", err);
      toast.error("Failed to verify application");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForLater = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      onSavedForLater?.(opportunityId);
    } catch (err) {
      console.error("Failed to save for later:", err);
      toast.error("Failed to save opportunity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Opened: <span className="font-semibold">{opportunityTitle}</span></span>
      <Button
        size="sm"
        variant="default"
        disabled={loading}
        onClick={handleApplied}
        className="gap-1"
      >
        <Check size={14} />
        I Applied ✓
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={loading}
        onClick={handleSaveForLater}
        className="gap-1"
      >
        <Bookmark size={14} />
        Save for Later
      </Button>
    </div>
  );
}

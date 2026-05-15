/**
 * Application confirmation modal
 * Asks users whether they completed applying after they return to the site
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PendingApplication } from "@/hooks/use-pending-applications";

interface ApplicationConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingApplications: PendingApplication[];
  onConfirm: (opportunityId: string, status: "applied" | "in_progress" | "abandoned", reason?: string) => Promise<void>;
  onSaveForLater?: (opportunityId: string) => Promise<void>;
}

export function ApplicationConfirmation({
  open,
  onOpenChange,
  pendingApplications,
  onConfirm,
  onSaveForLater,
}: ApplicationConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [opportunityTitle, setOpportunityTitle] = useState<string>("");
  const [step, setStep] = useState<"initial" | "reason">("initial");
  const [customReason, setCustomReason] = useState("");

  const currentApp = pendingApplications[0];

  const resetState = () => {
    setStep("initial");
    setCustomReason("");
  };

  // Fetch opportunity title when currentApp changes
  useEffect(() => {
    if (!currentApp) return;

    const fetchTitle = async () => {
      try {
        const { data } = await supabase
          .from("opportunities")
          .select("title")
          .eq("id", currentApp.opportunity_id)
          .single();
        
        if (data?.title) {
          setOpportunityTitle(data.title);
        }
      } catch (err) {
        console.error("Failed to fetch opportunity title:", err);
        setOpportunityTitle(currentApp.opportunity_id);
      }
    };

    fetchTitle();
  }, [currentApp]);

  if (!open || pendingApplications.length === 0) {
    if (step !== "initial") resetState();
    return null;
  }

  const handleConfirm = async (status: "applied" | "in_progress" | "abandoned", submitReason?: string) => {
    try {
      setIsSubmitting(true);
      await onConfirm(currentApp.opportunity_id, status, submitReason);

      // If this was the last application in the array, close the modal
      if (pendingApplications.length <= 1) {
        onOpenChange(false);
      }
      resetState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update application status";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveForLater = async () => {
    try {
      setIsSubmitting(true);
      // Track as feedback_useful with reason before saving
      await onConfirm(currentApp.opportunity_id, "applied", "Saved to Apply Later");
      await onSaveForLater?.(currentApp.opportunity_id);
      toast.success("Opportunity saved to your list");

      // If this was the last application in the array, close the modal
      if (pendingApplications.length <= 1) {
        onOpenChange(false);
      }
      resetState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save opportunity";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={() => { /* mandatory — user must respond */ }}>
      <DialogContent
        className="sm:max-w-sm [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{step === "initial" ? "Welcome back!" : "Why wasn't this relevant?"}</DialogTitle>
          <DialogDescription>
            {step === "initial" 
              ? "We noticed you started applying to this opportunity. Did you complete your application?"
              : "Your feedback helps us show better opportunities for your stage and sector."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {step === "initial" ? (
            <>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="font-medium text-sm">{opportunityTitle || currentApp.opportunity_id}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  onClick={() => handleConfirm("applied", "Applied")}
                  disabled={isSubmitting}
                  className="w-full"
                  variant="default"
                >
                  Yes, I Applied
                </Button>

                <Button
                  onClick={() => handleConfirm("in_progress", "Still Applying")}
                  disabled={isSubmitting}
                  className="w-full"
                  variant="outline"
                >
                  Still Applying
                </Button>

                <Button
                  onClick={() => setStep("reason")}
                  disabled={isSubmitting}
                  className="w-full"
                  variant="outline"
                >
                  Not Interested
                </Button>

                <Button
                  onClick={handleSaveForLater}
                  disabled={isSubmitting}
                  className="w-full"
                  variant="outline"
                >
                  Save to Apply Later
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="custom-reason" className="text-sm">Please share your reason</Label>
                <Textarea
                  id="custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Tell us why you are not interested..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={isSubmitting}
                  onClick={() => resetState()}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={isSubmitting || customReason.trim().length === 0}
                  onClick={() => {
                    void handleConfirm("abandoned", customReason.trim());
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>
          )}
        </div>

        {pendingApplications.length > 1 && (
          <p className="text-xs text-center text-muted-foreground">
            1 of {pendingApplications.length}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

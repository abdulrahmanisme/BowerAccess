import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  onFeedbackSubmitted?: (opportunityId: string) => void;
}

const reasons = [
  "Not relevant to me",
  "Already applied",
  "Deadline passed",
  "Other",
];

export function FeedbackDialog({ open, onOpenChange, opportunityId, onFeedbackSubmitted }: FeedbackDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"initial" | "reason">("initial");
  const [reason, setReason] = useState(reasons[0]);
  const [otherReason, setOtherReason] = useState("");

  const resetDialogState = () => {
    setStep("initial");
    setReason(reasons[0]);
    setOtherReason("");
  };

  const trackFeedback = async (
    useful: boolean,
    meta?: string,
    reasonType?: "preset" | "other"
  ) => {
    if (!user) return;
    const isSeedContent = opportunityId.startsWith("seed-");

    await trackEvent({
      userId: user.id,
      opportunityId: isSeedContent ? undefined : opportunityId,
      eventType: useful ? "feedback_useful" : "feedback_not_useful",
      metadata: {
        reason: meta || null,
        reason_type: reasonType || null,
        content_id: opportunityId,
        is_seed_content: isSeedContent,
      },
      pagePath: "/",
      eventSource: "feedback_dialog",
    });
    onFeedbackSubmitted?.(opportunityId);
    toast.success("Thanks for your feedback!");
    onOpenChange(false);
    resetDialogState();
  };

  const isOtherSelected = reason === "Other";
  const otherReasonTrimmed = otherReason.trim();
  const isSubmitDisabled = isOtherSelected && otherReasonTrimmed.length === 0;

  return (
    <Dialog open={open} onOpenChange={() => { /* Prevent closing from outside/escape */ }}>
      <DialogContent 
        className="sm:max-w-sm [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display">Was this useful?</DialogTitle>
          <DialogDescription>Your feedback helps us curate better opportunities.</DialogDescription>
        </DialogHeader>

        {step === "initial" ? (
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => trackFeedback(true)}
            >
              <ThumbsUp className="h-4 w-4" /> Yes
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                setReason(reasons[0]);
                setOtherReason("");
                setStep("reason");
              }}
            >
              <ThumbsDown className="h-4 w-4" /> No
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <RadioGroup
              value={reason}
              onValueChange={(value) => {
                setReason(value);
                if (value !== "Other") {
                  setOtherReason("");
                }
              }}
            >
              {reasons.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="text-sm">{r}</Label>
                </div>
              ))}
            </RadioGroup>

            {isOtherSelected && (
              <div className="space-y-2">
                <Label htmlFor="other-reason" className="text-sm">Please share your reason</Label>
                <Input
                  id="other-reason"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Type your reason"
                />
              </div>
            )}

            <Button
              className="w-full"
              disabled={isSubmitDisabled}
              onClick={() => {
                if (isOtherSelected) {
                  void trackFeedback(false, otherReasonTrimmed, "other");
                  return;
                }

                void trackFeedback(false, reason, "preset");
              }}
            >
              Submit
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

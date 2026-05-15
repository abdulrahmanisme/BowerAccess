import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { OpportunityCategory, applicationExperienceFeedbackQuestions } from "@/lib/feedback-config";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationExperienceFeedbackProps {
  isOpen: boolean;
  opportunityId: string;
  opportunityTitle: string;
  category: OpportunityCategory;
  userId?: string;
  onSubmit?: (feedbackText: string) => Promise<void>;
  onClose?: () => void;
}

export function ApplicationExperienceFeedback({
  isOpen,
  opportunityId,
  opportunityTitle,
  category,
  userId,
  onSubmit,
  onClose,
}: ApplicationExperienceFeedbackProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(opportunityTitle);

  useEffect(() => {
    // If no title provided, fetch from database
    if (!opportunityTitle || opportunityTitle.length === 0) {
      const fetchTitle = async () => {
        try {
          const { data } = await supabase
            .from("opportunities")
            .select("title")
            .eq("id", opportunityId)
            .single();
          
          if (data?.title) {
            setDisplayTitle(data.title);
          }
        } catch (err) {
          console.error("Failed to fetch opportunity title:", err);
        }
      };
      fetchTitle();
    } else {
      setDisplayTitle(opportunityTitle);
    }
  }, [opportunityId, opportunityTitle]);

  const question = applicationExperienceFeedbackQuestions[category] || "Tell us about your experience.";

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      toast.error("Please share your experience");
      return;
    }

    if (!userId) {
      toast.error("Please log in to submit feedback");
      return;
    }

    setLoading(true);
    try {
      await onSubmit?.(feedbackText);
      toast.success("Thank you for your feedback!");
      setFeedbackText("");
      onClose?.();
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast.error("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Your Experience</DialogTitle>
          <DialogDescription>
            We'd love to hear about your experience with <span className="font-semibold">{displayTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium text-foreground">{question}</p>
          </div>

          <Textarea
            placeholder="Share your thoughts... E.g., The application was straightforward and took about 10 minutes. The founder's background was compelling..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={loading}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {feedbackText.length}/500 characters
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Skip
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !feedbackText.trim()}
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

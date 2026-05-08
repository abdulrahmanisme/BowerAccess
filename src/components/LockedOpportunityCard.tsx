import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { useAuth } from "@/hooks/use-auth";
import type { BulletinItem } from "@/lib/bulletin";

interface LockedOpportunityCardProps {
  opportunity: BulletinItem;
  enrollmentUrl?: string;
}

const DEFAULT_ENROLLMENT_URL = "https://bowerschool.com";

export function LockedOpportunityCard({
  opportunity,
  enrollmentUrl = DEFAULT_ENROLLMENT_URL,
}: LockedOpportunityCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();

  const handleCardClick = () => {
    setModalOpen(true);

    if (user) {
      void trackEvent({
        userId: user.id,
        eventType: "view",
        opportunityId: opportunity.id,
        pagePath: "/",
        eventSource: "home_locked_card",
        metadata: {
          locked: true,
          opportunity_id: opportunity.id,
        },
      });
    }
  };

  const handleEnrollClick = () => {
    if (user) {
      void trackEvent({
        userId: user.id,
        eventType: "click_get_access",
        opportunityId: opportunity.id,
        linkUrl: enrollmentUrl,
        pagePath: "/",
        eventSource: "home_locked_card",
        metadata: {
          locked: true,
          opportunity_id: opportunity.id,
          destination: enrollmentUrl,
        },
      });
    }

    window.open(enrollmentUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Card
        className="group relative flex flex-col cursor-pointer transition-shadow hover:shadow-md border-border/70 bg-card/60 overflow-hidden"
        onClick={handleCardClick}
      >
        {/* Blurred content layer */}
        <div className="pointer-events-none select-none" style={{ filter: "blur(6px)" }}>
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="font-display text-base leading-snug text-balance sm:text-lg">
                {opportunity.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="relative w-full overflow-hidden rounded-md border border-border/70 bg-muted/30 aspect-[4/1]">
              {opportunity.imageUrl ? (
                <img
                  src={opportunity.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-4 w-3/4 rounded bg-muted/60" />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 border-t p-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pt-4">
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {opportunity.dateLabel || ""}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Get Access
            </span>
          </CardFooter>
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/40 backdrop-blur-[1px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/90 shadow-sm">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="max-w-[240px] text-center text-xs font-medium leading-snug text-muted-foreground">
            Enroll in a Bower Course for full access
          </p>
        </div>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Full access is reserved for Bower Course students
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              This opportunity — and all others in the bulletin — are available
              to students enrolled in a Bower Course. Enroll today to unlock
              everything.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button onClick={handleEnrollClick} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Enroll Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

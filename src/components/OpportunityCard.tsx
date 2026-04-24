import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useItemView } from "@/hooks/use-item-view";
import { useState } from "react";
import { Briefcase, Calendar, Clock, ExternalLink, Lightbulb, MapPin, Newspaper } from "lucide-react";
import { isPosterOptionalForCategory, type BulletinItem } from "@/lib/bulletin";

const defaultBannerCrop = {
  x: 50,
  y: 50,
  zoom: 1,
  ratio: 4,
};

const optionalPosterPlaceholderConfig = {
  news: {
    title: "Ecosystem News",
    subtitle: "Text-first update",
    gradientClass: "from-secondary/90 via-secondary/60 to-card",
    Icon: Newspaper,
  },
  hiring: {
    title: "Hiring - VC / PE Cohort",
    subtitle: "Role details inside",
    gradientClass: "from-hiring/25 via-secondary/50 to-card",
    Icon: Briefcase,
  },
  something_new: {
    title: "New for you",
    subtitle: "Fresh opportunity notes",
    gradientClass: "from-primary/25 via-secondary/50 to-card",
    Icon: Lightbulb,
  },
} as const;

function getOptionalPosterPlaceholder(category: BulletinItem["category"]) {
  if (category === "news" || category === "hiring" || category === "something_new") {
    return optionalPosterPlaceholderConfig[category];
  }

  return null;
}

function getBannerCrop(crop?: BulletinItem["bannerCrop"]) {
  if (!crop) {
    return defaultBannerCrop;
  }

  return {
    x: Math.min(100, Math.max(0, crop.x)),
    y: Math.min(100, Math.max(0, crop.y)),
    zoom: Math.min(3, Math.max(1, crop.zoom)),
    ratio: 4,
  };
}

interface OpportunityCardProps {
  opportunity: BulletinItem;
  onGetAccess: (id: string) => void;
  onViewed?: (id: string, durationMs: number) => void;
  onClose?: (id: string) => void;
}

export function OpportunityCard({ opportunity, onGetAccess, onViewed, onClose }: OpportunityCardProps) {
  const [open, setOpen] = useState(false);
  const [jdOpen, setJdOpen] = useState(false);
  const hasAction = Boolean(opportunity.link);
  const isHiring = opportunity.category === "hiring";

  const handleApplyClick = () => {
    if (isHiring && opportunity.jobDescription) {
      setJdOpen(true);
    } else {
      onGetAccess(opportunity.id);
    }
  };

  const bannerCrop = getBannerCrop(opportunity.bannerCrop);
  const hasPoster = Boolean(opportunity.imageUrl);
  const isPosterOptional = isPosterOptionalForCategory(opportunity.category);
  const optionalPlaceholder = getOptionalPosterPlaceholder(opportunity.category);
  const showDialogPosterBlock = hasPoster || !isPosterOptional;
  const rootRef = useItemView({
    onViewed: (durationMs) => onViewed?.(opportunity.id, durationMs),
  });

  return (
    <>
      <Card
        ref={rootRef}
        className="group flex cursor-pointer flex-col border-border/70 bg-card/60 transition-shadow hover:shadow-md"
        onClick={() => setOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-display text-lg leading-snug text-balance">
              {opportunity.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="relative overflow-hidden rounded-md border border-border/70 bg-muted/30">
            <AspectRatio ratio={4 / 1}>
              {hasPoster ? (
                <img
                  src={opportunity.imageUrl}
                  alt={`${opportunity.title} banner preview`}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${bannerCrop.x}% ${bannerCrop.y}%`,
                    transform: `scale(${bannerCrop.zoom})`,
                    transformOrigin: `${bannerCrop.x}% ${bannerCrop.y}%`,
                  }}
                  loading="lazy"
                />
              ) : isPosterOptional && optionalPlaceholder ? (
                <div className={`relative flex h-full w-full items-center bg-gradient-to-br ${optionalPlaceholder.gradientClass}`}>
                  <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-background/25 blur-xl" />
                  <div className="absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-background/20 blur-2xl" />
                  <div className="relative flex w-full items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/85">
                        {optionalPlaceholder.title}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {isHiring && opportunity.description
                          ? opportunity.description
                          : optionalPlaceholder.subtitle}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 rounded-full border border-border/60 bg-background/75 p-2">
                      <optionalPlaceholder.Icon className="h-4 w-4 text-foreground/80" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No poster uploaded
                </div>
              )}

              {hasPoster ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white">Masked preview</p>
                    <p className="text-[11px] text-white/80">Tap to reveal full details and poster.</p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-background/70 p-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {isPosterOptional ? "Tap to open full details." : "Poster can be added from admin."}
                  </p>
                </div>
              )}
            </AspectRatio>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground">
            {(opportunity.category === "funding" || opportunity.category === "events") && opportunity.dateLabel
              ? opportunity.dateLabel
              : ""}
          </span>
          <span className="text-xs font-medium text-primary">Click to view and apply</span>
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) onClose?.(opportunity.id);
      }}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-6 font-display text-xl">{opportunity.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Opportunity details with full information and poster.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {showDialogPosterBlock ? (
              hasPoster ? (
                <img
                  src={opportunity.imageUrl}
                  alt={`${opportunity.title} poster`}
                  className="h-auto w-full rounded-lg border object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
                  Poster not available
                </div>
              )
            ) : null}

            <p className="text-sm leading-relaxed text-muted-foreground">{opportunity.description}</p>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              {opportunity.dateLabel && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{opportunity.dateLabel}</span>
                </div>
              )}
              {opportunity.timeLabel && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{opportunity.timeLabel}</span>
                </div>
              )}
              {opportunity.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{opportunity.venue}</span>
                </div>
              )}

              {opportunity.detailBullets && opportunity.detailBullets.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Details</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                    {opportunity.detailBullets.map((point, idx) => (
                      <li key={`${opportunity.id}-detail-${idx}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {opportunity.amountLabel && (
              <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm font-medium text-secondary-foreground">
                {opportunity.amountLabel}
              </p>
            )}

            {hasAction ? (
              <Button
                size="sm"
                onClick={handleApplyClick}
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {opportunity.category === "news" ? "Read More" : "Apply"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={jdOpen} onOpenChange={setJdOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Full Job Description</DialogTitle>
            <DialogDescription className="sr-only">
              Complete job description for {opportunity.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {opportunity.jobDescription}
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setJdOpen(false)}>
                Go Back
              </Button>
              <Button 
                onClick={() => {
                  setJdOpen(false);
                  onGetAccess(opportunity.id);
                }}
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Confirm & Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

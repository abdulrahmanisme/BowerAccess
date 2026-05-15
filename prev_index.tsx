import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { trackEvent } from "@/lib/tracking";
import { useFeedbackMemory } from "@/hooks/use-feedback-memory";
import { OpportunityCard } from "@/components/OpportunityCard";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isValid, parseISO, isBefore, startOfDay, isToday } from "date-fns";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { BulletinItem } from "@/lib/bulletin";
import { BULLETIN_SECTIONS } from "@/lib/bulletin";

type CategoryFilter = BulletinItem["category"] | "all";

const HOME_CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "funding", label: "Capital and Opportunities" },
  { value: "events", label: "Events" },
  { value: "news", label: "Ecosystem News" },
  { value: "hiring", label: "Hiring - VC / PE Cohort" },
  { value: "something_new", label: "≡ƒÆÑ New for you" },
];

function toTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getOpportunitySortTimestamp(opp: Tables<"opportunities">): number {
  const endOrDeadline = toTimestamp(opp.end_date) ?? toTimestamp(opp.deadline);
  const startDate = toTimestamp(opp.start_date);
  const createdAt = toTimestamp(opp.created_at);
  return endOrDeadline ?? startDate ?? createdAt ?? 0;
}

function parseBannerCrop(raw: Tables<"opportunities">["poster_banner_crop"]): BulletinItem["bannerCrop"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const crop = raw as Record<string, unknown>;
  const x = typeof crop.x === "number" ? crop.x : 50;
  const y = typeof crop.y === "number" ? crop.y : 50;
  const zoom = typeof crop.zoom === "number" ? crop.zoom : 1;

  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
    zoom: Math.min(3, Math.max(1, zoom)),
    ratio: 4,
  };
}

function formatOpportunityDate(value?: string | null) {
  if (!value) return undefined;

  const parsedDate = parseISO(value);
  if (!isValid(parsedDate)) {
    return undefined;
  }

  return format(parsedDate, "d-MMM-yyyy");
}

function mapToBulletinItem(opp: Tables<"opportunities">): BulletinItem {
  const startDate = formatOpportunityDate(opp.start_date);
  const endDate = formatOpportunityDate(opp.end_date);
  const legacyDeadline = formatOpportunityDate(opp.deadline);

  let dateLabel: string | undefined;
  if (startDate && endDate) {
    dateLabel = `${startDate} - ${endDate}`;
  } else if (startDate) {
    dateLabel = `Starts: ${startDate}`;
  } else if (endDate) {
    dateLabel = `Ends: ${endDate}`;
  } else if (legacyDeadline) {
    dateLabel = `Deadline: ${legacyDeadline}`;
  }

  const detailBullets = (opp.details_bullets || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*\u2022]\s*/, ""));

  return {
    id: opp.id,
    title: opp.title,
    description: opp.description,
    jobDescription: opp.job_description || undefined,
    detailBullets: detailBullets.length > 0 ? detailBullets : undefined,
    category: (opp.category as BulletinItem["category"]) || "funding",
    status: opp.status,
    dateLabel,
    startDate: opp.start_date || undefined,
    endDate: opp.end_date || opp.deadline || undefined,
    link: opp.external_link || undefined,
    imageUrl: opp.poster_url || undefined,
    bannerCrop: parseBannerCrop(opp.poster_banner_crop),
    itemOrder: opp.item_order ?? undefined,
    source: "db",
  };
}

export default function IndexPage() {
  const { user, signInWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Tables<"opportunities">[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const { hasFeedback, markFeedback } = useFeedbackMemory(user?.id ?? null);

  useEffect(() => {
    const handleFocus = () => {
      if (lastAppliedId) {
        if (!hasFeedback(lastAppliedId)) {
          setFeedbackId(lastAppliedId);
        }
        setLastAppliedId(null);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [lastAppliedId, hasFeedback]);

  usePageTracking(user?.id || null, "/");

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, navigate, user]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setOpportunities(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleCardClose = (id: string) => {
    // If we were waiting for them to come back from an "Apply" click, 
    // we clear that since they are now closing the card manually.
    if (lastAppliedId === id) {
      setLastAppliedId(null);
    }
    // Only prompt feedback once per opportunity per user.
    if (!hasFeedback(id)) {
      setFeedbackId(id);
    }
  };

  const handleGetAccess = (id: string) => {
    const dbItem = opportunities.find((o) => o.id === id);
    const targetLink = dbItem?.external_link;
    const itemCategory = dbItem?.category;
    const itemTitle = dbItem?.title;

    if (!dbItem) {
      toast.error("This item is no longer available.");
      return;
    }

    if (!targetLink) {
      toast.info("Details will be shared with you soon.");
      return;
    }

    if (!user) {
      void signInWithGoogle();
      return;
    }

    // Open the link SYNCHRONOUSLY inside the user-gesture call stack.
    // Deferring this after async trackEvent() calls causes browsers to
    // block the popup because the user-gesture context has expired.
    setLastAppliedId(id);
    window.open(targetLink, "_blank", "noopener,noreferrer");

    // Fire-and-forget: analytics tracking should never block navigation.
    void trackEvent({
      userId: user.id,
      opportunityId: dbItem?.id,
      eventType: "click_get_access",
      linkUrl: targetLink,
      metadata: {
        title: itemTitle,
        category: itemCategory,
        source: "db",
      },
      pagePath: "/",
      eventSource: "home_card",
    });
  };

  const handleItemViewed = async (item: BulletinItem, durationMs: number) => {
    if (!user) return;

    await trackEvent({
      userId: user.id,
      eventType: "item_viewed",
      opportunityId: item.id,
      durationMs,
      pagePath: "/",
      eventSource: "home_item",
      metadata: {
        title: item.title,
        category: item.category,
        source: "db",
        content_id: item.id,
      },
    });
  };

  const dbItems = opportunities.map(mapToBulletinItem);
  const publishedItems = dbItems.filter((item) => item.status === "published");
  const categoryCounts = publishedItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  const sortTimestampById = new Map(
    opportunities.map((opp) => [opp.id, getOpportunitySortTimestamp(opp)])
  );
  const filteredItems = publishedItems.filter((item) => {
    if (categoryFilter === "all") return true;
    return item.category === categoryFilter;
  });
  const selectedFilterLabel = HOME_CATEGORY_FILTERS.find((filter) => filter.value === categoryFilter)?.label || "All opportunities";

  const checkExpired = (item: BulletinItem) => {
    const expiryDateString = item.endDate || item.startDate;
    if (!expiryDateString) return false;
    const expiryDate = parseISO(expiryDateString);
    if (!isValid(expiryDate)) return false;
    return isBefore(startOfDay(expiryDate), startOfDay(new Date()));
  };

  const checkIsToday = (item: BulletinItem) => {
    if (checkExpired(item)) return false;
    let today = false;
    if (item.startDate) {
      const d = parseISO(item.startDate);
      if (isValid(d) && isToday(d)) today = true;
    }
    if (item.endDate) {
      const d = parseISO(item.endDate);
      if (isValid(d) && isToday(d)) today = true;
    }
    return today;
  };

  const sortItems = (items: BulletinItem[]) => {
    const todayMs = startOfDay(new Date()).getTime();

    return [...items].sort((a, b) => {
      const aExpired = checkExpired(a);
      const bExpired = checkExpired(b);

      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;

      const aToday = checkIsToday(a);
      const bToday = checkIsToday(b);

      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;

      const aTimestamp = sortTimestampById.get(a.id) ?? 0;
      const bTimestamp = sortTimestampById.get(b.id) ?? 0;

      if (!aExpired && !bExpired) {
        const aHasFutureDate = Boolean((a.startDate || a.endDate) && aTimestamp >= todayMs);
        const bHasFutureDate = Boolean((b.startDate || b.endDate) && bTimestamp >= todayMs);

        if (aHasFutureDate && !bHasFutureDate) return -1;
        if (!aHasFutureDate && bHasFutureDate) return 1;

        if (aHasFutureDate && bHasFutureDate) {
          if (aTimestamp !== bTimestamp) {
            return aTimestamp - bTimestamp;
          }
        }
      }

      // For items without future dates (news, something_new), sort newest first based on created_at
      const byDate = bTimestamp - aTimestamp;

      if (byDate !== 0) {
        return byDate;
      }

      return (a.itemOrder || 999) - (b.itemOrder || 999);
    });
  };

  if (isLoading || !user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <section className="mb-8 rounded-xl border border-border/70 bg-gradient-to-br from-card to-secondary/40 p-5 sm:mb-10 sm:rounded-2xl sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Bower Access</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Curated for builders and founders of Bower.
        </h1>
        <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
          This edition covers opportunities dated between 2 May ΓÇô 17 May. Scan fast, act faster.
        </p>
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {HOME_CATEGORY_FILTERS.map((filter) => {
              const count = filter.value === "all"
                ? publishedItems.length
                : categoryCounts[filter.value] || 0;
              return (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={categoryFilter === filter.value ? "default" : "secondary"}
                  className="rounded-full"
                  onClick={() => setCategoryFilter(filter.value)}
                >
                  {filter.label} ({count})
                </Button>
              );
            })}
          </div>

        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : publishedItems.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">No bulletin items are available right now.</p>
          <p className="mt-1 text-sm">
            Add or import published items from the
            {" "}
            <Link to="/admin" className="text-primary underline underline-offset-4">
              admin dashboard
            </Link>
            .
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">No opportunities found for {selectedFilterLabel}.</p>
          <p className="mt-1 text-sm">Try a different category or switch sorting to review other items.</p>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {BULLETIN_SECTIONS.map((section) => {
            const sectionItems = sortItems(
              filteredItems.filter((item) => item.category === section.category)
            );

            if (sectionItems.length === 0) {
              return null;
            }

            return (
              <section key={section.category} className="space-y-4">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                  <Separator />
                </div>

                <div className="space-y-3">
                  {sectionItems.map((item, idx) => (
                    <div key={item.id} className="grid gap-3 sm:grid-cols-[42px_1fr] sm:items-start">
                      <div className="hidden h-10 w-10 items-center justify-center rounded-full border bg-muted/50 text-sm font-semibold text-foreground sm:flex">
                        {idx + 1}
                      </div>
                      <OpportunityCard
                        opportunity={item}
                        onGetAccess={handleGetAccess}
                        onViewed={(_, durationMs) => {
                          void handleItemViewed(item, durationMs);
                        }}
                        onClose={handleCardClose}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {feedbackId && (
        <FeedbackDialog
          open={!!feedbackId}
          onOpenChange={(v) => { if (!v) setFeedbackId(null); }}
          opportunityId={feedbackId}
          onFeedbackSubmitted={(id) => markFeedback(id)}
        />
      )}
    </main>
  );
}

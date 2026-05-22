import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { trackEvent } from "@/lib/tracking";
import { useSavedOpportunities } from "@/hooks/use-saved-opportunities";
import { usePendingApplications } from "@/hooks/use-pending-applications";
import { OpportunityCard } from "@/components/OpportunityCard";
import { ApplicationConfirmation } from "@/components/ApplicationConfirmation";
import { useFeedbackMemory } from "@/hooks/use-feedback-memory";
import { SectorFilter } from "@/components/SectorFilter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isValid, parseISO, isBefore, startOfDay, isToday } from "date-fns";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { BulletinItem } from "@/lib/bulletin";
import { BULLETIN_SECTIONS } from "@/lib/bulletin";
import type { Sector } from "@/lib/sectors";
import { validateSectors } from "@/lib/sectors";
import { getUrgencyLevel, getUrgencySortValue } from "@/lib/deadline-utils";
import type { OpportunityCategory } from "@/lib/feedback-config";

type CategoryFilter = BulletinItem["category"] | "all";

const HOME_CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "funding", label: "Capital and Opportunities" },
  { value: "events", label: "Events" },
  { value: "news", label: "Ecosystem News" },
  { value: "hiring", label: "Hiring - VC / PE Cohort" },
  { value: "something_new", label: "💥 New for you" },
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
    dateLabel = `Ends: ${startDate}`;
  } else if (endDate) {
    dateLabel = `Ends: ${endDate}`;
  } else if (legacyDeadline) {
    dateLabel = `Deadline: ${legacyDeadline}`;
  }

  const allBullets = (opp.details_bullets || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*\u2022]\s*/, ""));

  // Extract structured funding fields from bullet lines (e.g. "Stage: Pre-seed")
  const extractBulletValue = (prefix: string) => {
    const match = allBullets.find((b) =>
      b.toLowerCase().startsWith(prefix.toLowerCase() + ":")
    );
    return match ? match.slice(prefix.length + 1).trim() : undefined;
  };

  const fundingStage = opp.category === "funding" ? extractBulletValue("Stage") : undefined;
  const fundingAmount = opp.category === "funding" ? extractBulletValue("Amount") : undefined;

  // Check for rolling deadline (applies to all categories)
  const isRollingDeadline = allBullets.some(
    (b) => b.toLowerCase().startsWith("deadline:") && b.toLowerCase().includes("rolling")
  );

  // Remove structured fields from the visible bullet list so they don't double-render
  const detailBullets = allBullets.filter((b) => {
    const lower = b.toLowerCase();
    return !lower.startsWith("stage:") && !lower.startsWith("amount:") && !lower.startsWith("deadline:");
  });

  // Rolling deadline overrides any date-based label
  const resolvedDateLabel = isRollingDeadline ? "Rolling Basis" : dateLabel;

  return {
    id: opp.id,
    title: opp.title,
    description: opp.description,
    jobDescription: opp.job_description || undefined,
    detailBullets: detailBullets.length > 0 ? detailBullets : undefined,
    category: (opp.category as BulletinItem["category"]) || "funding",
    status: opp.status,
    dateLabel: resolvedDateLabel,
    startDate: opp.start_date || undefined,
    endDate: opp.end_date || opp.deadline || undefined,
    createdAt: opp.created_at,
    link: opp.external_link || undefined,
    imageUrl: opp.poster_url || undefined,
    bannerCrop: parseBannerCrop(opp.poster_banner_crop),
    itemOrder: opp.item_order ?? undefined,
    sectors: validateSectors((opp.sectors as unknown[]) || []),
    source: "db",
    fundingStage,
    fundingAmount,
  };
}

export default function IndexPage() {
  const { user, signInWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Tables<"opportunities">[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);
  const [lastAppliedTime, setLastAppliedTime] = useState<number | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedSectors, setSelectedSectors] = useState<Sector[]>([]);
  const [showAppConfirmation, setShowAppConfirmation] = useState(false);
  const [hasShownAppConfirmationOnce, setHasShownAppConfirmationOnce] = useState(false);

  const { saved, isSaved, save, unsave } = useSavedOpportunities(user?.id ?? null);
  const { pending, confirmApplication, confirmApplicationViaToast, saveForLater, refresh } = usePendingApplications(user?.id ?? null);

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



  // Show application confirmation modal when user returns with pending applications
  useEffect(() => {
    if (user && pending.length > 0 && !hasShownAppConfirmationOnce) {
      setShowAppConfirmation(true);
      setHasShownAppConfirmationOnce(true);
    }
  }, [user, pending, hasShownAppConfirmationOnce]);

  // Trigger Welcome Back modal immediately upon window focus after clicking apply
  useEffect(() => {
    const handleFocus = () => {
      if (lastAppliedId) {
        // The user just returned from the external application link
        void refresh();
        setHasShownAppConfirmationOnce(false);
        setLastAppliedId(null);
        setLastAppliedTime(null);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [lastAppliedId, refresh]);





  const handleGetAccess = (id: string) => {
    const dbItem = opportunities.find((o) => o.id === id);
    const targetLink = dbItem?.external_link;
    const itemCategory = (dbItem?.category ?? "hiring") as OpportunityCategory;
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
    setLastAppliedTime(Date.now());
    window.open(targetLink, "_blank", "noopener,noreferrer");

    // Insert pending application record
    void (async () => {
      try {
        await supabase.from("pending_applications").insert({
          user_id: user.id,
          opportunity_id: id,
          status: "clicked",
          clicked_at: new Date().toISOString(),
        });
      } catch (err) {
        // Silently fail - this is non-critical tracking
        console.error("Could not insert pending application:", err);
      }
    })();



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
    // Apply category filter
    if (categoryFilter !== "all" && item.category !== categoryFilter) {
      return false;
    }

    // Apply sector filter
    if (selectedSectors.length > 0) {
      const itemSectors = item.sectors || [];
      const hasSectorMatch = selectedSectors.some((sector) => itemSectors.includes(sector));
      if (!hasSectorMatch) {
        return false;
      }
    }

    return true;
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
    return [...items].sort((a, b) => {
      // Get urgency levels for both items
      const aUrgency = getUrgencyLevel({
        endDate: a.endDate,
        deadline: a.endDate, // fallback to endDate
        startDate: a.startDate,
        createdAt: a.createdAt,
      });
      const bUrgency = getUrgencyLevel({
        endDate: b.endDate,
        deadline: b.endDate,
        startDate: b.startDate,
        createdAt: b.createdAt,
      });

      // Sort by urgency level first (lower value = higher priority)
      const aSort = getUrgencySortValue(aUrgency);
      const bSort = getUrgencySortValue(bUrgency);

      if (aSort !== bSort) {
        return aSort - bSort;
      }

      // Within same urgency level, sort by deadline (earliest first)
      const aTimestamp = sortTimestampById.get(a.id) ?? 0;
      const bTimestamp = sortTimestampById.get(b.id) ?? 0;

      if (aTimestamp !== bTimestamp) {
        return aTimestamp - bTimestamp;
      }

      // Tiebreaker: item_order, then created_at
      const aOrder = a.itemOrder ?? 999;
      const bOrder = b.itemOrder ?? 999;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return 0;
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
          This edition covers opportunities dated between 23 May – 7 May. Scan fast, act faster.
        </p>
        <div className="mt-8">
          <div className="rounded-lg border bg-card/50 backdrop-blur-sm p-4 space-y-4">
            {/* Category Filters */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Category</h3>
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
                      variant={categoryFilter === filter.value ? "default" : "outline"}
                      className="text-xs"
                      onClick={() => setCategoryFilter(filter.value)}
                    >
                      {filter.label} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Sector Filter */}
            <div className="border-t pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sector</h3>
              <SectorFilter
                selectedSectors={selectedSectors}
                onSectorsChange={(sectors) => {
                  setSelectedSectors(sectors);

                  // Track sector filter change
                  if (user) {
                    void trackEvent({
                      userId: user.id,
                      eventType: "sector_filter_applied" as any,
                      metadata: {
                        sectors: sectors,
                        action: sectors.length > 0 ? "apply" : "clear",
                      },
                      pagePath: "/",
                    });
                  }
                }}
              />
            </div>
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
                        userId={user?.id}
                        isSaved={isSaved(item.id)}
                        onSave={save}
                        onUnsave={unsave}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}


      {user && (
        <ApplicationConfirmation
          open={showAppConfirmation}
          onOpenChange={setShowAppConfirmation}
          pendingApplications={pending}
          onConfirm={confirmApplication}
          onSaveForLater={saveForLater}
        />
      )}


    </main>
  );
}

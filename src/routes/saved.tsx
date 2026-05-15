import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSavedOpportunities } from "@/hooks/use-saved-opportunities";
import { useFeedbackMemory } from "@/hooks/use-feedback-memory";
import { useFeedbackTrigger } from "@/hooks/use-feedback-trigger";
import { usePendingApplications } from "@/hooks/use-pending-applications";
import { OpportunityCard } from "@/components/OpportunityCard";
import { ApplicationConfirmation } from "@/components/ApplicationConfirmation";
import { SectorFilter } from "@/components/SectorFilter";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Bookmark } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import type { Tables } from "@/integrations/supabase/types";
import type { BulletinItem } from "@/lib/bulletin";
import { BULLETIN_SECTIONS } from "@/lib/bulletin";
import type { Sector } from "@/lib/sectors";
import { validateSectors } from "@/lib/sectors";
import { format, isValid, parseISO } from "date-fns";

type CategoryFilter = "all" | "funding" | "events" | "hiring" | "news" | "something_new";

interface SavedOpportunitiesData extends Tables<"opportunities"> {
  saved_at?: string;
}

function mapToBulletinItem(opp: SavedOpportunitiesData): BulletinItem {
  const endDate = opp.deadline_date ? parseISO(opp.deadline_date) : null;
  const startDate = opp.start_date ? parseISO(opp.start_date) : null;

  let dateLabel: string | undefined;
  if (opp.category === "events" && endDate && isValid(endDate)) {
    dateLabel = format(endDate, "d MMM");
  } else if (opp.category === "funding" && endDate && isValid(endDate)) {
    dateLabel = format(endDate, "d MMM");
  }

  return {
    id: opp.id,
    title: opp.title,
    description: opp.description || "",
    category: opp.category as any,
    imageUrl: opp.poster_url || "",
    link: opp.external_link || "",
    venue: opp.venue || undefined,
    dateLabel,
    timeLabel: opp.event_time || undefined,
    amountLabel:
      opp.category === "funding" && opp.funding_amount
        ? `$${opp.funding_amount.toLocaleString("en-US")}`
        : undefined,
    jobDescription: opp.job_description || undefined,
    detailBullets: opp.opportunity_details || undefined,
    endDate,
    startDate,
    createdAt: opp.created_at,
    sectors: validateSectors(opp.sectors || []),
  };
}

export default function SavedPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<SavedOpportunitiesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedSectors, setSelectedSectors] = useState<Sector[]>([]);
  const [showAppConfirmation, setShowAppConfirmation] = useState(false);
  const [hasShownAppConfirmationOnce, setHasShownAppConfirmationOnce] = useState(false);

  const { saved, isSaved, save, unsave } = useSavedOpportunities(user?.id ?? null);
  const { pending, confirmApplication } = usePendingApplications(user?.id ?? null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, navigate, user]);

  // Load saved opportunities
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("saved_opportunities")
          .select("opportunity_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          setOpportunities([]);
          setLoading(false);
          return;
        }

        // Fetch the full opportunity details
        const opportunityIds = data.map((s) => s.opportunity_id);
        const { data: opps, error: oppsError } = await supabase
          .from("opportunities")
          .select("*")
          .in("id", opportunityIds)
          .eq("status", "published");

        if (oppsError) throw oppsError;

        // Map with saved_at timestamps
        const savedMap = new Map(data.map((s) => [s.opportunity_id, s.created_at]));
        const oppsWithSavedAt = (opps || []).map((opp) => ({
          ...opp,
          saved_at: savedMap.get(opp.id),
        }));

        setOpportunities(oppsWithSavedAt);
      } catch (error) {
        console.error("Error loading saved opportunities:", error);
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // Show application confirmation modal when there are pending applications
  useEffect(() => {
    if (user && pending.length > 0 && !hasShownAppConfirmationOnce) {
      setShowAppConfirmation(true);
      setHasShownAppConfirmationOnce(true);
    }
  }, [user, pending, hasShownAppConfirmationOnce]);

  if (isLoading) return null;

  const bulletinItems = opportunities.map(mapToBulletinItem);

  // Filter items
  const filteredItems = bulletinItems.filter((item) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSectors =
      selectedSectors.length === 0 ||
      (item.sectors && item.sectors.some((s) => selectedSectors.includes(s)));
    return matchesCategory && matchesSectors;
  });

  const handleGetAccess = (id: string) => {
    const dbItem = opportunities.find((o) => o.id === id);
    const targetLink = dbItem?.external_link;
    const itemCategory = dbItem?.category;
    const itemTitle = dbItem?.title;

    if (!dbItem) {
      return;
    }

    if (!targetLink) {
      return;
    }

    // Open the link
    window.open(targetLink, "_blank", "noopener,noreferrer");

    // Track event
    void trackEvent({
      userId: user?.id || "",
      opportunityId: id,
      eventType: "click_get_access",
      linkUrl: targetLink,
      metadata: {
        title: itemTitle,
        category: itemCategory,
        source: "saved",
      },
      pagePath: "/saved",
      eventSource: "saved_card",
    });

    // Insert pending application
    void (async () => {
      try {
        await supabase.from("pending_applications").insert({
          user_id: user?.id,
          opportunity_id: id,
          status: "clicked",
          clicked_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Could not insert pending application:", err);
      }
    })();
  };


  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="mb-8 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl flex items-center gap-2">
            <Bookmark className="h-8 w-8" />
            Saved Opportunities
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredItems.length} saved</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 rounded-lg border bg-card/50 backdrop-blur-sm p-4 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Category</h3>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "all", label: "All" },
              ...BULLETIN_SECTIONS,
            ] as Array<{ value: CategoryFilter | "all"; label: string }>).map((filter) => {
              const count = filteredItems.filter((item) => filter.value === "all" || item.category === filter.value).length;
              return (
                <Button
                  key={filter.value}
                  variant={categoryFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setCategoryFilter(filter.value as CategoryFilter)}
                >
                  {filter.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sector</h3>
          <SectorFilter
            selectedSectors={selectedSectors}
            onSectorsChange={(sectors) => {
              setSelectedSectors(sectors);
              if (user) {
                void trackEvent({
                  userId: user.id,
                  eventType: "sector_filter_applied",
                  metadata: {
                    sectors: sectors,
                    source: "saved",
                  },
                  pagePath: "/saved",
                  eventSource: "sector_filter",
                });
              }
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No saved opportunities yet</h3>
          <p className="text-muted-foreground mb-4">
            {selectedSectors.length > 0 || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Save opportunities from the main feed to view them here"}
          </p>
          <Link to="/">
            <Button size="sm">Browse Opportunities</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredItems.map((item, idx) => (
            <div key={item.id} className="grid gap-3 sm:grid-cols-[42px_1fr] sm:items-start">
              <div className="hidden h-10 w-10 items-center justify-center rounded-full border bg-muted/50 text-sm font-semibold text-foreground sm:flex">
                {idx + 1}
              </div>
              <OpportunityCard
                opportunity={item}
                onGetAccess={handleGetAccess}
                userId={user?.id}
                isSaved={isSaved(item.id)}
                onSave={save}
                onUnsave={unsave}
              />
            </div>
          ))}
        </div>
      )}



      {user && (
        <ApplicationConfirmation
          open={showAppConfirmation}
          onOpenChange={setShowAppConfirmation}
          pendingApplications={pending}
          onConfirm={confirmApplication}
        />
      )}
    </main>
  );
}

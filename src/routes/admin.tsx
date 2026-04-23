import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ChangeEvent, type MouseEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { trackEvent } from "@/lib/tracking";
import { getPostHogDashboardUrl } from "@/integrations/posthog";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Users, Eye, MousePointerClick, TrendingUp, Archive, Timer, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { BOWER_SEED_ITEMS } from "@/lib/bower-seed";
import { isPosterOptionalForCategory, type BannerCrop } from "@/lib/bulletin";

const DEFAULT_BANNER_CROP: BannerCrop = {
  x: 50,
  y: 50,
  zoom: 1,
  ratio: 4,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePosterBannerCrop(raw: Tables<"opportunities">["poster_banner_crop"]): BannerCrop {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_BANNER_CROP;
  }

  const crop = raw as Record<string, unknown>;
  const x = typeof crop.x === "number" ? crop.x : DEFAULT_BANNER_CROP.x;
  const y = typeof crop.y === "number" ? crop.y : DEFAULT_BANNER_CROP.y;
  const zoom = typeof crop.zoom === "number" ? crop.zoom : DEFAULT_BANNER_CROP.zoom;

  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    zoom: clamp(zoom, 1, 3),
    ratio: 4,
  };
}

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");

  usePageTracking(user?.id || null, "/admin");

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate({ to: "/login" });
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Engagement analytics & opportunity management</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="opportunities">Content</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics"><AnalyticsHubTab /></TabsContent>
        <TabsContent value="overview"><OverviewTab isActive={activeTab === "overview"} /></TabsContent>
        <TabsContent value="opportunities"><OpportunitiesTab isActive={activeTab === "opportunities"} /></TabsContent>
        <TabsContent value="users"><UsersTab isActive={activeTab === "users"} /></TabsContent>
        <TabsContent value="feedback"><FeedbackTab isActive={activeTab === "feedback"} /></TabsContent>
        <TabsContent value="events"><EventsTab isActive={activeTab === "events"} /></TabsContent>
      </Tabs>
    </main>
  );
}

function AnalyticsHubTab() {
  const workspaceUrl = getPostHogDashboardUrl() || "https://app.posthog.com";

  const links = [
    { title: "Open PostHog Workspace", description: "Dashboards for non-technical stakeholders.", href: workspaceUrl },
    { title: "Funnels", description: "Analyze conversion flow from login to apply.", href: `${workspaceUrl.replace(/\/$/, "")}/insights` },
    { title: "Cohorts and Retention", description: "Monitor repeat usage and audience quality.", href: `${workspaceUrl.replace(/\/$/, "")}/cohorts` },
    { title: "Session Replay", description: "Watch real user sessions and diagnose drop-offs.", href: `${workspaceUrl.replace(/\/$/, "")}/replay` },
    { title: "Feature Flags and Experiments", description: "Manage progressive rollouts and A/B tests.", href: `${workspaceUrl.replace(/\/$/, "")}/feature_flags` },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>PostHog Analytics Hub</CardTitle>
          <CardDescription>
            Product analytics now runs on PostHog. Use these links for funnels, cohorts, retention, replay, heatmaps, and experiments.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Card key={link.title}>
            <CardHeader>
              <CardTitle className="text-base">{link.title}</CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full justify-between">
                <a href={link.href} target="_blank" rel="noreferrer">
                  Open
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ isActive }: { isActive: boolean }) {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalViewers: 0,
    activeUsers7d: 0,
    totalViews: 0,
    totalClicks: 0,
    applyClicks: 0,
    totalActions: 0,
    avgPageTimeMs: 0,
  });

  useEffect(() => {
    if (!isActive) return;

    const load = async () => {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [profiles, visits7d, views, clicks, applies, totalActions, pageTimeEvents, uniqueVisitors] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("visits").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("engagement_events").select("id", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", since30),
        supabase.from("engagement_events").select("id", { count: "exact", head: true }).eq("event_type", "click_get_access").gte("created_at", since30),
        supabase.from("engagement_events").select("id", { count: "exact", head: true }).eq("event_type", "click_apply").gte("created_at", since30),
        supabase.from("engagement_events").select("id", { count: "exact", head: true }),
        supabase.from("engagement_events").select("duration_ms").eq("event_type", "page_view").not("duration_ms", "is", null).gte("created_at", since30).limit(500),
        supabase.rpc("count_unique_visitors"),
      ]);

      const totalDuration = (pageTimeEvents.data || []).reduce((sum, row) => sum + (row.duration_ms || 0), 0);
      const avgPageTimeMs = pageTimeEvents.data?.length ? Math.round(totalDuration / pageTimeEvents.data.length) : 0;
      const distinctViewers = Number(uniqueVisitors.data || 0);

      setMetrics({
        totalUsers: profiles.count || 0,
        totalViewers: distinctViewers,
        activeUsers7d: visits7d.count || 0,
        totalViews: views.count || 0,
        totalClicks: clicks.count || 0,
        applyClicks: applies.count || 0,
        totalActions: totalActions.count || 0,
        avgPageTimeMs,
      });
    };
    load();
  }, [isActive]);

  const cards = [
    { label: "Total Users", value: metrics.totalUsers, icon: Users },
    { label: "Unique Viewers", value: metrics.totalViewers, icon: Eye },
    { label: "Active (7d)", value: metrics.activeUsers7d, icon: TrendingUp },
    { label: "Page Views", value: metrics.totalViews, icon: Eye },
    { label: "Get Access Clicks", value: metrics.totalClicks, icon: MousePointerClick },
    { label: "Apply Clicks", value: metrics.applyClicks, icon: MousePointerClick },
    { label: "Total Actions", value: metrics.totalActions, icon: MousePointerClick },
    { label: "Avg Time on Page", value: `${Math.round(metrics.avgPageTimeMs / 1000)}s`, icon: Timer },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base">Legacy Snapshot</CardTitle>
          <CardDescription>
            These cards are transitional and sourced from legacy tables. For live product analytics, use the Analytics tab.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OpportunitiesTab({ isActive }: { isActive: boolean }) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Tables<"opportunities">[]>([]);
  const [statsByOpportunity, setStatsByOpportunity] = useState<Record<string, { views: number; clicks: number }>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tables<"opportunities"> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "funding" | "events" | "hiring" | "news" | "something_new">("all");
  const [isImportingSeed, setIsImportingSeed] = useState(false);

  const toBulletPointText = (value: string) => {
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*\u2022]\s*/, ""));

    if (lines.length === 0) return null;
    return lines.map((line) => `• ${line}`).join("\n");
  };

  const load = async () => {
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const [opportunitiesRes, eventsRes] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .order("item_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("engagement_events")
        .select("event_type, opportunity_id")
        .in("event_type", ["item_viewed", "click_get_access"])
        .gte("created_at", since30),
    ]);

    if (opportunitiesRes.error) {
      toast.error(`Could not load content: ${opportunitiesRes.error.message}`);
      setOpportunities([]);
      return;
    }

    if (eventsRes.error) {
      toast.error(`Could not load content metrics: ${eventsRes.error.message}`);
    }

    setOpportunities(opportunitiesRes.data || []);

    const stats: Record<string, { views: number; clicks: number }> = {};
    (eventsRes.data || []).forEach((event) => {
      if (!event.opportunity_id) return;
      if (!stats[event.opportunity_id]) {
        stats[event.opportunity_id] = { views: 0, clicks: 0 };
      }

      if (event.event_type === "item_viewed") {
        stats[event.opportunity_id].views += 1;
      }

      if (event.event_type === "click_get_access") {
        stats[event.opportunity_id].clicks += 1;
      }
    });

    setStatsByOpportunity(stats);
  };

  const handleImportSeedContent = async () => {
    if (!user) return;

    setIsImportingSeed(true);

    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("opportunities")
        .select("title");

      if (existingError) {
        throw existingError;
      }

      const existingTitles = new Set((existingRows || []).map((row) => row.title.trim().toLowerCase()));

      const rowsToInsert = BOWER_SEED_ITEMS
        .filter((item) => !existingTitles.has(item.title.trim().toLowerCase()))
        .map((item) => ({
          title: item.title,
          description: item.description,
          category: item.category,
          status: "published" as const,
          details_bullets: null,
          start_date: null,
          end_date: null,
          deadline: null,
          external_link: item.link || null,
          poster_url: item.imageUrl || null,
          item_order: item.itemOrder || 999,
          created_by: user.id,
        }));

      if (rowsToInsert.length === 0) {
        toast.info("Seed content is already imported.");
        return;
      }

      const { error: insertError } = await supabase
        .from("opportunities")
        .insert(rowsToInsert);

      if (insertError) {
        throw insertError;
      }

      await trackEvent({
        userId: user.id,
        eventType: "click_admin_action",
        pagePath: "/admin",
        eventSource: "admin_content",
        metadata: {
          action: "import_seed_content",
          inserted_count: rowsToInsert.length,
        },
      });

      toast.success(`Imported ${rowsToInsert.length} items into content.`);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not import seed content: ${message}`);
    } finally {
      setIsImportingSeed(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    load();
  }, [isActive]);

  const handleSave = async (formData: {
    title: string;
    description: string;
    details_text: string;
    category: "funding" | "events" | "hiring" | "news" | "something_new";
    start_date: string;
    end_date: string;
    external_link: string;
    poster_url: string;
    poster_banner_crop: BannerCrop | null;
    status: "draft" | "published" | "archived";
  }) => {
    if (!user) return;

    const trimmedPosterUrl = formData.poster_url.trim();

    const normalizedData = {
      ...formData,
      details_bullets: toBulletPointText(formData.details_text),
      start_date: formData.start_date.trim() || null,
      end_date: formData.end_date.trim() || null,
      external_link: formData.external_link.trim() || null,
      poster_url: trimmedPosterUrl || null,
      poster_banner_crop: trimmedPosterUrl ? formData.poster_banner_crop : null,
    };

    const { details_text: _detailsText, ...dbPayload } = normalizedData;

    try {
      const result = editing
        ? await supabase.from("opportunities").update(dbPayload).eq("id", editing.id)
        : await supabase.from("opportunities").insert({ ...dbPayload, created_by: user.id });

      if (result.error) {
        const categoryError = /opportunity_category|invalid input value for enum/i.test(result.error.message);
        if (categoryError) {
          toast.error("Your database schema is outdated for categories. Apply latest migrations, then retry.");
        } else {
          toast.error(`Could not save opportunity: ${result.error.message}`);
        }
        return;
      }

      try {
        await trackEvent({
          userId: user.id,
          eventType: "click_admin_action",
          pagePath: "/admin",
          eventSource: "admin_content",
          metadata: editing
            ? {
                action: "update",
                content_id: editing.id,
                category: formData.category,
                title: formData.title,
              }
            : {
                action: "create",
                category: formData.category,
                title: formData.title,
              },
        });
      } catch {
        // Do not block content save if analytics capture fails.
      }

      toast.success(editing ? "Opportunity updated" : "Opportunity created");
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not save opportunity: ${message}`);
    }
  };

  const handleArchive = async (id: string) => {
    if (!user) return;
    await supabase.from("opportunities").update({ status: "archived" as const }).eq("id", id);
    await trackEvent({
      userId: user.id,
      eventType: "click_admin_action",
      pagePath: "/admin",
      eventSource: "admin_content",
      metadata: {
        action: "archive",
        content_id: id,
      },
    });
    toast.success("Archived");
    load();
  };

  const statusColor: Record<string, string> = {
    published: "bg-success text-success-foreground",
    draft: "bg-muted text-muted-foreground",
    archived: "bg-destructive/20 text-destructive",
  };

  const filteredOpportunities = categoryFilter === "all"
    ? opportunities
    : opportunities.filter((opp) => opp.category === categoryFilter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="funding">Funding</SelectItem>
            <SelectItem value="events">Events</SelectItem>
            <SelectItem value="hiring">Hiring</SelectItem>
            <SelectItem value="news">News</SelectItem>
            <SelectItem value="something_new">Something New</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Opportunity
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>CTR</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOpportunities.map((opp) => (
              (() => {
                const stats = statsByOpportunity[opp.id] || { views: 0, clicks: 0 };
                const ctr = stats.views > 0 ? `${Math.round((stats.clicks / stats.views) * 100)}%` : "0%";

                return (
              <TableRow key={opp.id}>
                <TableCell className="font-medium">{opp.title}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{opp.category}</Badge></TableCell>
                <TableCell><Badge className={`${statusColor[opp.status]} capitalize`}>{opp.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{stats.views}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{stats.clicks}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{ctr}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {opp.start_date ? format(new Date(opp.start_date), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {opp.end_date
                    ? format(new Date(opp.end_date), "MMM d, yyyy")
                    : opp.deadline
                      ? format(new Date(opp.deadline), "MMM d, yyyy")
                      : "—"}
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(opp); setShowForm(true); }}>Edit</Button>
                  {opp.status !== "archived" && (
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(opp.id)}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
                );
              })()
            ))}
            {filteredOpportunities.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {opportunities.length === 0
                    ? "No content found in the database yet."
                    : "No content matches this category filter."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {opportunities.length === 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Your content table is empty</p>
            <p className="text-xs text-muted-foreground">Import the current Bower bulletin into DB so all items are editable from admin.</p>
          </div>
          <Button onClick={handleImportSeedContent} disabled={isImportingSeed}>
            {isImportingSeed ? "Importing..." : "Import Current Bulletin"}
          </Button>
        </div>
      )}

      <OpportunityFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}

function OpportunityFormDialog({
  open,
  onOpenChange,
  onSave,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: { title: string; description: string; details_text: string; category: "funding" | "events" | "hiring" | "news" | "something_new"; start_date: string; end_date: string; external_link: string; poster_url: string; poster_banner_crop: BannerCrop | null; status: "draft" | "published" | "archived" }) => void;
  initial: Tables<"opportunities"> | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detailsText, setDetailsText] = useState("");
  const [category, setCategory] = useState<"funding" | "events" | "hiring" | "news" | "something_new">("funding");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterFileName, setPosterFileName] = useState("");
  const [bannerCrop, setBannerCrop] = useState<BannerCrop>(DEFAULT_BANNER_CROP);
  const [isPosterUploading, setIsPosterUploading] = useState(false);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const isPosterOptionalCategory = isPosterOptionalForCategory(category);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description);
      setDetailsText(
        (initial.details_bullets || "")
          .split(/\r?\n/)
          .map((line) => line.replace(/^[-*\u2022]\s*/, "").trim())
          .filter(Boolean)
          .join("\n")
      );
      setCategory(initial.category);
      setStartDate(initial.start_date || "");
      setEndDate(initial.end_date || initial.deadline || "");
      setExternalLink(initial.external_link || "");
      setPosterUrl(initial.poster_url || "");
      setPosterFileName(initial.poster_url ? "Image already uploaded" : "");
      setBannerCrop(parsePosterBannerCrop(initial.poster_banner_crop));
      setStatus(initial.status);
    } else {
      setTitle("");
      setDescription("");
      setDetailsText("");
      setCategory("funding");
      setStartDate("");
      setEndDate("");
      setExternalLink("");
      setPosterUrl("");
      setPosterFileName("");
      setBannerCrop(DEFAULT_BANNER_CROP);
      setStatus("draft");
    }
  }, [initial, open]);

  const handlePosterUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      event.target.value = "";
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Image size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    setIsPosterUploading(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `opportunities/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("opportunity-posters")
        .upload(filePath, file, { upsert: false, cacheControl: "3600" });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("opportunity-posters")
        .getPublicUrl(filePath);

      setPosterUrl(data.publicUrl);
      setPosterFileName(file.name);
      setBannerCrop(DEFAULT_BANNER_CROP);
      toast.success("Poster uploaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not upload image: ${message}`);
    } finally {
      setIsPosterUploading(false);
      event.target.value = "";
    }
  };

  const handleBannerFocusClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setBannerCrop((prev) => ({
      ...prev,
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="pr-8 font-display">{initial ? "Edit" : "New"} Opportunity</DialogTitle>
        </DialogHeader>
        <div
          role="region"
          aria-label="Opportunity form fields"
          className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opportunity title" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="sm:min-h-[110px]"
              placeholder="Describe the opportunity..."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="funding">Funding</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="hiring">Hiring</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="something_new">Something New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End Date (Optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>Opportunity Details (Optional)</Label>
            <Textarea
              value={detailsText}
              onChange={(e) => setDetailsText(e.target.value)}
              rows={3}
              className="sm:min-h-[110px]"
              placeholder={"Add one point per line, for example:\nLocation: Hyderabad\nCash prize: Rs. 50,000\nCohort size: 20 startups"}
            />
            <p className="mt-1 text-xs text-muted-foreground">Saved as bullet points automatically.</p>
          </div>
          <div>
            <Label>External Link</Label>
            <Input value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Poster Image</Label>
            <Input type="file" accept="image/*" onChange={handlePosterUpload} disabled={isPosterUploading} />
            {isPosterOptionalCategory && (
              <p className="mt-1 text-xs text-muted-foreground">
                Optional for this category. You can publish this opportunity without a poster.
              </p>
            )}
            {isPosterUploading && <p className="mt-1 text-xs text-muted-foreground">Uploading image...</p>}
            {!isPosterUploading && posterFileName && (
              <p className="mt-1 text-xs text-muted-foreground">{posterFileName}</p>
            )}
            {!isPosterUploading && posterUrl && (
              <div className="mt-3 space-y-3 rounded-md border bg-muted/20 p-2 sm:p-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Masked Preview Banner Crop (4:1)</p>
                  <p className="text-xs text-muted-foreground">Click preview to set focus, then fine tune with sliders.</p>
                </div>

                <div
                  className="relative cursor-crosshair overflow-hidden rounded-md border"
                  onClick={handleBannerFocusClick}
                  title="Click to set banner focus"
                >
                  <AspectRatio ratio={4 / 1}>
                    <img
                      src={posterUrl}
                      alt="Banner crop preview"
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${bannerCrop.x}% ${bannerCrop.y}%`,
                        transform: `scale(${bannerCrop.zoom})`,
                        transformOrigin: `${bannerCrop.x}% ${bannerCrop.y}%`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/10" />
                  </AspectRatio>
                </div>

                <div>
                  <Label className="text-xs">Zoom</Label>
                  <Input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={bannerCrop.zoom}
                    onChange={(e) => setBannerCrop((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Horizontal Focus</Label>
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={bannerCrop.x}
                      onChange={(e) => setBannerCrop((prev) => ({ ...prev, x: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Vertical Focus</Label>
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={bannerCrop.y}
                      onChange={(e) => setBannerCrop((prev) => ({ ...prev, y: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            )}
            {!isPosterUploading && posterUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-auto px-0 text-xs"
                onClick={() => {
                  setPosterUrl("");
                  setPosterFileName("");
                  setBannerCrop(DEFAULT_BANNER_CROP);
                }}
              >
                Remove image
              </Button>
            )}
          </div>
          <Button
            className="w-full"
            disabled={!title.trim() || !description.trim() || isPosterUploading}
            onClick={() => onSave({
              title,
              description,
              details_text: detailsText,
              category,
              start_date: startDate,
              end_date: endDate,
              external_link: externalLink,
              poster_url: posterUrl,
              poster_banner_crop: posterUrl ? bannerCrop : null,
              status,
            })}
          >
            {initial ? "Update" : "Create"} Opportunity
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab({ isActive }: { isActive: boolean }) {
  const [users, setUsers] = useState<{ user_id: string; full_name: string | null; email: string | null; created_at: string; visit_count: number; action_count: number }[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const load = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      if (!profiles) return;

      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: visits } = await supabase.from("visits").select("user_id");
      const { data: events } = await supabase.from("engagement_events").select("user_id").gte("created_at", since30);
      const visitCounts: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      visits?.forEach((v) => { if (v.user_id) visitCounts[v.user_id] = (visitCounts[v.user_id] || 0) + 1; });
      events?.forEach((e) => { if (e.user_id) actionCounts[e.user_id] = (actionCounts[e.user_id] || 0) + 1; });

      setUsers(
        profiles.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          created_at: p.created_at,
          visit_count: visitCounts[p.user_id] || 0,
          action_count: actionCounts[p.user_id] || 0,
        })).sort((a, b) => b.visit_count - a.visit_count)
      );
    };
    load();
  }, [isActive]);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.user_id}>
              <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
              <TableCell><Badge variant="secondary">{u.visit_count}</Badge></TableCell>
              <TableCell><Badge variant="secondary">{u.action_count}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function EventsTab({ isActive }: { isActive: boolean }) {
  const [events, setEvents] = useState<Array<{
    id: string;
    event_type: string;
    created_at: string;
    page_path: string | null;
    duration_ms: number | null;
    event_source: string | null;
    metadata: Record<string, string | number | boolean | null> | null;
    user_id: string;
    user_display: string;
    opportunity_id: string | null;
    opportunity_title: string;
  }>>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("");
  const [daysFilter, setDaysFilter] = useState<string>("30");

  useEffect(() => {
    if (!isActive) return;

    const load = async () => {
      const fromDate = new Date(Date.now() - Number(daysFilter) * 86400000).toISOString();

      let query = supabase
        .from("engagement_events")
        .select("id, event_type, created_at, page_path, duration_ms, event_source, metadata, user_id, opportunity_id")
        .gte("created_at", fromDate)
        .order("created_at", { ascending: false })
        .limit(300);

      if (eventTypeFilter !== "all") {
        query = query.eq("event_type", eventTypeFilter as "page_view");
      }

      const { data } = await query;
      const rawEvents = data || [];

      const opportunityIds = [...new Set(rawEvents.map((event) => event.opportunity_id).filter(Boolean))] as string[];
      const userIds = [...new Set(rawEvents.map((event) => event.user_id).filter(Boolean))] as string[];

      const [opportunitiesRes, profilesRes] = await Promise.all([
        opportunityIds.length > 0
          ? supabase.from("opportunities").select("id, title").in("id", opportunityIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
          : Promise.resolve({ data: [] }),
      ]);

      const opportunityMap = new Map((opportunitiesRes.data || []).map((opp) => [opp.id, opp.title]));
      const profileMap = new Map((profilesRes.data || []).map((profile) => [profile.user_id, {
        full_name: profile.full_name,
        email: profile.email,
      }]));

      const enrichedEvents = rawEvents.map((event) => {
        const profile = profileMap.get(event.user_id);
        const metadata = (event.metadata || null) as Record<string, string | number | boolean | null> | null;

        const opportunityTitleFromMetadata =
          typeof metadata?.title === "string"
            ? metadata.title
            : typeof metadata?.content_id === "string"
              ? metadata.content_id
              : null;

        return {
          ...event,
          metadata,
          user_display: profile?.full_name || profile?.email || event.user_id,
          opportunity_title: opportunityMap.get(event.opportunity_id || "") || opportunityTitleFromMetadata || event.opportunity_id || "—",
        };
      });

      const normalizedFilter = userFilter.trim().toLowerCase();
      const filteredData = enrichedEvents.filter((event) => {
        if (!normalizedFilter) return true;
        return (
          event.user_display.toLowerCase().includes(normalizedFilter) ||
          event.user_id.toLowerCase().includes(normalizedFilter)
        );
      });

      setEvents(filteredData);
    };

    load();
  }, [daysFilter, eventTypeFilter, userFilter, isActive]);

  return (
    <Card className="space-y-4 p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Filter by event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="page_view">Page View</SelectItem>
            <SelectItem value="item_viewed">Item Viewed</SelectItem>
            <SelectItem value="click_get_access">Get Access Click</SelectItem>
            <SelectItem value="click_apply">Apply Click</SelectItem>
            <SelectItem value="feedback_useful">Feedback Useful</SelectItem>
            <SelectItem value="feedback_not_useful">Feedback Not Useful</SelectItem>
            <SelectItem value="click_admin_action">Admin Actions</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by user name or email"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />

        <Select value={daysFilter} onValueChange={setDaysFilter}>
          <SelectTrigger><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.event_type}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{event.page_path || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{event.opportunity_title}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {event.duration_ms ? `${Math.round(event.duration_ms / 1000)}s` : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{event.event_source || "ui"}</TableCell>
              <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{event.user_display}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(event.created_at), "MMM d, HH:mm")}</TableCell>
            </TableRow>
          ))}
          {events.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No tracked events yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function FeedbackTab({ isActive }: { isActive: boolean }) {
  const [feedback, setFeedback] = useState<{ event_type: string; metadata: Record<string, string> | null; created_at: string; opportunity_title: string; user_email: string }[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const load = async () => {
      const { data: events } = await supabase
        .from("engagement_events")
        .select("event_type, metadata, created_at, opportunity_id, user_id")
        .in("event_type", ["feedback_useful", "feedback_not_useful"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (!events) return;

      const oppIds = [...new Set(events.map((e) => e.opportunity_id).filter(Boolean))] as string[];
      const userIds = [...new Set(events.map((e) => e.user_id))];

      const [{ data: opps }, { data: profiles }] = await Promise.all([
        supabase.from("opportunities").select("id, title").in("id", oppIds.length ? oppIds : ["_"]),
        supabase.from("profiles").select("user_id, email").in("user_id", userIds),
      ]);

      const oppMap = new Map(opps?.map((o) => [o.id, o.title]) || []);
      const userMap = new Map(profiles?.map((p) => [p.user_id, p.email || "—"]) || []);

      setFeedback(
        events.map((e) => ({
          event_type: e.event_type,
          metadata: e.metadata as Record<string, string> | null,
          created_at: e.created_at,
          opportunity_title: oppMap.get(e.opportunity_id || "") || "—",
          user_email: userMap.get(e.user_id) || "—",
        }))
      );
    };
    load();
  }, [isActive]);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Response</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Opportunity</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedback.map((f, i) => (
            <TableRow key={i}>
              <TableCell>
                <Badge className={f.event_type === "feedback_useful" ? "bg-success text-success-foreground" : "bg-destructive/20 text-destructive"}>
                  {f.event_type === "feedback_useful" ? "Useful" : "Not Useful"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{f.metadata?.reason || "—"}</TableCell>
              <TableCell className="text-sm font-medium">{f.opportunity_title}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{f.user_email}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(f.created_at), "MMM d")}</TableCell>
            </TableRow>
          ))}
          {feedback.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No feedback yet</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

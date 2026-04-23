ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'page_view';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'click_login';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'click_logout';

ALTER TABLE public.engagement_events
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS page_path TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS event_source TEXT;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS item_order INTEGER NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_engagement_events_page_path ON public.engagement_events(page_path);
CREATE INDEX IF NOT EXISTS idx_engagement_events_session_id ON public.engagement_events(session_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_item_order ON public.opportunities(item_order);

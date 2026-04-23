ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'item_viewed';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'click_admin_action';

CREATE INDEX IF NOT EXISTS idx_engagement_events_created_at ON public.engagement_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.count_unique_visitors()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
	SELECT COUNT(DISTINCT user_id)
	FROM public.visits
	WHERE user_id IS NOT NULL;
$$;

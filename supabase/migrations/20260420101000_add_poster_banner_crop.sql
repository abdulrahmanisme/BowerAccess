ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS poster_banner_crop JSONB;

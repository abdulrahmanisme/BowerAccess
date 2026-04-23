ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS details_bullets TEXT;

-- Add is_premium column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Auto-grant premium for @bowerschool.com emails on profile insert
CREATE OR REPLACE FUNCTION public.auto_grant_premium_for_bower_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) LIKE '%@bowerschool.com' THEN
    NEW.is_premium := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Use BEFORE INSERT so we can modify the row before it hits the table
DROP TRIGGER IF EXISTS trg_auto_grant_premium ON public.profiles;
CREATE TRIGGER trg_auto_grant_premium
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_premium_for_bower_email();

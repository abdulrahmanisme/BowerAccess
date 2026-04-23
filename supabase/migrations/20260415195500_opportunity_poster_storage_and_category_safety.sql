ALTER TYPE public.opportunity_category ADD VALUE IF NOT EXISTS 'news';
ALTER TYPE public.opportunity_category ADD VALUE IF NOT EXISTS 'something_new';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'opportunity-posters',
  'opportunity-posters',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view opportunity posters'
  ) THEN
    CREATE POLICY "Public can view opportunity posters"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'opportunity-posters');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload opportunity posters'
  ) THEN
    CREATE POLICY "Admins can upload opportunity posters"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'opportunity-posters'
        AND public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update opportunity posters'
  ) THEN
    CREATE POLICY "Admins can update opportunity posters"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'opportunity-posters'
        AND public.has_role(auth.uid(), 'admin')
      )
      WITH CHECK (
        bucket_id = 'opportunity-posters'
        AND public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete opportunity posters'
  ) THEN
    CREATE POLICY "Admins can delete opportunity posters"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'opportunity-posters'
        AND public.has_role(auth.uid(), 'admin')
      );
  END IF;
END $$;

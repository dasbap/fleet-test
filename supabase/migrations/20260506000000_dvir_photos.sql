-- ============================================================================
-- Migration: 20260506000000_dvir_photos.sql
-- Ajout photo_urls sur controles_journaliers + bucket Storage dvir-photos
-- ============================================================================

ALTER TABLE public.controles_journaliers
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.controles_journaliers.photo_urls IS
  'URLs Supabase Storage des photos de défauts (max 5). Format : dvir-photos/{fleet_id}/{dvir_id}/{filename}';

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE
      'Storage schema absent - dvir-photos bucket and policies skipped.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
  VALUES (
    'dvir-photos',
    'dvir-photos',
    false,
    5242880,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]::text[]
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "dvir_photos_fleet_select"
  ON storage.objects;

  DROP POLICY IF EXISTS "dvir_photos_fleet_insert"
  ON storage.objects;

  DROP POLICY IF EXISTS "dvir_photos_owner_delete"
  ON storage.objects;

  CREATE POLICY "dvir_photos_fleet_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dvir-photos'
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions AS fa
      WHERE fa.fleet_id::text = split_part(name, '/', 1)
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

  CREATE POLICY "dvir_photos_fleet_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dvir-photos'
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions AS fa
      WHERE fa.fleet_id::text = split_part(name, '/', 1)
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

  CREATE POLICY "dvir_photos_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dvir-photos'
    AND auth.uid()::text = split_part(name, '/', 3)
  );
END;
$$;
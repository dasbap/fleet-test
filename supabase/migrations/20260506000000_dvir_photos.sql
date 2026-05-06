-- ============================================================================
-- Migration: 20260506000000_dvir_photos.sql
-- Ajout photo_urls sur controles_journaliers + bucket Storage dvir-photos
-- ============================================================================

-- 1) Colonne photo_urls : tableau d'URLs Supabase Storage (max 5 photos par DVIR)
ALTER TABLE public.controles_journaliers
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.controles_journaliers.photo_urls IS
  'URLs Supabase Storage des photos de défauts (max 5). Format : dvir-photos/{fleet_id}/{dvir_id}/{filename}';

-- 2) Bucket Storage (idempotent via ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dvir-photos',
  'dvir-photos',
  false,
  5242880,  -- 5 Mo max par photo
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3) Politique lecture : membres actifs de la flotte (chemin = {fleet_id}/...)
DROP POLICY IF EXISTS "dvir_photos_fleet_select" ON storage.objects;
CREATE POLICY "dvir_photos_fleet_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dvir-photos'
    AND EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id::text = split_part(name, '/', 1)
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

-- 4) Politique upload : membres actifs uniquement
DROP POLICY IF EXISTS "dvir_photos_fleet_insert" ON storage.objects;
CREATE POLICY "dvir_photos_fleet_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dvir-photos'
    AND EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id::text = split_part(name, '/', 1)
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

-- 5) Politique suppression : auteur uniquement (même user_id dans le chemin)
DROP POLICY IF EXISTS "dvir_photos_owner_delete" ON storage.objects;
CREATE POLICY "dvir_photos_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'dvir-photos'
    AND auth.uid()::text = split_part(name, '/', 3)
  );

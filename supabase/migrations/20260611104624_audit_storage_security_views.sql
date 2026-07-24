-- Audit prod E-SAMBA (2026-06-11)
-- 1. Vues SECURITY DEFINER → security_invoker
-- 2. Policies storage maintenance-evidence
-- 3. Bucket fleet-assets

ALTER VIEW IF EXISTS public.alerts
SET (security_invoker = true);

ALTER VIEW IF EXISTS public.vehicles
SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_billing_lifecycle_status
SET (security_invoker = true);

ALTER VIEW IF EXISTS public.dashboard_alerts
SET (security_invoker = true);

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE
      'Storage schema absent - maintenance-evidence and fleet-assets setup skipped.';
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
    'maintenance-evidence',
    'maintenance-evidence',
    true,
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

  DROP POLICY IF EXISTS "maintenance_evidence_select_public"
  ON storage.objects;

  DROP POLICY IF EXISTS "maintenance_evidence_insert_authenticated"
  ON storage.objects;

  DROP POLICY IF EXISTS "maintenance_evidence_delete_authenticated"
  ON storage.objects;

  CREATE POLICY "maintenance_evidence_select_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'maintenance-evidence'
  );

  CREATE POLICY "maintenance_evidence_insert_authenticated"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-evidence'
  );

  CREATE POLICY "maintenance_evidence_delete_authenticated"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'maintenance-evidence'
  );

  INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
  VALUES (
    'fleet-assets',
    'fleet-assets',
    false,
    10485760,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]::text[]
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "fleet_assets_fleet_select"
  ON storage.objects;

  DROP POLICY IF EXISTS "fleet_assets_fleet_insert"
  ON storage.objects;

  DROP POLICY IF EXISTS "fleet_assets_fleet_delete"
  ON storage.objects;

  CREATE POLICY "fleet_assets_fleet_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fleet-assets'
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions AS fa
      WHERE fa.fleet_id::text = split_part(name, '/', 1)
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

  CREATE POLICY "fleet_assets_fleet_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fleet-assets'
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions AS fa
      WHERE fa.fleet_id::text = split_part(name, '/', 1)
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

  CREATE POLICY "fleet_assets_fleet_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fleet-assets'
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions AS fa
      WHERE fa.fleet_id::text = split_part(name, '/', 1)
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );
END;
$$;
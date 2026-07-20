-- Restore maintenance evidence storage for runtime environments.
-- Bucket is private; access is scoped through the maintenance job fleet.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Storage schema absent - maintenance evidence bucket setup skipped.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'maintenance-evidence',
    'maintenance-evidence',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "maintenance_evidence_select_public" ON storage.objects;
  DROP POLICY IF EXISTS "maintenance_evidence_insert_authenticated" ON storage.objects;
  DROP POLICY IF EXISTS "maintenance_evidence_delete_authenticated" ON storage.objects;
  DROP POLICY IF EXISTS "maintenance_evidence_select_fleet" ON storage.objects;
  DROP POLICY IF EXISTS "maintenance_evidence_insert_fleet" ON storage.objects;
  DROP POLICY IF EXISTS "maintenance_evidence_delete_fleet" ON storage.objects;

  CREATE POLICY "maintenance_evidence_select_fleet"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'maintenance-evidence'
    AND EXISTS (
      SELECT 1
      FROM public.travaux_maintenance tm
      JOIN public.flotte_adhesions fa
        ON fa.fleet_id = tm.fleet_id
       AND fa.user_id = auth.uid()
       AND fa.is_active = true
      WHERE name LIKE 'maintenance/' || tm.id::text || '/%'
    )
  );

  CREATE POLICY "maintenance_evidence_insert_fleet"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-evidence'
    AND EXISTS (
      SELECT 1
      FROM public.travaux_maintenance tm
      JOIN public.flotte_adhesions fa
        ON fa.fleet_id = tm.fleet_id
       AND fa.user_id = auth.uid()
       AND fa.is_active = true
      WHERE name LIKE 'maintenance/' || tm.id::text || '/%'
    )
  );

  CREATE POLICY "maintenance_evidence_delete_fleet"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'maintenance-evidence'
    AND EXISTS (
      SELECT 1
      FROM public.travaux_maintenance tm
      JOIN public.flotte_adhesions fa
        ON fa.fleet_id = tm.fleet_id
       AND fa.user_id = auth.uid()
       AND fa.is_active = true
      WHERE name LIKE 'maintenance/' || tm.id::text || '/%'
    )
  );
END $$;

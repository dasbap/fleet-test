-- ============================================================
-- Storage : buckets prives + policies sans listing public
-- avatars, incident-evidence, maintenance-evidence, tutorials
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_app_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_app_super_admin() TO authenticated, service_role;

-- avatars

UPDATE storage.buckets SET public = false WHERE id = 'avatars';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

CREATE POLICY "avatars_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- incident-evidence

UPDATE storage.buckets SET public = false WHERE id = 'incident-evidence';

DROP POLICY IF EXISTS "incident_evidence_select_public" ON storage.objects;
DROP POLICY IF EXISTS "incident_evidence_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "incident_evidence_select_fleet" ON storage.objects;
DROP POLICY IF EXISTS "incident_evidence_insert_fleet" ON storage.objects;
DROP POLICY IF EXISTS "incident_evidence_delete_fleet" ON storage.objects;

CREATE POLICY "incident_evidence_select_fleet"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'incident-evidence'
  AND EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.fleet_id::text = split_part(name, '/', 1)
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

CREATE POLICY "incident_evidence_insert_fleet"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-evidence'
  AND EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.fleet_id::text = split_part(name, '/', 1)
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

CREATE POLICY "incident_evidence_delete_fleet"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'incident-evidence'
  AND EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.fleet_id::text = split_part(name, '/', 1)
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

-- maintenance-evidence

UPDATE storage.buckets SET public = false WHERE id = 'maintenance-evidence';

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

-- tutorials

UPDATE storage.buckets SET public = false WHERE id = 'tutorials';

DROP POLICY IF EXISTS "Lecture publique tutoriels" ON storage.objects;
DROP POLICY IF EXISTS "tutorials_select_authenticated" ON storage.objects;

CREATE POLICY "tutorials_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tutorials');

CREATE POLICY "tutorials_insert_service"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tutorials'
  AND (
    public.is_platform_admin()
    OR public.is_app_super_admin()
    OR EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id = auth.uid())
  )
);

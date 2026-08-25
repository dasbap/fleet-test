BEGIN;

DROP POLICY IF EXISTS orgs_insert_authenticated ON public.organisations;
CREATE POLICY orgs_insert_platform_admin_only
ON public.organisations
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS flottes_insert_manager_org_org ON public.flottes;
CREATE POLICY flottes_insert_organizer_scope
ON public.flottes
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
      FROM public.flotte_adhesions fa
      JOIN public.flottes existing_fleet ON existing_fleet.id = fa.fleet_id
     WHERE existing_fleet.org_id = flottes.org_id
       AND fa.user_id = auth.uid()
       AND fa.is_active = true
       AND fa.role = 'organizer'::public.role_type
  )
);

NOTIFY pgrst, 'reload schema';
COMMIT;

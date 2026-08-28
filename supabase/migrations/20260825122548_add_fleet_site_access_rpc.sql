BEGIN;

CREATE OR REPLACE FUNCTION public.has_fleet_site_access(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = p_fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.abonnements a
      JOIN public.plans p ON p.id = a.plan_id
      WHERE a.fleet_id = p_fleet_id
        AND a.status IN ('active', 'inactive', 'pending_payment')
        AND p.code <> 'free'
        AND (
          a.status IN ('inactive', 'pending_payment')
          OR (
            a.status = 'active'
            AND a.starts_at <= now()
            AND COALESCE(a.ends_at, 'infinity'::timestamptz) >= now()
          )
        )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.has_fleet_site_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_fleet_site_access(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_fleet_site_access(uuid) IS
  'Returns whether the authenticated active fleet member may enter the site based on a paid active, inactive, or pending_payment subscription without exposing billing rows.';

NOTIFY pgrst, 'reload schema';

COMMIT;

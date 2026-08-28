BEGIN;

CREATE OR REPLACE FUNCTION public.has_fleet_site_access(p_fleet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role public.role_type;
  v_has_fleet_subscription boolean := false;
BEGIN
  IF v_user_id IS NULL OR p_fleet_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT fa.role
    INTO v_role
    FROM public.flotte_adhesions fa
   WHERE fa.fleet_id = p_fleet_id
     AND fa.user_id = v_user_id
     AND fa.is_active = true
   LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.abonnements a
      JOIN public.plans p ON p.id = a.plan_id
     WHERE a.fleet_id = p_fleet_id
       AND p.code <> 'free'
       AND a.status IN ('active', 'inactive', 'pending_payment')
       AND (
         a.status IN ('inactive', 'pending_payment')
         OR (
           a.status = 'active'
           AND a.starts_at <= now()
           AND COALESCE(a.ends_at, 'infinity'::timestamptz) >= now()
         )
       )
  ) INTO v_has_fleet_subscription;

  IF NOT v_has_fleet_subscription THEN
    RETURN false;
  END IF;

  IF v_role IN ('organizer'::public.role_type, 'manager'::public.role_type) THEN
    RETURN true;
  END IF;

  IF v_role IN ('driver'::public.role_type, 'mechanic'::public.role_type) THEN
    RETURN EXISTS (
      SELECT 1
        FROM public.affectations_vehicules av
        JOIN public.droits_vehicules dv
          ON dv.vehicle_id = av.vehicle_id
         AND dv.active = true
         AND (dv.ended_at IS NULL OR dv.ended_at >= now())
        JOIN public.abonnements a
          ON a.id = dv.subscription_id
         AND a.fleet_id = p_fleet_id
         AND a.status = 'active'
         AND a.starts_at <= now()
         AND COALESCE(a.ends_at, 'infinity'::timestamptz) >= now()
        JOIN public.plans p
          ON p.id = a.plan_id
         AND p.code <> 'free'
       WHERE av.fleet_id = p_fleet_id
         AND av.driver_user_id = v_user_id
         AND av.is_active = true
         AND av.starts_at <= now()
         AND (av.ends_at IS NULL OR av.ends_at >= now())
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_fleet_site_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_fleet_site_access(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_fleet_site_access(uuid) IS
  'Fleet site access: organizer/manager require a paid active/inactive/pending subscription; driver/mechanic additionally require an active vehicle assignment covered by a currently active paid subscription.';

NOTIFY pgrst, 'reload schema';

COMMIT;

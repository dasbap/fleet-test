BEGIN;

-- Feature-entitlement checks are SECURITY DEFINER because plan/subscription
-- tables are not generally client-readable. Bind authenticated callers to an
-- active membership in the requested fleet; backend service_role may inspect any
-- fleet for trusted workflows.
CREATE OR REPLACE FUNCTION public.fleet_feature_enabled(
  p_fleet_id uuid,
  p_feature text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_feature text := lower(trim(coalesce(p_feature, '')));
  v_enabled boolean := false;
BEGIN
  IF p_fleet_id IS NULL OR v_feature = '' THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN false;
    END IF;

    IF NOT EXISTS (
      SELECT 1
        FROM public.flotte_adhesions fa
       WHERE fa.fleet_id = p_fleet_id
         AND fa.user_id = auth.uid()
         AND fa.is_active = true
    ) THEN
      RETURN false;
    END IF;
  END IF;

  SELECT CASE v_feature
    WHEN 'finance' THEN COALESCE(p.enables_finance, false)
    WHEN 'ai' THEN COALESCE(p.enables_ai, false)
    WHEN 'reports' THEN COALESCE(p.enables_reports, false)
    WHEN 'driver_scoring' THEN COALESCE(p.enables_driver_scoring, false)
    WHEN 'anomaly_insights' THEN COALESCE(p.enables_anomaly_insights, false)
    WHEN 'geofencing' THEN COALESCE(p.enables_geofencing, false)
    WHEN 'scheduled_reports' THEN COALESCE(p.enables_scheduled_reports, false)
    WHEN 'offline_driver' THEN COALESCE(p.enables_offline_driver, false)
    ELSE false
  END
  INTO v_enabled
  FROM public.abonnements a
  JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = p_fleet_id
    AND a.status IN ('active', 'trial')
    AND COALESCE(a.starts_at, now()) <= now()
    AND COALESCE(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
  ORDER BY a.ends_at DESC NULLS LAST, a.starts_at DESC NULLS LAST, a.id DESC
  LIMIT 1;

  RETURN COALESCE(v_enabled, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fleet_feature_enabled(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fleet_feature_enabled(uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

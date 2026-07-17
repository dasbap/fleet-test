-- Fix remaining has_role overload ambiguity in runtime helpers.
-- No data changes: only helper/RPC definitions are replaced.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_fleet(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.has_role(p_fleet_id, 'manager'::public.role_type)
    OR public.has_role(p_fleet_id, 'organizer'::public.role_type);
$$;

CREATE OR REPLACE FUNCTION public.get_fleet_dashboard_metrics(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cache  jsonb;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(p_fleet_id, ARRAY['organizer','manager','driver']::text[]) THEN
    RAISE EXCEPTION 'permission_refusee';
  END IF;

  SELECT metrics INTO v_cache
  FROM public.fleet_metrics_cache
  WHERE fleet_id = p_fleet_id AND expires_at > now();

  IF v_cache IS NOT NULL THEN
    RETURN v_cache || jsonb_build_object('from_cache', true);
  END IF;

  SELECT jsonb_build_object(
    'fleet_id',          p_fleet_id,
    'period',            '30d',
    'total_shifts',      COALESCE(SUM(total_shifts), 0),
    'closed_shifts',     COALESCE(SUM(closed_shifts), 0),
    'closure_rate',      CASE WHEN COALESCE(SUM(total_shifts), 0) > 0
                           THEN ROUND((SUM(closed_shifts)::numeric / SUM(total_shifts)) * 100, 1)
                           ELSE 0 END,
    'revenue_gap',       COALESCE(SUM(total_revenue_gap), 0),
    'avg_closure_delay', COALESCE(ROUND(AVG(avg_closure_delay_min)::numeric, 1), 0),
    'incident_count',    COALESCE(SUM(incident_count), 0),
    'active_drivers',    COALESCE(MAX(active_drivers), 0),
    'computed_at',       now(),
    'from_cache',        false
  ) INTO v_result
  FROM public.mv_fleet_daily_metrics
  WHERE fleet_id = p_fleet_id
    AND day >= now() - interval '30 days';

  INSERT INTO public.fleet_metrics_cache (fleet_id, metrics, expires_at)
  VALUES (p_fleet_id, v_result, now() + interval '1 hour')
  ON CONFLICT (fleet_id) DO UPDATE SET
    metrics     = EXCLUDED.metrics,
    computed_at = now(),
    expires_at  = EXCLUDED.expires_at;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_fleet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fleet_dashboard_metrics(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_fleet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_dashboard_metrics(uuid) FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;

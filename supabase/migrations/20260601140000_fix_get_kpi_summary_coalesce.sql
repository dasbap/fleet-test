-- get_kpi_summary : toujours renvoyer un JSON (org sans véhicules) + search_path explicite.

CREATE OR REPLACE FUNCTION public.get_kpi_summary(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'activeVehicles',  count(*) FILTER (WHERE status = 'active'),
        'inMaintenance',   count(*) FILTER (WHERE status = 'maintenance'),
        'criticalAlerts',  (
          SELECT count(*)::int FROM public.alerts
          WHERE org_id = p_org_id AND severity = 'critical' AND resolved_at IS NULL
        ),
        'overdueServices', (
          SELECT count(*)::int FROM public.alerts
          WHERE org_id = p_org_id AND type = 'ct' AND resolved_at IS NULL
        ),
        'deltaCritical',   (
          SELECT count(*)::int FROM public.alerts
          WHERE org_id = p_org_id AND severity = 'critical'
            AND created_at > now() - interval '24 hours' AND resolved_at IS NULL
        ),
        'deltaActive',     (
          SELECT count(*)::int FROM public.vehicles
          WHERE org_id = p_org_id AND created_at > now() - interval '30 days'
        )
      )
      FROM public.vehicles
      WHERE org_id = p_org_id
    ),
    jsonb_build_object(
      'activeVehicles',  0,
      'inMaintenance',   0,
      'criticalAlerts',  (
        SELECT count(*)::int FROM public.alerts
        WHERE org_id = p_org_id AND severity = 'critical' AND resolved_at IS NULL
      ),
      'overdueServices', (
        SELECT count(*)::int FROM public.alerts
        WHERE org_id = p_org_id AND type = 'ct' AND resolved_at IS NULL
      ),
      'deltaCritical',   0,
      'deltaActive',     0
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_kpi_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_kpi_summary(uuid) IS
  'KPI agrégés du tableau de bord ; retourne des zéros si l''organisation n''a pas encore de véhicules.';

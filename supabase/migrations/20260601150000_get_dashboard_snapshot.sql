-- Agrégat unique pour le tableau de bord (stats flotte + KPIs org + résumé carburant).
-- Réduit les allers-retours REST sur réseaux 3G instables.

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot(p_fleet_id uuid, p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fleet_stats AS (
    SELECT
      count(*) FILTER (WHERE v.status = 'ok')::int AS active_vehicles,
      count(*)::int AS total_vehicles,
      count(*) FILTER (WHERE v.status = 'blocked')::int AS blocked_vehicles,
      (
        SELECT count(*)::int
        FROM public.flotte_adhesions fa
        WHERE fa.fleet_id = p_fleet_id AND fa.role = 'driver' AND fa.is_active = true
      ) AS total_drivers,
      (
        SELECT count(*)::int
        FROM public.affectations_vehicules av
        WHERE av.fleet_id = p_fleet_id AND av.is_active = true
      ) AS active_drivers,
      (
        SELECT count(*)::int
        FROM public.incidents i
        WHERE i.fleet_id = p_fleet_id
          AND i.created_at > now() - interval '30 days'
      ) AS pending_incidents,
      (
        SELECT count(*)::int
        FROM public.clotures_creneaux c
        WHERE c.fleet_id = p_fleet_id AND c.status = 'pending'
      ) AS pending_closures,
      (
        SELECT count(*)::int
        FROM public.travaux_maintenance tm
        WHERE tm.fleet_id = p_fleet_id AND tm.status = 'in_progress'
      ) AS maintenance_in_progress
    FROM public.vehicules v
    WHERE v.fleet_id = p_fleet_id
  ),
  today_rev AS (
    SELECT coalesce(sum(c.revenue_declared), 0)::numeric AS today_revenue
    FROM public.clotures_creneaux c
    WHERE c.fleet_id = p_fleet_id
      AND c.status = 'validated'
      AND c.created_at >= date_trunc('day', now())
  ),
  fuel_agg AS (
    SELECT
      coalesce(sum(j.liters), 0)::numeric AS total_liters,
      coalesce(sum(j.amount_xof), 0)::numeric AS total_amount_xof,
      count(*)::int AS entry_count
    FROM public.journal_carburant j
    WHERE j.fleet_id = p_fleet_id
      AND j.purchased_at > now() - interval '90 days'
  )
  SELECT jsonb_build_object(
    'stats', (
      SELECT jsonb_build_object(
        'activeVehicles', fs.active_vehicles,
        'totalVehicles', fs.total_vehicles,
        'blockedVehicles', fs.blocked_vehicles,
        'activeDrivers', fs.active_drivers,
        'totalDrivers', fs.total_drivers,
        'pendingIncidents', fs.pending_incidents,
        'todayRevenue', (SELECT today_revenue FROM today_rev),
        'pendingClosures', fs.pending_closures,
        'maintenanceInProgress', fs.maintenance_in_progress
      )
      FROM fleet_stats fs
    ),
    'kpis', public.get_kpi_summary(p_org_id),
    'fuelSummary', (
      SELECT jsonb_build_object(
        'totalLiters', fa.total_liters,
        'totalAmountXof', fa.total_amount_xof,
        'entryCount', fa.entry_count,
        'avgCostPerLiter',
          CASE WHEN fa.total_liters > 0 THEN fa.total_amount_xof / fa.total_liters ELSE 0 END
      )
      FROM fuel_agg fa
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_snapshot(uuid, uuid) IS
  'Snapshot agrégé dashboard : stats flotte, KPIs org (get_kpi_summary), résumé carburant 90j.';

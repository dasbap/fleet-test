-- Dashboard snapshot compatible avec le schema production E-Samba.
-- Remplace la version qui dependait de l'ancien helper greenfield get_kpi_summary().

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot(p_fleet_id uuid, p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_vehicles int := 0;
  v_total_vehicles int := 0;
  v_blocked_vehicles int := 0;
  v_total_drivers int := 0;
  v_active_drivers int := 0;
  v_pending_incidents int := 0;
  v_today_revenue numeric := 0;
  v_pending_closures int := 0;
  v_maintenance_in_progress int := 0;
  v_critical_alerts int := 0;
  v_delta_critical int := 0;
  v_delta_active int := 0;
  v_total_liters numeric := 0;
  v_total_amount_xof numeric := 0;
  v_fuel_entry_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.flottes f
    JOIN public.flotte_adhesions fa ON fa.fleet_id = f.id
    WHERE f.id = p_fleet_id
      AND f.org_id = p_org_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  ) THEN
    RAISE EXCEPTION 'acces_refuse_flotte';
  END IF;

  SELECT
    count(*) FILTER (WHERE v.status = 'ok')::int,
    count(*)::int,
    count(*) FILTER (WHERE v.status = 'blocked')::int,
    count(*) FILTER (WHERE v.created_at > now() - interval '30 days')::int
  INTO v_active_vehicles, v_total_vehicles, v_blocked_vehicles, v_delta_active
  FROM public.vehicules v
  WHERE v.fleet_id = p_fleet_id;

  SELECT count(*)::int
  INTO v_total_drivers
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = p_fleet_id
    AND fa.role = 'driver'
    AND fa.is_active = true;

  SELECT count(*)::int
  INTO v_active_drivers
  FROM public.affectations_vehicules av
  WHERE av.fleet_id = p_fleet_id
    AND av.is_active = true;

  SELECT count(*)::int
  INTO v_pending_incidents
  FROM public.incidents i
  INNER JOIN public.vehicules veh ON veh.id = i.vehicle_id
  WHERE veh.fleet_id = p_fleet_id
    AND i.created_at > now() - interval '30 days';

  SELECT coalesce(sum(c.revenue_declared), 0)::numeric
  INTO v_today_revenue
  FROM public.clotures_creneaux c
  INNER JOIN public.creneaux_conducteurs cc ON cc.id = c.shift_id
  INNER JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
  WHERE av.fleet_id = p_fleet_id
    AND c.status = 'validated'
    AND c.created_at >= date_trunc('day', now());

  SELECT count(*)::int
  INTO v_pending_closures
  FROM public.clotures_creneaux c
  INNER JOIN public.creneaux_conducteurs cc ON cc.id = c.shift_id
  INNER JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
  WHERE av.fleet_id = p_fleet_id
    AND c.status = 'pending';

  SELECT count(*)::int
  INTO v_maintenance_in_progress
  FROM public.travaux_maintenance tm
  WHERE tm.fleet_id = p_fleet_id
    AND tm.status = 'in_progress';

  IF to_regclass('public.alertes_automatiques') IS NOT NULL THEN
    SELECT
      count(*) FILTER (WHERE aa.severity = 'critical')::int,
      count(*) FILTER (
        WHERE aa.severity = 'critical'
          AND aa.created_at > now() - interval '24 hours'
      )::int
    INTO v_critical_alerts, v_delta_critical
    FROM public.alertes_automatiques aa
    WHERE aa.fleet_id = p_fleet_id
      AND aa.resolved = false;
  END IF;

  IF to_regclass('public.journal_carburant') IS NOT NULL THEN
    SELECT
      coalesce(sum(j.liters), 0)::numeric,
      coalesce(sum(j.amount_xof), 0)::numeric,
      count(*)::int
    INTO v_total_liters, v_total_amount_xof, v_fuel_entry_count
    FROM public.journal_carburant j
    WHERE j.fleet_id = p_fleet_id
      AND j.purchased_at > now() - interval '90 days';
  END IF;

  RETURN jsonb_build_object(
    'stats', jsonb_build_object(
      'activeVehicles', v_active_vehicles,
      'totalVehicles', v_total_vehicles,
      'blockedVehicles', v_blocked_vehicles,
      'activeDrivers', v_active_drivers,
      'totalDrivers', v_total_drivers,
      'pendingIncidents', v_pending_incidents,
      'todayRevenue', v_today_revenue,
      'pendingClosures', v_pending_closures,
      'maintenanceInProgress', v_maintenance_in_progress
    ),
    'kpis', jsonb_build_object(
      'activeVehicles', v_active_vehicles,
      'criticalAlerts', v_critical_alerts,
      'overdueServices', 0,
      'deltaCritical', v_delta_critical,
      'deltaActive', v_delta_active
    ),
    'fuelSummary', jsonb_build_object(
      'totalLiters', v_total_liters,
      'totalAmountXof', v_total_amount_xof,
      'entryCount', v_fuel_entry_count,
      'avgCostPerLiter',
        CASE WHEN v_total_liters > 0 THEN v_total_amount_xof / v_total_liters ELSE 0 END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_snapshot(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_snapshot(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_snapshot(uuid, uuid) IS
  'Snapshot dashboard E-Samba : stats flotte, alertes critiques, carburant 90j. Compatible baseline prod sans get_kpi_summary.';

NOTIFY pgrst, 'reload schema';

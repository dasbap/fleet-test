-- Les droits plan sont ceux de la flotte active : tous les comptes rattaches a
-- cette flotte heritent donc du forfait souscrit par l'organisateur/proprietaire.
-- Compatibilite : l'ancien code haut niveau "enterprise" et le code produit
-- "organizer" ouvrent les memes fonctionnalites.

CREATE OR REPLACE FUNCTION public.get_plan_access(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_sub AS (
    SELECT
      a.status,
      p.code AS plan_code,
      p.max_vehicles,
      p.enables_finance,
      p.enables_ai,
      p.enables_reports,
      p.enables_driver_scoring,
      p.enables_anomaly_insights,
      p.enables_geofencing,
      p.enables_scheduled_reports,
      p.enables_offline_driver
    FROM public.abonnements a
    JOIN public.plans p ON p.id = a.plan_id
    WHERE a.fleet_id = p_fleet_id
      AND a.status IN ('trial', 'active', 'grace_period')
    ORDER BY a.ends_at DESC
    LIMIT 1
  ),
  vcnt AS (
    SELECT count(*)::int AS n
    FROM public.vehicules
    WHERE fleet_id = p_fleet_id
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM active_sub) THEN jsonb_build_object(
      'planCode', 'free',
      'canCreateVehicle', false,
      'canUsePulse', false,
      'canUseQrPremium', false,
      'canExportReports', false,
      'canUseFinance', false,
      'canAccessMultiFleet', false,
      'maxVehicles', 3,
      'vehicleCount', (SELECT n FROM vcnt),
      'isActive', false
    )
    ELSE jsonb_build_object(
      'planCode', (SELECT plan_code FROM active_sub),
      'canCreateVehicle', public.can_create_vehicle(p_fleet_id),
      'canUsePulse', (SELECT enables_ai FROM active_sub),
      'canUseQrPremium', (SELECT plan_code IN ('pro', 'enterprise', 'organizer') FROM active_sub),
      'canExportReports', (SELECT enables_reports FROM active_sub),
      'canUseFinance', (SELECT enables_finance FROM active_sub),
      'canAccessMultiFleet', (SELECT plan_code IN ('enterprise', 'organizer') FROM active_sub),
      'maxVehicles', (SELECT max_vehicles FROM active_sub),
      'vehicleCount', (SELECT n FROM vcnt),
      'isActive', (SELECT status IN ('active', 'trial', 'grace_period') FROM active_sub),
      'canUseDriverScoring', (SELECT enables_driver_scoring FROM active_sub),
      'canUseAnomalyInsights', (SELECT enables_anomaly_insights FROM active_sub),
      'canUseGeofencing', (SELECT enables_geofencing FROM active_sub),
      'canUseScheduledReports', (SELECT enables_scheduled_reports FROM active_sub),
      'canUseOfflineDriver', (SELECT enables_offline_driver FROM active_sub)
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_plan_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_plan_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_plan_access(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

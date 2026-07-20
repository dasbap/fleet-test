-- Migration: guards d'accès plan — RPC server-side
-- Jamais le frontend seul : toutes les règles sont enforced côté DB.

-- ─── can_create_vehicle ────────────────────────────────────────────────────────
-- Retourne TRUE si la flotte peut encore créer un véhicule selon son plan actif.
-- Règles :
--   - Pas d'abonnement actif → FALSE
--   - Trial → max 3 véhicules
--   - Plan avec max_vehicles NULL → illimité (enterprise)
--   - Sinon → compte véhicules existants < max_vehicles
CREATE OR REPLACE FUNCTION public.can_create_vehicle(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_sub AS (
    SELECT a.status, p.max_vehicles
    FROM abonnements a
    JOIN plans p ON p.id = a.plan_id
    WHERE a.fleet_id = p_fleet_id
      AND a.status IN ('trial', 'active', 'grace_period')
    ORDER BY a.ends_at DESC
    LIMIT 1
  ),
  vcnt AS (
    SELECT count(*)::int AS n
    FROM vehicules
    WHERE fleet_id = p_fleet_id
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM active_sub)                THEN false
    WHEN (SELECT status FROM active_sub) = 'trial'            THEN (SELECT n FROM vcnt) < 3
    WHEN (SELECT max_vehicles FROM active_sub) IS NULL        THEN true
    ELSE (SELECT n FROM vcnt) < (SELECT max_vehicles FROM active_sub)
  END;
$$;

COMMENT ON FUNCTION public.can_create_vehicle(uuid) IS
  'Guard serveur : vérifie si la flotte peut créer un véhicule supplémentaire selon son abonnement actif.';

-- ─── get_plan_access ──────────────────────────────────────────────────────────
-- Retourne les droits complets de la flotte sous forme de JSONB.
-- Utilisé par le BFF pour répondre aux requêtes /billing/access.
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
      p.code             AS plan_code,
      p.max_vehicles,
      p.enables_finance,
      p.enables_ai,
      p.enables_reports,
      p.enables_driver_scoring,
      p.enables_anomaly_insights,
      p.enables_geofencing,
      p.enables_scheduled_reports,
      p.enables_offline_driver
    FROM abonnements a
    JOIN plans p ON p.id = a.plan_id
    WHERE a.fleet_id = p_fleet_id
      AND a.status IN ('trial', 'active', 'grace_period')
    ORDER BY a.ends_at DESC
    LIMIT 1
  ),
  vcnt AS (
    SELECT count(*)::int AS n FROM vehicules WHERE fleet_id = p_fleet_id
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM active_sub) THEN jsonb_build_object(
      'planCode',           'free',
      'canCreateVehicle',   false,
      'canUsePulse',        false,
      'canUseQrPremium',    false,
      'canExportReports',   false,
      'canUseFinance',      false,
      'canAccessMultiFleet', false,
      'maxVehicles',        3,
      'vehicleCount',       (SELECT n FROM vcnt),
      'isActive',           false
    )
    ELSE jsonb_build_object(
      'planCode',           (SELECT plan_code FROM active_sub),
      'canCreateVehicle',   can_create_vehicle(p_fleet_id),
      'canUsePulse',        (SELECT enables_ai FROM active_sub),
      'canUseQrPremium',    (SELECT plan_code IN ('pro', 'enterprise') FROM active_sub),
      'canExportReports',   (SELECT enables_reports FROM active_sub),
      'canUseFinance',      (SELECT enables_finance FROM active_sub),
      'canAccessMultiFleet',(SELECT plan_code = 'enterprise' FROM active_sub),
      'maxVehicles',        (SELECT max_vehicles FROM active_sub),
      'vehicleCount',       (SELECT n FROM vcnt),
      'isActive',           (SELECT status IN ('active', 'trial') FROM active_sub)
    )
  END;
$$;

COMMENT ON FUNCTION public.get_plan_access(uuid) IS
  'Retourne les droits d''accès complets (plan + features) pour une flotte donnée. Source de vérité côté DB.';

-- ─── RLS : les managers peuvent lire leur propre contexte d'accès ─────────────
-- (Les RPCs sont SECURITY DEFINER donc contournent RLS, mais on documente l'intention)

GRANT EXECUTE ON FUNCTION public.can_create_vehicle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_access(uuid)    TO authenticated;

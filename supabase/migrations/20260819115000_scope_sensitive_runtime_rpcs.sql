BEGIN;

-- Global cleanup/archive routines are maintenance jobs, never end-user actions.
DO $$
BEGIN
  IF to_regprocedure('public.nettoyer_base_donnees(boolean)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean) TO service_role;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.archive_unsubscribed_vehicles_after_one_year()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.archive_unsubscribed_vehicles_after_one_year() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.archive_unsubscribed_vehicles_after_one_year() TO service_role;
  END IF;
END $$;

-- Fleet health must not enumerate every user in the platform. Only inactive
-- memberships that actually belong to the requested fleet are candidates.
CREATE OR REPLACE FUNCTION public.verifier_sante_systeme(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_orphan_count int;
  v_orphan_users jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  v_check := public.rbac_check_permission('member.view', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  SELECT count(*)::int
    INTO v_orphan_count
    FROM public.flotte_adhesions fa
   WHERE fa.fleet_id = p_fleet_id
     AND fa.is_active = false;

  SELECT COALESCE(jsonb_agg(rec), '[]'::jsonb)
    INTO v_orphan_users
    FROM (
      SELECT jsonb_build_object(
        'user_id', fa.user_id,
        'full_name', p.full_name,
        'role', fa.role,
        'membership_created_at', fa.created_at
      ) AS rec
      FROM public.flotte_adhesions fa
      LEFT JOIN public.profils p ON p.user_id = fa.user_id
      WHERE fa.fleet_id = p_fleet_id
        AND fa.is_active = false
      ORDER BY fa.created_at DESC
      LIMIT 50
    ) scoped;

  RETURN jsonb_build_object(
    'ok', true,
    'orphan_count', v_orphan_count,
    'orphan_users', v_orphan_users
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid) TO authenticated;

-- Repair can only reactivate a membership that already belonged to the fleet;
-- the central membership RPC enforces invite/update-role permissions.
CREATE OR REPLACE FUNCTION public.reparer_adhesion_orpheline(
  p_user_id uuid,
  p_fleet_id uuid,
  p_role public.role_type DEFAULT 'driver'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_membership_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  SELECT fa.id, fa.role, fa.is_active
    INTO v_existing
    FROM public.flotte_adhesions fa
   WHERE fa.fleet_id = p_fleet_id
     AND fa.user_id = p_user_id
   LIMIT 1;

  IF v_existing.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'membership_not_found');
  END IF;
  IF v_existing.is_active THEN
    RETURN jsonb_build_object(
      'ok', true,
      'membership_id', v_existing.id,
      'message', 'already_exists'
    );
  END IF;

  v_membership_id := public.creer_ou_mettre_a_jour_adhesion_flotte(
    p_fleet_id,
    p_user_id,
    p_role,
    true
  );

  RETURN jsonb_build_object('ok', true, 'membership_id', v_membership_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reparer_adhesion_orpheline(uuid, uuid, public.role_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reparer_adhesion_orpheline(uuid, uuid, public.role_type) TO authenticated;

-- Capacity/plan RPCs are SECURITY DEFINER and therefore must authorize the
-- target fleet explicitly. service_role remains allowed for backend workflows.
CREATE OR REPLACE FUNCTION public.get_subscription_available_slots(p_subscription_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_check jsonb;
  v_capacity jsonb;
  v_limit int;
  v_used int;
BEGIN
  SELECT a.id, a.fleet_id, a.status, a.vehicle_slots,
         p.code AS plan_code, p.max_vehicles, p.max_vehicles_per_subscription
    INTO v_sub
    FROM public.abonnements a
    JOIN public.plans p ON p.id = a.plan_id
   WHERE a.id = p_subscription_id;

  IF v_sub.id IS NULL THEN RETURN 0; END IF;

  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
    v_check := public.rbac_check_permission('billing.view', v_sub.fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'permission_refusee_abonnement';
    END IF;
  END IF;

  IF NOT public.is_vehicle_subscription_status_active(v_sub.status) THEN RETURN 0; END IF;

  v_capacity := public.subscription_plan_capacity(
    v_sub.plan_code,
    v_sub.max_vehicles,
    COALESCE(v_sub.vehicle_slots, v_sub.max_vehicles_per_subscription)
  );
  v_limit := (v_capacity->>'vehicles_per_subscription')::int;

  SELECT count(*)::int INTO v_used
    FROM public.droits_vehicules
   WHERE subscription_id = p_subscription_id
     AND active = true;

  RETURN greatest(0, v_limit - v_used);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_subscription_available_slots(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_subscription_available_slots(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_create_vehicle(p_fleet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_slots int;
  v_used int;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RETURN false; END IF;
    v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN RETURN false; END IF;
  END IF;

  SELECT COALESCE(sum(
    (public.subscription_plan_capacity(
      p.code, p.max_vehicles, COALESCE(a.vehicle_slots, p.max_vehicles_per_subscription)
    )->>'vehicles_per_subscription')::int
  ), 0)
    INTO v_slots
    FROM public.abonnements a
    JOIN public.plans p ON p.id = a.plan_id
   WHERE a.fleet_id = p_fleet_id
     AND public.is_vehicle_subscription_status_active(a.status)
     AND COALESCE(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now();

  SELECT count(*)::int INTO v_used
    FROM public.droits_vehicules dv
    JOIN public.abonnements a ON a.id = dv.subscription_id
   WHERE a.fleet_id = p_fleet_id
     AND dv.active = true
     AND public.is_vehicle_subscription_status_active(a.status);

  RETURN v_slots > v_used;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.can_create_vehicle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_vehicle(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_plan_access(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_result jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
    v_check := public.rbac_check_permission('fleet.view', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'permission_refusee_flotte';
    END IF;
  END IF;

  WITH active_sub AS (
    SELECT a.status, p.code AS plan_code, p.max_vehicles,
           p.enables_finance, p.enables_ai, p.enables_reports,
           p.enables_driver_scoring, p.enables_anomaly_insights,
           p.enables_geofencing, p.enables_scheduled_reports,
           p.enables_offline_driver
      FROM public.abonnements a
      JOIN public.plans p ON p.id = a.plan_id
     WHERE a.fleet_id = p_fleet_id
       AND public.is_vehicle_subscription_status_active(a.status)
       AND COALESCE(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
     ORDER BY a.ends_at DESC NULLS LAST, a.starts_at DESC, a.id DESC
     LIMIT 1
  ),
  total_slots AS (
    SELECT COALESCE(sum(
      (public.subscription_plan_capacity(
        p.code, p.max_vehicles, COALESCE(a.vehicle_slots, p.max_vehicles_per_subscription)
      )->>'vehicles_per_subscription')::int
    ), 0) AS n
      FROM public.abonnements a
      JOIN public.plans p ON p.id = a.plan_id
     WHERE a.fleet_id = p_fleet_id
       AND public.is_vehicle_subscription_status_active(a.status)
       AND COALESCE(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
  ),
  vcnt AS (
    SELECT count(*)::int AS n
      FROM public.vehicules
     WHERE fleet_id = p_fleet_id AND archived_at IS NULL
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM active_sub) THEN jsonb_build_object(
      'planCode', 'free', 'canCreateVehicle', false, 'canUsePulse', false,
      'canUseQrPremium', false, 'canExportReports', false, 'canUseFinance', false,
      'canAccessMultiFleet', false, 'maxVehicles', 3,
      'vehicleCount', (SELECT n FROM vcnt), 'isActive', false
    )
    ELSE jsonb_build_object(
      'planCode', (SELECT plan_code FROM active_sub),
      'canCreateVehicle', public.can_create_vehicle(p_fleet_id),
      'canUsePulse', (SELECT enables_ai FROM active_sub),
      'canUseQrPremium', (SELECT plan_code IN ('pro','enterprise','organizer') FROM active_sub),
      'canExportReports', (SELECT enables_reports FROM active_sub),
      'canUseFinance', (SELECT enables_finance FROM active_sub),
      'canAccessMultiFleet', (SELECT plan_code IN ('enterprise','organizer') FROM active_sub),
      'maxVehicles', COALESCE(NULLIF((SELECT n FROM total_slots), 0), 3),
      'vehicleCount', (SELECT n FROM vcnt), 'isActive', true,
      'canUseDriverScoring', (SELECT enables_driver_scoring FROM active_sub),
      'canUseAnomalyInsights', (SELECT enables_anomaly_insights FROM active_sub),
      'canUseGeofencing', (SELECT enables_geofencing FROM active_sub),
      'canUseScheduledReports', (SELECT enables_scheduled_reports FROM active_sub),
      'canUseOfflineDriver', (SELECT enables_offline_driver FROM active_sub)
    )
  END INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_plan_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_access(uuid) TO authenticated, service_role;

-- Refund authorization must bind to the payment's actual fleet, never an
-- arbitrary first fleet from the same organization.
CREATE OR REPLACE FUNCTION public.refund_payment(
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_abo record;
  v_fleet_id uuid;
  v_payload_fleet_id uuid;
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Permission refusee : utilisateur non authentifie.';
  END IF;

  SELECT p.id, p.status, p.amount, p.org_id, p.refunded_at, p.raw_payload
    INTO v_payment
    FROM public.paiements p
   WHERE p.id = p_payment_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable.'; END IF;

  BEGIN
    v_payload_fleet_id := NULLIF(v_payment.raw_payload->>'fleetId', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Paiement sans fleetId valide.';
  END;

  SELECT id, status, fleet_id
    INTO v_abo
    FROM public.abonnements
   WHERE payment_id = p_payment_id
   ORDER BY starts_at DESC NULLS LAST, id DESC
   LIMIT 1;

  v_fleet_id := COALESCE(v_abo.fleet_id, v_payload_fleet_id);
  IF v_fleet_id IS NULL THEN RAISE EXCEPTION 'Aucune flotte associee au paiement.'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.flottes f
     WHERE f.id = v_fleet_id AND f.org_id = v_payment.org_id
  ) THEN
    RAISE EXCEPTION 'Flotte du paiement incompatible avec organisation.';
  END IF;
  IF v_abo.fleet_id IS NOT NULL
     AND v_payload_fleet_id IS NOT NULL
     AND v_abo.fleet_id IS DISTINCT FROM v_payload_fleet_id THEN
    RAISE EXCEPTION 'Incoherence flotte paiement/abonnement.';
  END IF;

  IF auth.role() <> 'service_role' AND NOT (
    public.has_role(v_fleet_id, 'organizer'::public.role_type)
    OR public.is_platform_admin()
  ) THEN
    RAISE EXCEPTION 'Permission refusee : organizer ou admin requis.';
  END IF;

  IF v_payment.refunded_at IS NOT NULL OR v_payment.status = 'refunded' THEN
    RETURN jsonb_build_object('ok', true, 'payment_id', p_payment_id, 'idempotent', true);
  END IF;
  IF v_payment.status NOT IN ('completed', 'succeeded', 'success') THEN
    RAISE EXCEPTION 'Paiement non remboursable.';
  END IF;

  UPDATE public.paiements
     SET status = 'refunded', refunded_at = now(), refunded_by = v_caller_id,
         refund_reason = p_reason
   WHERE id = p_payment_id;

  IF v_abo.id IS NOT NULL AND v_abo.status NOT IN ('cancelled','suspended','expired') THEN
    UPDATE public.abonnements
       SET status = 'suspended', cancelled_at = now(), cancelled_by = v_caller_id
     WHERE id = v_abo.id;
  END IF;

  INSERT INTO public.billing_events(fleet_id, subscription_id, payment_id, event_type, payload)
  VALUES (
    v_fleet_id, v_abo.id, p_payment_id, 'payment.refunded',
    jsonb_build_object('payment_id', p_payment_id, 'amount', v_payment.amount,
                       'reason', p_reason, 'refunded_by', v_caller_id,
                       'abo_suspended', v_abo.id IS NOT NULL)
  );

  RETURN jsonb_build_object(
    'ok', true, 'payment_id', p_payment_id,
    'subscription_id', v_abo.id,
    'abo_suspended', v_abo.id IS NOT NULL
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refund_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_payment(uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

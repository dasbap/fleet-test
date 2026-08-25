BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_pending_subscription_for_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_plan record;
  v_subscription_id uuid;
  v_duration_months integer;
  v_vehicle_count integer;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  SELECT p.id,
         p.org_id,
         p.status,
         p.raw_payload,
         (p.raw_payload->>'fleetId')::uuid AS fleet_id,
         trim(p.raw_payload->>'planCode') AS plan_code
    INTO v_payment
    FROM public.paiements p
   WHERE p.id = p_payment_id
   FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'paiement_introuvable';
  END IF;

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'paiement_statut_invalide';
  END IF;

  IF v_payment.fleet_id IS NULL OR v_payment.plan_code IS NULL THEN
    RAISE EXCEPTION 'paiement_payload_invalide';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.flottes f
     WHERE f.id = v_payment.fleet_id
       AND f.org_id = v_payment.org_id
  ) THEN
    RAISE EXCEPTION 'flotte_organisation_incompatible';
  END IF;

  IF NOT COALESCE((public.rbac_check_permission('billing.manage', v_payment.fleet_id)->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_facturation';
  END IF;

  SELECT p.id, p.max_vehicles, p.max_vehicles_per_subscription
    INTO v_plan
    FROM public.plans p
   WHERE p.code = v_payment.plan_code
     AND p.is_active = true
   LIMIT 1;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'plan_invalide';
  END IF;

  SELECT a.id
    INTO v_subscription_id
    FROM public.abonnements a
   WHERE a.payment_id = v_payment.id
   LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    RETURN v_subscription_id;
  END IF;

  -- Un utilisateur qui possède déjà un abonnement utilisable n'a pas besoin
  -- d'un abonnement pending supplémentaire pour accéder à l'application.
  SELECT a.id
    INTO v_subscription_id
    FROM public.abonnements a
   WHERE a.fleet_id = v_payment.fleet_id
     AND a.status IN ('active', 'inactive', 'pending_payment', 'trial')
     AND COALESCE(a.ends_at, 'infinity'::timestamptz) > v_now
   ORDER BY CASE a.status
     WHEN 'active' THEN 1
     WHEN 'trial' THEN 2
     WHEN 'inactive' THEN 3
     ELSE 4
   END, a.ends_at DESC NULLS LAST
   LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    RETURN v_subscription_id;
  END IF;

  v_duration_months := LEAST(GREATEST(COALESCE((v_payment.raw_payload->>'durationMonths')::integer, 1), 1), 36);
  v_vehicle_count := GREATEST(COALESCE((v_payment.raw_payload->>'vehicleCount')::integer, 1), 1);

  INSERT INTO public.abonnements (
    fleet_id,
    plan_id,
    payment_id,
    starts_at,
    ends_at,
    status,
    vehicle_slots
  ) VALUES (
    v_payment.fleet_id,
    v_plan.id,
    v_payment.id,
    v_now,
    v_now + make_interval(months => v_duration_months),
    'pending_payment',
    LEAST(
      v_vehicle_count,
      COALESCE(v_plan.max_vehicles_per_subscription, v_plan.max_vehicles, v_vehicle_count)
    )
  )
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_pending_subscription_for_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_pending_subscription_for_payment(uuid) TO authenticated, service_role;

-- Répare les paiements pending existants pour les flottes actuellement sans
-- abonnement utilisable. On ne crée qu'un abonnement à partir du paiement
-- pending le plus récent de chaque flotte.
WITH latest_pending AS (
  SELECT DISTINCT ON ((pay.raw_payload->>'fleetId'))
         pay.id AS payment_id,
         (pay.raw_payload->>'fleetId')::uuid AS fleet_id,
         trim(pay.raw_payload->>'planCode') AS plan_code,
         LEAST(GREATEST(COALESCE((pay.raw_payload->>'durationMonths')::integer, 1), 1), 36) AS duration_months,
         GREATEST(COALESCE((pay.raw_payload->>'vehicleCount')::integer, 1), 1) AS vehicle_count,
         pay.created_at
    FROM public.paiements pay
   WHERE pay.status = 'pending'
     AND pay.raw_payload ? 'fleetId'
     AND pay.raw_payload ? 'planCode'
   ORDER BY (pay.raw_payload->>'fleetId'), pay.created_at DESC
), candidates AS (
  SELECT lp.*, pl.id AS plan_id, pl.max_vehicles, pl.max_vehicles_per_subscription
    FROM latest_pending lp
    JOIN public.plans pl
      ON pl.code = lp.plan_code
     AND pl.is_active = true
   WHERE NOT EXISTS (
     SELECT 1
       FROM public.abonnements a
      WHERE a.fleet_id = lp.fleet_id
        AND a.status IN ('active', 'inactive', 'pending_payment', 'trial')
        AND COALESCE(a.ends_at, 'infinity'::timestamptz) > now()
   )
     AND NOT EXISTS (
       SELECT 1 FROM public.abonnements a2 WHERE a2.payment_id = lp.payment_id
     )
)
INSERT INTO public.abonnements (
  fleet_id,
  plan_id,
  payment_id,
  starts_at,
  ends_at,
  status,
  vehicle_slots
)
SELECT c.fleet_id,
       c.plan_id,
       c.payment_id,
       now(),
       now() + make_interval(months => c.duration_months),
       'pending_payment',
       LEAST(
         c.vehicle_count,
         COALESCE(c.max_vehicles_per_subscription, c.max_vehicles, c.vehicle_count)
       )
  FROM candidates c;

NOTIFY pgrst, 'reload schema';

COMMIT;

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.assign_vehicle_to_subscription(uuid,uuid,uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.assign_vehicle_to_subscription(uuid, uuid, uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.assign_vehicle_to_subscription(uuid, uuid, uuid)
      TO service_role;
  END IF;

  IF to_regprocedure('public.find_available_subscription_for_vehicle(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.find_available_subscription_for_vehicle(uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.find_available_subscription_for_vehicle(uuid)
      TO service_role;
  END IF;

  IF to_regprocedure('public.demo_create_magic_link(uuid,uuid,text,text,timestamptz,uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.demo_create_magic_link(uuid, uuid, text, text, timestamptz, uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.demo_create_magic_link(uuid, uuid, text, text, timestamptz, uuid)
      TO service_role;
  END IF;

  IF to_regprocedure('public.demo_validate_magic_link(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.demo_validate_magic_link(uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.demo_validate_magic_link(uuid)
      TO service_role;
  END IF;

  IF to_regprocedure('public.demo_check_rate_limit(text,integer)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.demo_check_rate_limit(text, integer)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.demo_check_rate_limit(text, integer)
      TO service_role;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_webhook_effect_claims (
  payment_id uuid PRIMARY KEY REFERENCES public.paiements(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz NOT NULL,
  completed_at timestamptz
);

ALTER TABLE public.payment_webhook_effect_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_webhook_effect_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_webhook_effect_claims TO service_role;

CREATE OR REPLACE FUNCTION public.claim_payment_webhook_effects(
  p_payment_id uuid,
  p_lease_seconds integer DEFAULT 300
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_reclaimed integer := 0;
  v_lease interval;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_payment_id IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.paiements WHERE id = p_payment_id) THEN
    RETURN false;
  END IF;

  v_lease := make_interval(secs => p_lease_seconds);

  INSERT INTO public.payment_webhook_effect_claims (
    payment_id,
    claimed_at,
    lease_until,
    completed_at
  ) VALUES (
    p_payment_id,
    now(),
    now() + v_lease,
    NULL
  )
  ON CONFLICT (payment_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 1 THEN
    RETURN true;
  END IF;

  UPDATE public.payment_webhook_effect_claims
     SET claimed_at = now(),
         lease_until = now() + v_lease
   WHERE payment_id = p_payment_id
     AND completed_at IS NULL
     AND lease_until <= now();

  GET DIAGNOSTICS v_reclaimed = ROW_COUNT;
  RETURN v_reclaimed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payment_webhook_effects(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.payment_webhook_effect_claims
     SET completed_at = COALESCE(completed_at, now()),
         lease_until = now()
   WHERE payment_id = p_payment_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_payment_webhook_effects(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.payment_webhook_effect_claims
     SET lease_until = now()
   WHERE payment_id = p_payment_id
     AND completed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_payment_webhook_effects(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_payment_webhook_effects(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_payment_webhook_effects(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_webhook_effects(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment_webhook_effects(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_payment_webhook_effects(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

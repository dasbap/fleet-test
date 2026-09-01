BEGIN;

CREATE OR REPLACE FUNCTION public.bind_payment_provider_reference(
  p_payment_id uuid,
  p_provider_reference text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_fleet_id uuid;
  v_check jsonb;
  v_reference text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  v_reference := nullif(trim(COALESCE(p_provider_reference, '')), '');
  IF v_reference IS NULL OR length(v_reference) > 200 THEN
    RAISE EXCEPTION 'provider_reference_invalide';
  END IF;

  SELECT p.id, p.status, p.provider_reference, p.raw_payload
    INTO v_payment
    FROM public.paiements p
   WHERE p.id = p_payment_id
   FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'paiement_introuvable';
  END IF;

  BEGIN
    v_fleet_id := (v_payment.raw_payload->>'fleetId')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'paiement_flotte_invalide';
  END;

  v_check := public.rbac_check_permission('billing.manage', v_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_facturation';
  END IF;

  IF v_payment.status NOT IN ('initiated', 'pending', 'processing') THEN
    RAISE EXCEPTION 'paiement_non_modifiable';
  END IF;

  IF v_payment.provider_reference IS NOT NULL
     AND v_payment.provider_reference IS DISTINCT FROM v_reference THEN
    RAISE EXCEPTION 'provider_reference_conflict';
  END IF;

  UPDATE public.paiements
     SET provider_reference = v_reference
   WHERE id = p_payment_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_payment_initiation(
  p_payment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_fleet_id uuid;
  v_check jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  SELECT p.id, p.status, p.raw_payload
    INTO v_payment
    FROM public.paiements p
   WHERE p.id = p_payment_id
   FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'paiement_introuvable';
  END IF;

  BEGIN
    v_fleet_id := (v_payment.raw_payload->>'fleetId')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'paiement_flotte_invalide';
  END;

  v_check := public.rbac_check_permission('billing.manage', v_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_facturation';
  END IF;

  IF v_payment.status IN ('initiated', 'pending', 'processing') THEN
    UPDATE public.paiements
       SET status = 'failed'
     WHERE id = p_payment_id
       AND status IN ('initiated', 'pending', 'processing');

    UPDATE public.abonnements
       SET status = 'inactive'
     WHERE payment_id = p_payment_id
       AND status = 'pending_payment';
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bind_payment_provider_reference(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bind_payment_provider_reference(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.fail_payment_initiation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fail_payment_initiation(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- Mobile Money Billing — Orange Money CM + MTN MoMo CM
-- Gateway : CinetPay (agrégateur Afrique centrale)
-- ============================================================

-- Colonnes supplémentaires sur paiements pour le suivi Mobile Money
ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS phone_number       text,
  ADD COLUMN IF NOT EXISTS gateway            text DEFAULT 'cinetpay',
  ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
  ADD COLUMN IF NOT EXISTS initiated_at       timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confirmed_at       timestamptz;

-- Lookup rapide par transaction gateway (webhook CinetPay)
CREATE UNIQUE INDEX IF NOT EXISTS idx_paiements_gateway_txn
  ON public.paiements(gateway_transaction_id)
  WHERE gateway_transaction_id IS NOT NULL;

-- ============================================================
-- RPC : initier_paiement_mobile_money
-- Appelé par l'Edge Function initiate-payment après appel CinetPay.
-- Crée la ligne paiement en statut 'initiated' et retourne son id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.initier_paiement_mobile_money(
  p_org_id               uuid,
  p_fleet_id             uuid,
  p_plan_code            text,
  p_phone_number         text,
  p_gateway_transaction_id text,
  p_amount               int,
  p_idempotency_key      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Vérifier l'appartenance à la flotte
  IF NOT EXISTS (
    SELECT 1 FROM public.flotte_adhesions
    WHERE fleet_id = p_fleet_id
      AND user_id  = auth.uid()
      AND role IN ('organizer', 'manager')
  ) THEN
    RAISE EXCEPTION 'Droits insuffisants pour initier un paiement';
  END IF;

  INSERT INTO public.paiements (
    org_id, provider, amount, currency, status,
    idempotency_key, phone_number, gateway,
    gateway_transaction_id, initiated_at, raw_payload
  )
  VALUES (
    p_org_id, 'cinetpay', p_amount, 'XAF', 'initiated',
    p_idempotency_key, p_phone_number, 'cinetpay',
    p_gateway_transaction_id, now(),
    jsonb_build_object('plan_code', p_plan_code, 'fleet_id', p_fleet_id)
  )
  ON CONFLICT (provider, idempotency_key) DO UPDATE
    SET gateway_transaction_id = EXCLUDED.gateway_transaction_id,
        initiated_at           = now()
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initier_paiement_mobile_money(uuid, uuid, text, text, text, int, text)
  TO authenticated;

-- ============================================================
-- RPC : confirmer_paiement_et_activer_abonnement
-- Appelé par l'Edge Function payment-webhook après vérification CinetPay.
-- Met à jour paiements + crée/active l'abonnement.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirmer_paiement_et_activer_abonnement(
  p_gateway_transaction_id text,
  p_raw_payload            jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment       record;
  v_plan          record;
  v_fleet_id      uuid;
  v_plan_code     text;
  v_subscription_id uuid;
  v_starts_at     timestamptz;
  v_ends_at       timestamptz;
BEGIN
  -- Récupérer le paiement
  SELECT p.*, p.raw_payload->>'plan_code' AS plan_code,
         (p.raw_payload->>'fleet_id')::uuid AS fleet_id
  INTO v_payment
  FROM public.paiements p
  WHERE p.gateway_transaction_id = p_gateway_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable : %', p_gateway_transaction_id;
  END IF;

  IF v_payment.status = 'successful' THEN
    -- Idempotence : déjà traité
    RETURN jsonb_build_object('status', 'already_confirmed', 'payment_id', v_payment.id);
  END IF;

  v_plan_code := v_payment.plan_code;
  v_fleet_id  := v_payment.fleet_id;

  -- Marquer le paiement confirmé
  UPDATE public.paiements
  SET status       = 'successful',
      confirmed_at = now(),
      raw_payload  = raw_payload || p_raw_payload
  WHERE id = v_payment.id;

  -- Récupérer le plan
  SELECT * INTO v_plan
  FROM public.plans
  WHERE code = v_plan_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan introuvable : %', v_plan_code;
  END IF;

  -- Durée : min_commitment_days (30 par défaut pour starter)
  v_starts_at := now();
  v_ends_at   := v_starts_at + (COALESCE(v_plan.min_commitment_days, 30) || ' days')::interval;

  -- Désactiver les anciens abonnements actifs de la flotte
  UPDATE public.abonnements
  SET status = 'superseded'
  WHERE fleet_id = v_fleet_id
    AND status   = 'active';

  -- Créer le nouvel abonnement
  INSERT INTO public.abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status)
  VALUES (v_fleet_id, v_plan.id, v_payment.id, v_starts_at, v_ends_at, 'active')
  RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object(
    'status',          'confirmed',
    'payment_id',      v_payment.id,
    'subscription_id', v_subscription_id,
    'plan_code',       v_plan_code,
    'ends_at',         v_ends_at
  );
END;
$$;

-- Appelé uniquement par service_role (Edge Function webhook)
REVOKE ALL ON FUNCTION public.confirmer_paiement_et_activer_abonnement(text, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.confirmer_paiement_et_activer_abonnement(text, jsonb)
  TO service_role;

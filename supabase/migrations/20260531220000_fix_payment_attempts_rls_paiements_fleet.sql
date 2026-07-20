-- Corrige payment_attempts_select_manager : paiements.org_id (pas fleet_id).
-- Accès flotte via abonnements.payment_id → fleet_id, ou flottes.org_id en secours.

DROP POLICY IF EXISTS payment_attempts_select_manager ON public.payment_attempts;
DROP POLICY IF EXISTS "payment_attempts_select_manager" ON public.payment_attempts;

CREATE POLICY payment_attempts_select_manager ON public.payment_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.abonnements a
      WHERE a.payment_id = payment_attempts.payment_id
        AND a.fleet_id IN (
          SELECT fa.fleet_id FROM public.flotte_adhesions fa
          WHERE fa.user_id = (SELECT auth.uid()) AND fa.is_active = true
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.paiements p
      INNER JOIN public.flottes f ON f.org_id = p.org_id
      WHERE p.id = payment_attempts.payment_id
        AND f.id IN (
          SELECT fa.fleet_id FROM public.flotte_adhesions fa
          WHERE fa.user_id = (SELECT auth.uid()) AND fa.is_active = true
        )
    )
  );

-- refund_payment : fleet_id depuis abonnements, pas paiements
CREATE OR REPLACE FUNCTION public.refund_payment(
  p_payment_id   uuid,
  p_reason       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment     record;
  v_abo         record;
  v_fleet_id    uuid;
  v_caller_id   uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  SELECT p.id, p.status, p.amount, p.org_id, p.refunded_at
  INTO v_payment
  FROM public.paiements p
  WHERE p.id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement % introuvable.', p_payment_id;
  END IF;

  SELECT id, status, fleet_id
  INTO v_abo
  FROM public.abonnements
  WHERE payment_id = p_payment_id
  LIMIT 1;

  v_fleet_id := v_abo.fleet_id;

  IF v_fleet_id IS NULL THEN
    SELECT f.id INTO v_fleet_id
    FROM public.flottes f
    WHERE f.org_id = v_payment.org_id
    LIMIT 1;
  END IF;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Aucune flotte associée au paiement %.', p_payment_id;
  END IF;

  IF NOT (
    public.has_role(v_fleet_id, 'organizer'::public.role_type)
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      WHERE ap.user_id = v_caller_id AND ap.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Permission refusée : rôle organizer ou admin requis.';
  END IF;

  IF v_payment.refunded_at IS NOT NULL OR v_payment.status = 'refunded' THEN
    RETURN jsonb_build_object(
      'ok',         true,
      'payment_id', p_payment_id,
      'message',    'Déjà remboursé.',
      'idempotent', true
    );
  END IF;

  IF v_payment.status NOT IN ('completed', 'succeeded', 'success') THEN
    RAISE EXCEPTION 'Paiement % ne peut pas être remboursé (statut: %).', p_payment_id, v_payment.status;
  END IF;

  UPDATE public.paiements
  SET
    status        = 'refunded',
    refunded_at   = now(),
    refunded_by   = v_caller_id,
    refund_reason = p_reason
  WHERE id = p_payment_id;

  IF v_abo.id IS NOT NULL AND v_abo.status NOT IN ('cancelled', 'suspended', 'expired') THEN
    UPDATE public.abonnements
    SET
      status       = 'suspended',
      cancelled_at = now(),
      cancelled_by = v_caller_id
    WHERE id = v_abo.id;

    INSERT INTO public.billing_events (
      fleet_id, subscription_id, payment_id, event_type, payload
    ) VALUES (
      v_fleet_id,
      v_abo.id,
      p_payment_id,
      'payment.refunded',
      jsonb_build_object(
        'payment_id',    p_payment_id,
        'amount',        v_payment.amount,
        'reason',        p_reason,
        'refunded_by',   v_caller_id,
        'abo_suspended', true
      )
    );

    RETURN jsonb_build_object(
      'ok',              true,
      'payment_id',      p_payment_id,
      'subscription_id', v_abo.id,
      'abo_suspended',   true
    );
  END IF;

  INSERT INTO public.billing_events (
    fleet_id, subscription_id, payment_id, event_type, payload
  ) VALUES (
    v_fleet_id,
    NULL,
    p_payment_id,
    'payment.refunded',
    jsonb_build_object(
      'payment_id',    p_payment_id,
      'amount',        v_payment.amount,
      'reason',        p_reason,
      'refunded_by',   v_caller_id,
      'abo_suspended', false
    )
  );

  RETURN jsonb_build_object(
    'ok',            true,
    'payment_id',    p_payment_id,
    'abo_suspended', false,
    'message',       'Paiement remboursé, aucun abonnement actif à suspendre.'
  );
END;
$$;

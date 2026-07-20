-- RPC refund_payment(payment_id uuid)
-- Marque un paiement comme remboursé et suspend l'abonnement associé.
-- Réservé aux admins (rôle admin uniquement via RLS + check interne).

-- Ajouter le statut 'refunded' si pas déjà dans le CHECK de paiements
DO $$
BEGIN
  -- Vérifier si le check existe et le recréer avec 'refunded'
  -- On utilise ALTER TABLE DROP/ADD CONSTRAINT de façon idempotente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE '%paiements%status%'
  ) THEN
    RAISE NOTICE 'Pas de CHECK status trouvé sur paiements — skip.';
  END IF;
END $$;

-- Ajout de la colonne refunded_at sur paiements (idempotent)
ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS refunded_at  timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by  uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS refund_reason text;

-- ── RPC refund_payment ────────────────────────────────────────────────────────
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
  -- Authentification requise
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  -- Récupérer le paiement (paiements.org_id — pas de fleet_id sur cette table)
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

  -- Vérifier que l'appelant est admin ou organizer de la flotte
  IF NOT (
    public.has_role(v_fleet_id, 'organizer'::public.role_type)
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      WHERE ap.user_id = v_caller_id AND ap.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Permission refusée : rôle organizer ou admin requis.';
  END IF;

  -- Idempotence : déjà remboursé
  IF v_payment.refunded_at IS NOT NULL OR v_payment.status = 'refunded' THEN
    RETURN jsonb_build_object(
      'ok',         true,
      'payment_id', p_payment_id,
      'message',    'Déjà remboursé.',
      'idempotent', true
    );
  END IF;

  -- Paiement doit être dans un état remboursable
  IF v_payment.status NOT IN ('completed', 'succeeded', 'success') THEN
    RAISE EXCEPTION 'Paiement % ne peut pas être remboursé (statut: %).', p_payment_id, v_payment.status;
  END IF;

  -- Marquer le paiement comme remboursé
  UPDATE public.paiements
  SET
    status        = 'refunded',
    refunded_at   = now(),
    refunded_by   = v_caller_id,
    refund_reason = p_reason
  WHERE id = p_payment_id;

  -- Trouver l'abonnement lié et le suspendre
  IF v_abo.id IS NOT NULL AND v_abo.status NOT IN ('cancelled', 'suspended', 'expired') THEN
    UPDATE public.abonnements
    SET
      status       = 'suspended',
      cancelled_at = now(),
      cancelled_by = v_caller_id
    WHERE id = v_abo.id;

    -- Billing event : refund
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
  ELSE
    -- Pas d'abonnement actif lié — billing event quand même
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
  END IF;
END;
$$;

COMMENT ON FUNCTION public.refund_payment(uuid, text) IS
  'Rembourse un paiement et suspend l''abonnement associé. Organizer ou admin uniquement.';

-- Pas de GRANT public — SECURITY DEFINER + check interne d''autorisation

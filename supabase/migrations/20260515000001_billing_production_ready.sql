-- ============================================================
-- Billing production-ready : billing_events + payment_attempts
-- + index provider_reference (idempotence webhook)
-- + colonnes grace_until / trial_ends_at sur abonnements
-- ============================================================

-- ─── 1. billing_events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id        uuid        NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  subscription_id uuid        REFERENCES public.abonnements(id)  ON DELETE SET NULL,
  payment_id      uuid        REFERENCES public.paiements(id)    ON DELETE SET NULL,
  event_type      text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_events IS
  'Journal audit des événements billing (paiement, activation, suspension…). Append-only.';

-- Index pour requêtes par flotte et par payment
CREATE INDEX IF NOT EXISTS billing_events_fleet_idx
  ON public.billing_events (fleet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_events_payment_idx
  ON public.billing_events (payment_id)
  WHERE payment_id IS NOT NULL;

-- ─── 2. payment_attempts ───────────────────────────────────
-- Suit chaque tentative PSP (retry, multiple providers).
-- provider_reference = référence côté PSP (ex: pay_xxx chez Notch Pay).
-- Idempotence : UNIQUE sur provider_reference (non-NULL seulement via partial index).
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id         uuid        NOT NULL REFERENCES public.paiements(id) ON DELETE CASCADE,
  provider           text        NOT NULL,
  provider_reference text        NULL,
  status             text        NOT NULL DEFAULT 'initiated'
                                 CHECK (status IN (
                                   'initiated','processing','successful','failed','cancelled','refunded'
                                 )),
  raw_payload        jsonb       NULL,
  raw_response       jsonb       NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_attempts IS
  'Tentatives de paiement par provider. Idempotence via provider_reference unique (non-NULL).';

-- Index idempotence : une seule tentative par provider_reference (non-NULL)
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_provider_ref_unique
  ON public.payment_attempts (provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_attempts_payment_idx
  ON public.payment_attempts (payment_id, created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_attempts_updated_at ON public.payment_attempts;
CREATE TRIGGER payment_attempts_updated_at
  BEFORE UPDATE ON public.payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- ─── 3. paiements : colonne provider_reference ─────────────
-- Référence PSP retournée lors de l'initiation (ex: "pay_xxx" Notch Pay).
-- Permet de retrouver un paiement à la réception du webhook par référence PSP.
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS provider_reference text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS paiements_provider_reference_unique
  ON public.paiements (provider_reference)
  WHERE provider_reference IS NOT NULL;

-- ─── 4. abonnements : colonnes supplémentaires ─────────────
-- grace_until   : fin de la période de grâce (service maintenu après expiration)
-- trial_ends_at : fin de la période d'essai (si status = 'trial')
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS grace_until   timestamptz NULL;
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL;

-- Contrainte CHECK sur status (align avec les états métier)
-- On ajoute seulement si la contrainte n'existe pas déjà.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'abonnements_status_check' AND conrelid = 'public.abonnements'::regclass
  ) THEN
    ALTER TABLE public.abonnements ADD CONSTRAINT abonnements_status_check
      CHECK (status IN (
        'trial','pending_payment','active','grace_period','suspended','expired','cancelled'
      ));
  END IF;
END;
$$;

-- ─── 5. RLS ────────────────────────────────────────────────

-- billing_events : lecture manager/organizer, écriture service_role uniquement
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_events_select_manager ON public.billing_events;
CREATE POLICY billing_events_select_manager ON public.billing_events
  FOR SELECT USING (
    public.has_role(fleet_id, 'manager'::public.role_type) OR public.has_role(fleet_id, 'organizer'::public.role_type)
  );

DROP POLICY IF EXISTS billing_events_insert_service ON public.billing_events;
CREATE POLICY billing_events_insert_service ON public.billing_events
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- payment_attempts : lecture manager/organizer via abonnements.fleet_id (paiements n'a pas fleet_id)
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_attempts_select_manager ON public.payment_attempts;
CREATE POLICY payment_attempts_select_manager ON public.payment_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.abonnements a
      WHERE a.payment_id = payment_attempts.payment_id
        AND a.fleet_id IN (
          SELECT fa.fleet_id FROM public.flotte_adhesions fa
          WHERE fa.user_id = auth.uid() AND fa.is_active = true
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.paiements p
      INNER JOIN public.flottes f ON f.org_id = p.org_id
      WHERE p.id = payment_attempts.payment_id
        AND f.id IN (
          SELECT fa.fleet_id FROM public.flotte_adhesions fa
          WHERE fa.user_id = auth.uid() AND fa.is_active = true
        )
    )
  );

DROP POLICY IF EXISTS payment_attempts_service_role ON public.payment_attempts;
CREATE POLICY payment_attempts_service_role ON public.payment_attempts
  FOR ALL USING ( (auth.jwt() ->> 'role') = 'service_role' )
  WITH CHECK ( (auth.jwt() ->> 'role') = 'service_role' );

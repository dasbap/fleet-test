-- Reconstruit depuis le schéma remote (idempotent).
-- journal_peages + vue v_couts_flotte (carburant + peages)
-- Ne pas ré-appliquer sur une base déjà à jour : déjà présent dans schema_migrations.

CREATE TABLE IF NOT EXISTS public.journal_peages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fleet_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  driver_user_id uuid NOT NULL,
  amount_xof integer NOT NULL,
  odometer_km integer NOT NULL,
  occurred_at timestamptz NOT NULL,
  corridor text,
  location_name text,
  receipt_ref text,
  idempotency_key uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT journal_peages_amount_xof_check CHECK (amount_xof >= 0),
  CONSTRAINT journal_peages_odometer_km_check CHECK (odometer_km >= 0),
  CONSTRAINT journal_peages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_journal_peages_fleet_occurred_at
  ON public.journal_peages (fleet_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_peages_idempotency_key
  ON public.journal_peages (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_journal_peages_vehicle_occurred_at
  ON public.journal_peages (vehicle_id, occurred_at DESC);

DO $$ BEGIN
  ALTER TABLE public.journal_peages
    ADD CONSTRAINT journal_peages_driver_user_id_fkey
    FOREIGN KEY (driver_user_id) REFERENCES public.profils(user_id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.journal_peages
    ADD CONSTRAINT journal_peages_fleet_id_fkey
    FOREIGN KEY (fleet_id) REFERENCES public.flottes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.journal_peages
    ADD CONSTRAINT journal_peages_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES public.vehicules(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_journal_peages_updated_at ON public.journal_peages;
CREATE TRIGGER trg_journal_peages_updated_at
  BEFORE UPDATE ON public.journal_peages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.journal_peages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_peages_insert_driver ON public.journal_peages;
CREATE POLICY journal_peages_insert_driver ON public.journal_peages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = driver_user_id
    AND EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = journal_peages.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

DROP POLICY IF EXISTS journal_peages_select_member ON public.journal_peages;
CREATE POLICY journal_peages_select_member ON public.journal_peages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = journal_peages.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

DROP POLICY IF EXISTS journal_peages_update_owner ON public.journal_peages;
CREATE POLICY journal_peages_update_owner ON public.journal_peages
  FOR UPDATE TO authenticated
  USING (auth.uid() = driver_user_id)
  WITH CHECK (auth.uid() = driver_user_id);

CREATE OR REPLACE VIEW public.v_couts_flotte
WITH (security_invoker = true) AS
SELECT
  jc.fleet_id,
  jc.vehicle_id,
  jc.driver_user_id,
  'carburant'::text AS cost_type,
  jc.amount_xof,
  jc.purchased_at AS occurred_at,
  jc.id AS source_id,
  jc.created_at
FROM public.journal_carburant jc
UNION ALL
SELECT
  jp.fleet_id,
  jp.vehicle_id,
  jp.driver_user_id,
  'peage'::text AS cost_type,
  jp.amount_xof,
  jp.occurred_at,
  jp.id AS source_id,
  jp.created_at
FROM public.journal_peages jp;

COMMENT ON VIEW public.v_couts_flotte IS
  'Union carburant + peages pour rapports et tableaux de bord.';

GRANT SELECT ON TABLE public.v_couts_flotte TO authenticated;
GRANT ALL ON TABLE public.journal_peages TO authenticated, service_role;

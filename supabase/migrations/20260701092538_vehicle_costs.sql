-- Reconstruit depuis le schéma remote (idempotent).
-- table vehicle_costs + vue_couts_par_vehicule
-- Ne pas ré-appliquer sur une base déjà à jour : déjà présent dans schema_migrations.

CREATE TABLE IF NOT EXISTS public.vehicle_costs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fleet_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  type_cout text NOT NULL,
  montant numeric(12,2) NOT NULL,
  devise text DEFAULT 'XAF'::text NOT NULL,
  montant_eur numeric(12,4) GENERATED ALWAYS AS (
    CASE devise
      WHEN 'EUR' THEN montant
      WHEN 'XAF' THEN (montant / 656.0)
      WHEN 'USD' THEN (montant * 0.92)
      ELSE NULL::numeric
    END
  ) STORED,
  description text,
  date_depense date DEFAULT CURRENT_DATE NOT NULL,
  volume_litres numeric(8,2),
  creneau_id uuid,
  saisi_par uuid DEFAULT auth.uid() NOT NULL,
  justificatif_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT vehicle_costs_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_costs_devise_check CHECK (devise = ANY (ARRAY['XAF','EUR','USD']::text[])),
  CONSTRAINT vehicle_costs_montant_check CHECK (montant >= 0),
  CONSTRAINT vehicle_costs_type_cout_check CHECK (
    type_cout = ANY (ARRAY['carburant','peage','assurance','reparation','amende','entretien','autre']::text[])
  )
);

COMMENT ON TABLE public.vehicle_costs IS
  'Couts operationnels par vehicule (carburant, peages, assurance, reparations, etc.).';

CREATE INDEX IF NOT EXISTS idx_vehicle_costs_date_depense ON public.vehicle_costs (date_depense DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_fleet_id ON public.vehicle_costs (fleet_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_type_cout ON public.vehicle_costs (fleet_id, type_cout);
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_vehicle_id ON public.vehicle_costs (vehicle_id);

DO $$ BEGIN
  ALTER TABLE public.vehicle_costs
    ADD CONSTRAINT vehicle_costs_creneau_id_fkey
    FOREIGN KEY (creneau_id) REFERENCES public.creneaux_conducteurs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicle_costs
    ADD CONSTRAINT vehicle_costs_fleet_id_fkey
    FOREIGN KEY (fleet_id) REFERENCES public.flottes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicle_costs
    ADD CONSTRAINT vehicle_costs_saisi_par_fkey
    FOREIGN KEY (saisi_par) REFERENCES public.profils(user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.vehicle_costs
    ADD CONSTRAINT vehicle_costs_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES public.vehicules(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_vehicle_costs_updated_at ON public.vehicle_costs;
CREATE TRIGGER trg_vehicle_costs_updated_at
  BEFORE UPDATE ON public.vehicle_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_costs_insertion_mgr_org ON public.vehicle_costs;
CREATE POLICY vehicle_costs_insertion_mgr_org ON public.vehicle_costs
  FOR INSERT
  WITH CHECK (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  );

DROP POLICY IF EXISTS vehicle_costs_lecture_mgr_org ON public.vehicle_costs;
CREATE POLICY vehicle_costs_lecture_mgr_org ON public.vehicle_costs
  FOR SELECT
  USING (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    OR public.has_role(fleet_id, 'manager'::public.role_type)
  );

DROP POLICY IF EXISTS vehicle_costs_modification_org ON public.vehicle_costs;
CREATE POLICY vehicle_costs_modification_org ON public.vehicle_costs
  FOR UPDATE
  USING (public.has_role(fleet_id, 'organizer'::public.role_type))
  WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS vehicle_costs_suppression_org ON public.vehicle_costs;
CREATE POLICY vehicle_costs_suppression_org ON public.vehicle_costs
  FOR DELETE
  USING (public.has_role(fleet_id, 'organizer'::public.role_type));

CREATE OR REPLACE VIEW public.vue_couts_par_vehicule
WITH (security_invoker = true) AS
SELECT
  vc.fleet_id,
  vc.vehicle_id,
  v.registration,
  v.brand,
  v.model,
  date_trunc('month', vc.date_depense::timestamptz) AS mois,
  vc.type_cout,
  sum(vc.montant) AS total_montant,
  vc.devise,
  sum(vc.montant_eur) AS total_eur,
  count(*) AS nb_depenses
FROM public.vehicle_costs vc
JOIN public.vehicules v ON v.id = vc.vehicle_id
GROUP BY
  vc.fleet_id, vc.vehicle_id, v.registration, v.brand, v.model,
  date_trunc('month', vc.date_depense::timestamptz),
  vc.type_cout, vc.devise;

GRANT ALL ON TABLE public.vehicle_costs TO authenticated, service_role;
GRANT SELECT ON TABLE public.vue_couts_par_vehicule TO authenticated;

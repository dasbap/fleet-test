-- Migration: dvir_controles_journaliers
-- Contrôles journaliers de véhicule (DVIR - Daily Vehicle Inspection Report).
-- Permet aux chauffeurs et mécaniciens de saisir l'état du véhicule avant/après chaque journée.

CREATE TABLE IF NOT EXISTS public.controles_journaliers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id            uuid        NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id          uuid        NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  inspected_by        uuid        NOT NULL REFERENCES auth.users(id),
  inspection_type     text        NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip', 'weekly')),
  items               jsonb       NOT NULL DEFAULT '{}',
  -- items = { "brakes": true, "lights": true, "tyres": false, ... }
  overall_status      text        NOT NULL DEFAULT 'ok' CHECK (overall_status IN ('ok', 'minor_issues', 'unsafe')),
  notes               text,
  odometer_km         integer,
  inspected_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Index pour récupérer les contrôles par flotte et véhicule
CREATE INDEX IF NOT EXISTS idx_controles_fleet_vehicle
  ON public.controles_journaliers (fleet_id, vehicle_id, inspected_at DESC);

CREATE INDEX IF NOT EXISTS idx_controles_fleet_date
  ON public.controles_journaliers (fleet_id, inspected_at DESC);

-- RLS : les membres actifs de la flotte peuvent lire et créer
ALTER TABLE public.controles_journaliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_members_read_controles" ON public.controles_journaliers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

CREATE POLICY "fleet_members_create_controles" ON public.controles_journaliers
  FOR INSERT WITH CHECK (
    inspected_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

COMMENT ON TABLE public.controles_journaliers IS
  'DVIR — contrôles journaliers des véhicules (pre-trip, post-trip, hebdo).';

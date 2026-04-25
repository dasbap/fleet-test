-- Migration: dvir_controles_journaliers
-- Contrôles journaliers de véhicule (DVIR - Daily Vehicle Inspection Report).

CREATE TABLE IF NOT EXISTS public.controles_journaliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  inspected_by uuid NOT NULL REFERENCES auth.users(id),
  inspection_type text NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip', 'weekly')),
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_status text NOT NULL DEFAULT 'ok' CHECK (overall_status IN ('ok', 'minor_issues', 'unsafe')),
  notes text,
  odometer_km integer,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_controles_fleet_vehicle
  ON public.controles_journaliers (fleet_id, vehicle_id, inspected_at DESC);

CREATE INDEX IF NOT EXISTS idx_controles_fleet_date
  ON public.controles_journaliers (fleet_id, inspected_at DESC);

ALTER TABLE public.controles_journaliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fleet_members_read_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_read_controles ON public.controles_journaliers
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

DROP POLICY IF EXISTS fleet_members_create_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_create_controles ON public.controles_journaliers
  FOR INSERT WITH CHECK (
    inspected_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

COMMENT ON TABLE public.controles_journaliers IS
  'DVIR - contrôles journaliers des véhicules (pre_trip, post_trip, weekly).';

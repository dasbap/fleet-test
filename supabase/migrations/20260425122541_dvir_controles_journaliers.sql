-- ============================================================================
-- Migration : 20260425122541_dvir_controles_journaliers.sql
-- Fix CI #PR3 : fa.status = 'actif' → fa.is_active = true
--
-- Cause : flotte_adhesions n'a pas de colonne `status`.
-- La colonne correcte est `is_active` (boolean, DEFAULT true).
-- Ce bug n'était pas visible en prod car la politique avait été appliquée
-- manuellement avec la bonne syntaxe, mais le fichier source était incorrect.
-- ============================================================================

-- ── Table controles_journaliers (DVIR — Daily Vehicle Inspection Report) ──

CREATE TABLE IF NOT EXISTS public.controles_journaliers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id        uuid        NOT NULL REFERENCES public.flottes(id)   ON DELETE CASCADE,
  vehicle_id      uuid        NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  inspected_by    uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE RESTRICT,
  inspection_type text        NOT NULL,  -- 'pre_trip' | 'post_trip' | 'periodic'
  items           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  overall_status  text        NOT NULL DEFAULT 'ok',
  notes           text,
  odometer_km     integer,
  inspected_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT controles_journaliers_inspection_type_check
    CHECK (inspection_type IN ('pre_trip', 'post_trip', 'periodic')),
  CONSTRAINT controles_journaliers_overall_status_check
    CHECK (overall_status IN ('ok', 'defects_noted', 'unsafe'))
);

-- ── Index performance ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_controles_fleet_vehicle
  ON public.controles_journaliers (fleet_id, vehicle_id, inspected_at DESC);

CREATE INDEX IF NOT EXISTS idx_controles_fleet_date
  ON public.controles_journaliers (fleet_id, inspected_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.controles_journaliers ENABLE ROW LEVEL SECURITY;

-- SELECT : membres actifs de la flotte
-- FIX : fa.status = 'actif' → fa.is_active = true
--       `status` n'existe pas dans flotte_adhesions ; la colonne est `is_active` (boolean)
DROP POLICY IF EXISTS fleet_members_read_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_read_controles
  ON public.controles_journaliers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id  = auth.uid()
        AND fa.is_active = true          -- ✅ is_active boolean, pas fa.status text
    )
  );

-- INSERT : chauffeurs et mécaniciens actifs de la flotte
DROP POLICY IF EXISTS fleet_members_create_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_create_controles
  ON public.controles_journaliers
  FOR INSERT
  WITH CHECK (
    inspected_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id  = auth.uid()
        AND fa.is_active = true          -- ✅ même fix
        AND fa.role IN ('driver', 'mechanic', 'manager', 'organizer')
    )
  );

-- UPDATE : auteur du contrôle uniquement (dans les 24h)
DROP POLICY IF EXISTS fleet_members_update_controles ON public.controles_journaliers;
CREATE POLICY fleet_members_update_controles
  ON public.controles_journaliers
  FOR UPDATE
  USING (
    inspected_by = auth.uid()
    AND inspected_at > now() - INTERVAL '24 hours'
  )
  WITH CHECK (
    inspected_by = auth.uid()
  );

-- DELETE : organisateurs / managers seulement
DROP POLICY IF EXISTS fleet_managers_delete_controles ON public.controles_journaliers;
CREATE POLICY fleet_managers_delete_controles
  ON public.controles_journaliers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id  = auth.uid()
        AND fa.is_active = true          -- ✅ même fix
        AND fa.role IN ('organizer', 'manager')
    )
  );

-- ── Grants ──────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.controles_journaliers
  TO authenticated;

GRANT ALL
  ON public.controles_journaliers
  TO service_role;

-- ── Commentaires ────────────────────────────────────────────────────────────

COMMENT ON TABLE public.controles_journaliers IS
  'DVIR — Daily Vehicle Inspection Reports. Contrôles pré/post-trajet et périodiques.';

COMMENT ON COLUMN public.controles_journaliers.items IS
  'JSONB : [{id, label, status: ok|defect|na, note?}]';

COMMENT ON COLUMN public.controles_journaliers.overall_status IS
  'ok | defects_noted | unsafe';

COMMENT ON COLUMN public.controles_journaliers.inspection_type IS
  'pre_trip | post_trip | periodic';

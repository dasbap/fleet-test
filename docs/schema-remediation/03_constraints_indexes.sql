-- ============================================================
-- 03_constraints_indexes.sql — E-Samba
-- Contraintes et index manquants. Tous idempotents.
-- ============================================================

BEGIN;

-- ── flotte_adhesions : UNIQUE (user_id, fleet_id) ────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'flotte_adhesions' AND c.contype = 'u'
      AND (
        SELECT string_agg(a.attname, ',' ORDER BY a.attnum)
        FROM pg_attribute a WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      ) IN ('fleet_id,user_id', 'user_id,fleet_id')
  ) THEN
    ALTER TABLE public.flotte_adhesions
      ADD CONSTRAINT flotte_adhesions_user_fleet_unique UNIQUE (user_id, fleet_id);
  END IF;
END $$;

-- ── onboarding_progress : UNIQUE (org_id) ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'onboarding_progress'
      AND c.contype IN ('u', 'p')
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'org_id'
      )
  ) THEN
    ALTER TABLE public.onboarding_progress
      ADD CONSTRAINT onboarding_progress_org_id_key UNIQUE (org_id);
  END IF;
END $$;

-- ── access_codes : UNIQUE (code) ──────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'access_codes' AND c.contype IN ('u','p')
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'code'
      )
  ) THEN
    ALTER TABLE public.access_codes ADD CONSTRAINT access_codes_code_key UNIQUE (code);
  END IF;
END $$;

-- ── Index de performance ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_flotte_adhesions_user_active
  ON public.flotte_adhesions (user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_flotte_adhesions_fleet_active
  ON public.flotte_adhesions (fleet_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_flottes_org
  ON public.flottes (org_id);

CREATE INDEX IF NOT EXISTS idx_vehicules_fleet_status
  ON public.vehicules (fleet_id, status);

CREATE INDEX IF NOT EXISTS idx_affectations_fleet_active
  ON public.affectations_vehicules (fleet_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_affectations_driver
  ON public.affectations_vehicules (driver_user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_creneaux_assignment
  ON public.creneaux_conducteurs (assignment_id);

CREATE INDEX IF NOT EXISTS idx_clotures_shift
  ON public.clotures_creneaux (shift_id);

CREATE INDEX IF NOT EXISTS idx_clotures_status
  ON public.clotures_creneaux (status);

CREATE INDEX IF NOT EXISTS idx_scores_fleet_driver
  ON public.scores_conducteurs (fleet_id, driver_user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_org
  ON public.onboarding_progress (org_id);

CREATE INDEX IF NOT EXISTS idx_access_codes_code_active
  ON public.access_codes (code) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profils_universe_status
  ON public.profils (universe, status);

CREATE INDEX IF NOT EXISTS idx_profils_expires
  ON public.profils (expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_vehicle
  ON public.incidents (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_incidents_driver
  ON public.incidents (driver_user_id);

COMMIT;

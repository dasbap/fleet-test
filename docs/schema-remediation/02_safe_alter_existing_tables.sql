-- ============================================================
-- 02_safe_alter_existing_tables.sql — E-Samba
-- ALTER TABLE idempotents. Safe en production.
-- Exécuter APRÈS 00_audit_schema.sql et backup.
-- ============================================================

BEGIN;

-- ── flotte_adhesions : colonnes manquantes ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flotte_adhesions' AND column_name = 'statut'
  ) THEN
    ALTER TABLE public.flotte_adhesions ADD COLUMN statut text NOT NULL DEFAULT 'actif';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flotte_adhesions' AND column_name = 'rejoint_le'
  ) THEN
    ALTER TABLE public.flotte_adhesions ADD COLUMN rejoint_le timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flotte_adhesions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.flotte_adhesions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ── onboarding_progress : step default corrigé ────────────────────────────────

ALTER TABLE public.onboarding_progress
  ALTER COLUMN step SET DEFAULT 1;

-- ── onboarding_progress : colonne data legacy → nullable + commentaire ────────
-- On ne supprime PAS encore : d'abord migrer les données, puis 08_cleanup.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'data'
  ) THEN
    -- S'assurer que steps_data est bien alimenté depuis data si vide
    UPDATE public.onboarding_progress
    SET steps_data = data
    WHERE (steps_data IS NULL OR steps_data = '{}')
      AND data IS NOT NULL
      AND data != '{}';

    COMMENT ON COLUMN public.onboarding_progress.data IS
      'LEGACY — remplacée par steps_data. À supprimer via 08_cleanup_unused.sql après validation.';
  END IF;
END $$;

-- ── profils : scores_conducteurs default score_total ─────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scores_conducteurs' AND column_name = 'score_total'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE public.scores_conducteurs
      ALTER COLUMN score_total SET DEFAULT 100;

    -- Backfill les lignes sans score_total
    UPDATE public.scores_conducteurs
    SET score_total = COALESCE(
      (financial_score + COALESCE(incidents_score, 100) + COALESCE(closure_delay_score, 100)
       + COALESCE(shift_discipline_score, 100) + COALESCE(operational_stability_score, 100)) / 5,
      financial_score,
      100
    )
    WHERE score_total IS NULL;
  END IF;
END $$;

-- ── profils : commenter les colonnes legacy ───────────────────────────────────
-- Ne pas DROP tant que le code frontend peut encore les référencer

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'access_universe'
  ) THEN
    COMMENT ON COLUMN public.profils.access_universe IS
      'LEGACY doublon de profils.universe (enum). Supprimer via 08_cleanup après migration frontend.';
  END IF;
END $$;

-- ── flottes : s'assurer que org_id a une FK ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'flottes'
      AND c.contype = 'f'
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'org_id'
      )
  ) THEN
    ALTER TABLE public.flottes
      ADD CONSTRAINT flottes_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;

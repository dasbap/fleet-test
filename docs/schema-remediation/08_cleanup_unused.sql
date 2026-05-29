-- ============================================================
-- 08_cleanup_unused.sql — E-Samba
-- ⚠️  DANGEREUX — Exécuter UNIQUEMENT après :
--   1. Avoir validé 09_validation_tests.sql avec succès
--   2. Avoir un backup récent (Supabase Dashboard → Backups)
--   3. Avoir vérifié que le frontend ne référence plus les colonnes supprimées
--   4. Avoir déployé le code frontend sans référence à data/access_universe/clerk_user_id
-- Note C-1 : les blocs `clerk_*` de ce fichier sont des étapes d'archive SQL, pas des dépendances runtime.
-- ============================================================

BEGIN;

-- ── onboarding_progress : supprimer colonne legacy data ──────────────────────

DO $$
BEGIN
  -- Vérifier d'abord que steps_data est bien alimenté
  IF EXISTS (
    SELECT 1 FROM public.onboarding_progress
    WHERE (steps_data IS NULL OR steps_data = '{}')
      AND data IS NOT NULL AND data != '{}'
  ) THEN
    RAISE EXCEPTION 'Migration data→steps_data incomplète. Exécuter 02_safe_alter d''abord.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'data'
  ) THEN
    ALTER TABLE public.onboarding_progress DROP COLUMN data;
    RAISE NOTICE 'Colonne onboarding_progress.data supprimée.';
  END IF;
END $$;

-- ── profils : supprimer access_universe (doublon de universe) ────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'access_universe'
  ) THEN
    -- Vérifier que le frontend n'utilise plus cette colonne (requête manuelle)
    ALTER TABLE public.profils DROP COLUMN access_universe;
    RAISE NOTICE 'Colonne profils.access_universe supprimée.';
  END IF;
END $$;

-- ── profils : supprimer clerk_user_id si Supabase Auth seul ──────────────────

-- ⚠️  NE PAS exécuter si Clerk est encore actif (VITE_AUTH_PROVIDER=clerk)
/*
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'clerk_user_id'
  ) THEN
    ALTER TABLE public.profils DROP COLUMN clerk_user_id;
    RAISE NOTICE 'Colonne profils.clerk_user_id supprimée.';
  END IF;
END $$;
*/

-- ── profils : supprimer id (redondant avec user_id) ──────────────────────────

-- ⚠️  Vérifier d'abord qu'aucune FK ne pointe vers profils.id
/*
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.confrelid
    WHERE t.relname = 'profils' AND c.contype = 'f'
  ) THEN
    ALTER TABLE public.profils DROP COLUMN id;
    RAISE NOTICE 'Colonne profils.id supprimée.';
  END IF;
END $$;
*/

COMMIT;

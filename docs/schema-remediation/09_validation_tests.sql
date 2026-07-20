-- ============================================================
-- 09_validation_tests.sql — E-Samba
-- Assertions post-migration. Lever une exception si KO.
-- Exécuter dans SQL Editor après chaque migration corrective.
-- ============================================================

DO $$
DECLARE
  v_errors text[] := ARRAY[]::text[];
  v_count  integer;
BEGIN

  -- ── Schema ────────────────────────────────────────────────

  -- onboarding_progress : steps_data présent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'steps_data'
  ) THEN
    v_errors := v_errors || 'FAIL: onboarding_progress.steps_data manquante';
  END IF;

  -- onboarding_progress : UNIQUE org_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'onboarding_progress'
      AND c.contype IN ('u','p')
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'org_id'
      )
  ) THEN
    v_errors := v_errors || 'FAIL: onboarding_progress UNIQUE(org_id) manquante';
  END IF;

  -- profils : email présent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'email'
  ) THEN
    v_errors := v_errors || 'FAIL: profils.email manquante';
  END IF;

  -- profils : role présent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'role'
  ) THEN
    v_errors := v_errors || 'FAIL: profils.role manquante';
  END IF;

  -- scores_conducteurs : score_total présent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scores_conducteurs' AND column_name = 'score_total'
  ) THEN
    v_errors := v_errors || 'FAIL: scores_conducteurs.score_total manquante';
  END IF;

  -- ── RPC ───────────────────────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'sauvegarder_progression_onboarding'
  ) THEN
    v_errors := v_errors || 'FAIL: RPC sauvegarder_progression_onboarding absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'finaliser_onboarding'
  ) THEN
    v_errors := v_errors || 'FAIL: RPC finaliser_onboarding absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'is_platform_admin'
  ) THEN
    v_errors := v_errors || 'FAIL: RPC is_platform_admin absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'calculer_score_conducteur_v2'
  ) THEN
    v_errors := v_errors || 'FAIL: RPC calculer_score_conducteur_v2 absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'get_top_driver_scores'
  ) THEN
    v_errors := v_errors || 'FAIL: RPC get_top_driver_scores absente';
  END IF;

  -- ── RLS activée sur tables critiques ─────────────────────

  FOREACH v_count IN ARRAY ARRAY[1] LOOP
    SELECT COUNT(*) INTO v_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND c.relname IN (
        'profils','flottes','organisations','flotte_adhesions',
        'vehicules','affectations_vehicules','creneaux_conducteurs',
        'clotures_creneaux','scores_conducteurs','onboarding_progress',
        'incidents','access_codes','audit_logs'
      );

    IF v_count > 0 THEN
      v_errors := v_errors || format('FAIL: %s tables critiques sans RLS', v_count);
    END IF;
  END LOOP;

  -- ── Policies onboarding ───────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'onboarding_progress'
      AND policyname = 'onboarding_progress_insert'
  ) THEN
    v_errors := v_errors || 'FAIL: policy onboarding_progress_insert absente';
  END IF;

  -- ── Triggers ──────────────────────────────────────────────

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name = 'on_auth_user_created'
  ) THEN
    v_errors := v_errors || 'WARN: trigger on_auth_user_created absent (profil auto)';
  END IF;

  -- ── Résultat ──────────────────────────────────────────────

  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION E'Validation échouée :\n%', array_to_string(v_errors, E'\n');
  ELSE
    RAISE NOTICE '✅ Tous les tests de validation passent.';
  END IF;

END $$;

-- ── Tests de données ──────────────────────────────────────────────────────────

-- Profils sans email (à corriger manuellement ou via sync)
SELECT user_id, full_name, created_at
FROM public.profils
WHERE email IS NULL
LIMIT 20;

-- Onboarding incomplet depuis plus de 7 jours (prospects à relancer)
SELECT op.org_id, op.user_id, p.email, op.step, op.updated_at
FROM public.onboarding_progress op
LEFT JOIN public.profils p ON p.user_id = op.user_id
WHERE op.completed = false
  AND op.updated_at < now() - interval '7 days'
LIMIT 20;

-- Véhicules sans flotte active
SELECT v.id, v.registration, v.fleet_id
FROM public.vehicules v
LEFT JOIN public.flottes f ON f.id = v.fleet_id
WHERE f.id IS NULL
LIMIT 20;

SELECT 'Validation terminée.' AS statut;
